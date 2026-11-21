package users

import (
	"context"
	"errors"
	"strings"

	"clims-backend/internal/features/rbac"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrUnknownRole = errors.New("unknown role")

var ErrLastAdmin = errors.New("cannot disable or demote the last active admin")

// ErrUnknownStore means a store_id names no store.
var ErrUnknownStore = errors.New("unknown store")

type Repository struct{ DB *pgxpool.Pool }

func NewRepository(db *pgxpool.Pool) *Repository { return &Repository{DB: db} }
func (r *Repository) CreateUser(ctx context.Context, req AccountInput, passwordHash string, roleID string) (string, error) {
	var roleIDs []string
	if roleID != "" {
		roleIDs = []string{roleID}
	}
	return r.CreateUserWithRoles(ctx, req, passwordHash, roleIDs)
}

func (r *Repository) CreateUserWithRoles(ctx context.Context, req AccountInput, passwordHash string, roleIDs []string) (string, error) {
	tx, err := r.DB.Begin(ctx)
	if err != nil {
		return "", err
	}
	defer tx.Rollback(ctx)
	if err = checkStore(ctx, tx, req.StoreID); err != nil {
		return "", err
	}
	var id string
	err = tx.QueryRow(ctx, `INSERT INTO users
		(username,email,password,firstname,lastname,phone_number,location,organisation_unit_id,hot_spot_id,store_id,status,created_at,updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'active',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) RETURNING id`,
		req.Username, req.Email, passwordHash, req.FirstName, req.LastName, req.Phone,
		req.Location, req.Assignment.OrganisationUnitID, req.Assignment.HotSpotID, req.StoreID).Scan(&id)
	if err != nil {
		return "", err
	}
	if len(roleIDs) > 0 {
		if err = replaceRoles(ctx, tx, id, roleIDs); err != nil {
			return "", err
		}
	}
	return id, tx.Commit(ctx)
}

const userSelect = `SELECT u.id,u.username,COALESCE(u.email,''),u.password,u.firstname,u.lastname,u.phone_number,u.status,
	u.location,u.organisation_unit_id,u.hot_spot_id,u.subcounty_id,u.store_id,u.created_at,u.updated_at,
	u.last_login_at,u.login_count,
	(SELECT count(*) FROM user_sessions s
		WHERE s.user_id = u.id AND s.revoked_at IS NULL AND s.expires_at > CURRENT_TIMESTAMP),
	COALESCE((
		SELECT jsonb_agg(jsonb_build_object('id', r.id, 'name', r.name, 'permissions', ARRAY(
			SELECT p.name FROM role_permission rp JOIN permissions p ON p.id = rp.permission_id
			WHERE rp.role_id = r.id ORDER BY p.name
		)) ORDER BY r.id)
		FROM role_user ru JOIN roles r ON r.id = ru.role_id WHERE ru.user_id = u.id
	), '[]'::jsonb) FROM users u `

func scanUser(row pgx.Row) (*User, error) {
	var u User
	err := row.Scan(&u.ID, &u.Username, &u.Email, &u.PasswordHash, &u.FirstName, &u.LastName, &u.Phone, &u.Status,
		&u.Location, &u.OrganisationUnitID, &u.HotSpotID, &u.SubcountyID, &u.StoreID,
		&u.CreatedAt, &u.UpdatedAt, &u.LastLoginAt, &u.LoginCount, &u.ActiveSessions, &u.Roles)
	if err != nil {
		return nil, err
	}
	u.Firstname, u.Lastname = u.FirstName, u.LastName
	if len(u.Roles) > 0 {
		u.Role = &u.Roles[0]
	}
	return &u, nil
}

func (r *Repository) GetUserByEmail(ctx context.Context, email string) (*User, error) {
	return scanUser(r.DB.QueryRow(ctx, userSelect+`WHERE lower(btrim(u.email))=lower(btrim($1))`, email))
}

// FindByOIDCIdentity resolves an existing link using the verified issuer and subject.
func (r *Repository) FindByOIDCIdentity(ctx context.Context, issuer, subject string) (*User, error) {
	return scanUser(r.DB.QueryRow(ctx, userSelect+`JOIN user_oidc_identities identity ON identity.user_id = u.id
		WHERE identity.issuer = $1 AND identity.subject = $2`, issuer, subject))
}

// MaxLoginMatches bounds how many accounts one identifier may match before the password is checked,
// since each check costs a bcrypt comparison.
const MaxLoginMatches = 10

// FindByUsernameOrPhone returns accounts whose username or phone number matches identifier, up to
// MaxLoginMatches+1. Each field is unique (migration 12), so this is at most two accounts: one
// whose username and another whose phone number happen to equal identifier.
func (r *Repository) FindByUsernameOrPhone(ctx context.Context, identifier string) ([]*User, error) {
	rows, err := r.DB.Query(ctx, userSelect+`WHERE lower(btrim(u.username)) = lower(btrim($1))
		OR ($2 <> '' AND normalize_phone(u.phone_number) = $2)
		ORDER BY u.id LIMIT $3`, identifier, NormalizePhone(identifier), MaxLoginMatches+1)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var found []*User
	for rows.Next() {
		u, err := scanUser(rows)
		if err != nil {
			return nil, err
		}
		found = append(found, u)
	}
	return found, rows.Err()
}

// DuplicateIdentifier names the sign-in identifier a unique-constraint error is about, if any.
func DuplicateIdentifier(err error) (string, bool) {
	var pgErr *pgconn.PgError
	if !errors.As(err, &pgErr) || pgErr.Code != "23505" {
		return "", false
	}
	switch pgErr.ConstraintName {
	case "users_email_unique", "users_email_normalized_unique":
		return "email already exists", true
	case "users_username_unique":
		return "username already exists", true
	case "users_phone_unique":
		return "phone number already belongs to another account", true
	}
	return "", false
}

// NormalizePhone reduces a phone number to its digits in national form, so 0772 000000, +256772000000
// and 256-772-000-000 compare equal; it matches the normalize_phone SQL function for phone-like input.
// It returns "" for input too short to be a phone number or containing letters.
func NormalizePhone(value string) string {
	digits := make([]byte, 0, len(value))
	for _, c := range []byte(value) {
		switch {
		case c >= '0' && c <= '9':
			digits = append(digits, c)
		case !strings.ContainsRune("+ -()", rune(c)):
			return "" // letters or other symbols: a username, not a phone number
		}
	}
	if len(digits) < 9 {
		return ""
	}
	if len(digits) == 12 && string(digits[:3]) == "256" {
		return "0" + string(digits[3:])
	}
	return string(digits)
}

func (r *Repository) GetUserByID(ctx context.Context, id string) (*User, error) {
	return scanUser(r.DB.QueryRow(ctx, userSelect+`WHERE u.id=$1`, id))
}

func (r *Repository) ListUsers(ctx context.Context, limit, offset int) ([]User, error) {
	rows, err := r.DB.Query(ctx, userSelect+`ORDER BY u.id LIMIT $1 OFFSET $2`, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	users := []User{}
	for rows.Next() {
		u, err := scanUser(rows)
		if err != nil {
			return nil, err
		}
		users = append(users, *u)
	}
	return users, rows.Err()
}

func (r *Repository) UpdateUserAccess(ctx context.Context, id string, roleID *string, status *string) error {
	var roleIDs []string
	if roleID != nil {
		roleIDs = []string{*roleID}
	}
	return r.updateUserAccess(ctx, id, roleIDs, status)
}

func (r *Repository) SetUserRoles(ctx context.Context, id string, roleIDs []string) error {
	return r.updateUserAccess(ctx, id, roleIDs, nil)
}

// Serialize account changes so concurrent requests cannot remove every active admin.
func (r *Repository) updateUserAccess(ctx context.Context, id string, roleIDs []string, status *string) error {
	tx, err := r.DB.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if _, err = tx.Exec(ctx, `SELECT pg_advisory_xact_lock(68421301)`); err != nil {
		return err
	}
	var currentStatus string
	var currentAdmin bool
	if err = tx.QueryRow(ctx, `SELECT u.status, EXISTS (
		SELECT 1 FROM role_user ru JOIN roles r ON r.id = ru.role_id
		WHERE ru.user_id = u.id AND r.name = $2
	) FROM users u WHERE u.id=$1 FOR UPDATE`, id, rbac.AdminRoleName).Scan(&currentStatus, &currentAdmin); err != nil {
		return err
	}
	newStatus := currentStatus
	if status != nil {
		newStatus = *status
	}
	if roleIDs != nil {
		if err = replaceRoles(ctx, tx, id, roleIDs); err != nil {
			return err
		}
	}
	if _, err = tx.Exec(ctx, `UPDATE users SET status=$2,updated_at=CURRENT_TIMESTAMP WHERE id=$1`, id, newStatus); err != nil {
		return err
	}
	// A disabled account is signed out everywhere, so re-enabling it does not revive old tokens.
	if newStatus != "active" {
		if _, err = tx.Exec(ctx, revokeAll, id); err != nil {
			return err
		}
	}
	if currentAdmin && currentStatus == "active" && (newStatus != "active" || roleIDs != nil) {
		var adminRemaining bool
		if err = tx.QueryRow(ctx, `SELECT EXISTS (
			SELECT 1 FROM role_user ru JOIN users u ON u.id = ru.user_id
			JOIN roles r ON r.id = ru.role_id WHERE r.name = $1 AND u.status = 'active'
		)`, rbac.AdminRoleName).Scan(&adminRemaining); err != nil {
			return err
		}
		if !adminRemaining {
			return ErrLastAdmin
		}
	}
	return tx.Commit(ctx)
}

func replaceRoles(ctx context.Context, tx pgx.Tx, userID string, roleIDs []string) error {
	var unknown bool
	if err := tx.QueryRow(ctx, `SELECT EXISTS (
		SELECT 1 FROM unnest($1::text[]::uuid[]) AS requested(id)
		WHERE NOT EXISTS (SELECT 1 FROM roles r WHERE r.id = requested.id)
	)`, roleIDs).Scan(&unknown); err != nil {
		return err
	}
	if unknown {
		return ErrUnknownRole
	}
	if _, err := tx.Exec(ctx, `DELETE FROM role_user ru
		WHERE ru.user_id = $1 AND NOT (ru.role_id = ANY($2::text[]::uuid[]))`,
		userID, roleIDs); err != nil {
		return err
	}
	_, err := tx.Exec(ctx, `INSERT INTO role_user (user_id, role_id)
		SELECT u.id, r.id FROM users u CROSS JOIN roles r
		WHERE u.id = $1 AND r.id = ANY($2::text[]::uuid[]) ON CONFLICT DO NOTHING`,
		userID, roleIDs)
	return err
}

// checkStore returns ErrUnknownStore when storeID names no store. users.store_id has no
// foreign key (the column predates the stores table), so the API checks instead.
func checkStore(ctx context.Context, tx pgx.Tx, storeID *string) error {
	if storeID == nil {
		return nil
	}
	var exists bool
	if err := tx.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM stores WHERE id = $1)`, *storeID).Scan(&exists); err != nil {
		return err
	}
	if !exists {
		return ErrUnknownStore
	}
	return nil
}

// SetUserStore assigns the store a user works with, or clears it when storeID is nil.
func (r *Repository) SetUserStore(ctx context.Context, id string, storeID *string) error {
	tx, err := r.DB.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if err = checkStore(ctx, tx, storeID); err != nil {
		return err
	}
	tag, err := tx.Exec(ctx, `UPDATE users SET store_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1`, id, storeID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return pgx.ErrNoRows
	}
	return tx.Commit(ctx)
}
