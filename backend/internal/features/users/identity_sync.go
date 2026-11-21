package users

import (
	"context"
	"errors"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

var (
	ErrIdentityAccountIneligible = errors.New("CLIMS account is missing or ineligible")
	ErrIdentityLinkConflict      = errors.New("CLIMS identity link conflicts with an existing link")
)

type IdentitySyncAccount struct {
	ID    uuid.UUID
	Email string
}

const identitySyncEligible = `u.status = 'active' AND EXISTS (
	SELECT 1 FROM role_user ru JOIN roles r ON r.id = ru.role_id WHERE ru.user_id = u.id
)`

// ListIdentitySyncAccounts returns eligible users in UUID order. Use the last
// returned ID to resume, or nil to start at the beginning.
func (r *Repository) ListIdentitySyncAccounts(ctx context.Context, after *uuid.UUID, limit int) ([]IdentitySyncAccount, error) {
	if limit < 1 || limit > 100 {
		return nil, errors.New("invalid identity sync page size")
	}
	rows, err := r.DB.Query(ctx, `
		SELECT u.id, COALESCE(u.email, '') FROM users u
		WHERE ($1::uuid IS NULL OR u.id > $1) AND `+identitySyncEligible+`
		ORDER BY u.id LIMIT $2`, after, limit)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, pgx.RowToStructByPos[IdentitySyncAccount])
}

// LinkOIDCIdentity accepts a verified identity from the trusted reconciler.
// An exact retry succeeds. Either uniqueness conflict preserves the existing link.
func (r *Repository) LinkOIDCIdentity(ctx context.Context, id uuid.UUID, issuer, subject string) error {
	if id == uuid.Nil || strings.TrimSpace(issuer) == "" || strings.TrimSpace(subject) == "" {
		return errors.New("invalid CLIMS identity link")
	}
	return pgx.BeginTxFunc(ctx, r.DB, pgx.TxOptions{IsoLevel: pgx.ReadCommitted}, func(tx pgx.Tx) error {
		var userID uuid.UUID
		err := tx.QueryRow(ctx, `SELECT u.id FROM users u WHERE u.id = $1 AND `+identitySyncEligible+`
			FOR UPDATE OF u`, id).Scan(&userID)
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrIdentityAccountIneligible
		}
		if err != nil {
			return err
		}
		if _, err = tx.Exec(ctx, `
			INSERT INTO user_oidc_identities (issuer, subject, user_id)
			VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`, issuer, subject, userID); err != nil {
			return err
		}
		var linked bool
		if err = tx.QueryRow(ctx, `SELECT EXISTS (
			SELECT 1 FROM user_oidc_identities WHERE issuer = $1 AND subject = $2 AND user_id = $3
		)`, issuer, subject, userID).Scan(&linked); err != nil {
			return err
		}
		if !linked {
			return ErrIdentityLinkConflict
		}
		return nil
	})
}
