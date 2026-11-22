package orders

import (
	"context"
	"errors"
	"time"

	"clims-backend/internal/features/notifications"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Order struct {
	HotSpotID        *string `json:"hot_spot_id"`
	ParentOrderID    *string `json:"parent_order_id"`
	RiderID          *string `json:"rider_id"`
	QuantityReceived *int32  `json:"quantity_received"`
	DiscrepancyNote  *string `json:"discrepancy_note"`
	DeliveryNote     *string `json:"delivery_note"`
	ID               string  `json:"id"`
	CondomID         string  `json:"condom_id"`
	QuantityNeeded   *int32  `json:"quantity_needed"`
	// QuantityApproved is what the warehouse approved at review; the request keeps QuantityNeeded.
	QuantityApproved   *int32    `json:"quantity_approved"`
	QuantityIssued     *int32    `json:"quantity_issued"`
	Status             string    `json:"order_status"`
	Date               string    `json:"order_date"`
	OrderedByID        string    `json:"ordered_by_id"`
	HandledByID        *string   `json:"handled_by_id"`
	OrderedForStoreID  string    `json:"ordered_for_store_id"`
	OrderedFromStoreID string    `json:"ordered_from_store_id"`
	UnitOfMeasureID    *string   `json:"unit_of_measure_id"`
	Comment            *string   `json:"comment"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
}

type scope struct {
	storeID   *string
	hotSpotID *string
	userID    string
	allStores bool
	// stockoutDistrict lets the user raise alerts for active hotspots in the district they work in.
	stockoutDistrict bool
}

type Repository struct {
	db       *pgxpool.Pool
	notifier notifications.Notifier
}

// NewRepository needs a notifier with NotificationTypes registered.
func NewRepository(db *pgxpool.Pool, notifier notifications.Notifier) *Repository {
	return &Repository{db: db, notifier: notifier}
}

const columns = `id, condom_id, quantity_needed, quantity_issued, order_status,
to_char(order_date, 'YYYY-MM-DD'), ordered_by_id, handled_by_id, ordered_for_store_id,
ordered_from_store_id, unit_of_measure_id, comment, created_at, updated_at,
hot_spot_id, parent_order_id, rider_id, quantity_received, discrepancy_note, delivery_note, quantity_approved`

func scanOrder(row pgx.Row) (Order, error) {
	var order Order
	err := row.Scan(&order.ID, &order.CondomID, &order.QuantityNeeded, &order.QuantityIssued,
		&order.Status, &order.Date, &order.OrderedByID, &order.HandledByID,
		&order.OrderedForStoreID, &order.OrderedFromStoreID, &order.UnitOfMeasureID,
		&order.Comment, &order.CreatedAt, &order.UpdatedAt, &order.HotSpotID,
		&order.ParentOrderID, &order.RiderID, &order.QuantityReceived, &order.DiscrepancyNote, &order.DeliveryNote,
		&order.QuantityApproved)
	return order, err
}

const visibleOrders = `($1::boolean OR $2::uuid IN (ordered_for_store_id, ordered_from_store_id) OR hot_spot_id = $3::uuid OR rider_id = $4::uuid)`

func (r *Repository) list(ctx context.Context, access scope, limit, offset int32, status string) ([]Order, error) {
	rows, err := r.db.Query(ctx, `SELECT `+columns+` FROM orders WHERE `+visibleOrders+
		` AND ($7 = '' OR order_status = $7) ORDER BY created_at DESC, id DESC LIMIT $5 OFFSET $6`,
		access.allStores, access.storeID, access.hotSpotID, access.userID, limit, offset, status)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (Order, error) {
		return scanOrder(row)
	})
}

func (r *Repository) get(ctx context.Context, access scope, id string) (Order, error) {
	return scanOrder(r.db.QueryRow(ctx, `SELECT `+columns+` FROM orders WHERE `+visibleOrders+
		` AND id = $5`, access.allStores, access.storeID, access.hotSpotID, access.userID, id))
}

// errInactiveProduct stops new orders and stockout requests for a deactivated product.
// Orders already in progress, and their replenishments, carry on.
var errInactiveProduct = errors.New("product is inactive")

// checkOrderable rejects a deactivated product. A product that does not exist is left to the
// foreign key, which reports it.
func checkOrderable(ctx context.Context, q interface {
	QueryRow(context.Context, string, ...any) pgx.Row
}, condomID string) error {
	var active bool
	err := q.QueryRow(ctx, `SELECT active FROM condoms WHERE id = $1`, condomID).Scan(&active)
	switch {
	case errors.Is(err, pgx.ErrNoRows):
		return nil
	case err != nil:
		return err
	case !active:
		return errInactiveProduct
	}
	return nil
}

func (r *Repository) create(ctx context.Context, actorID string, input createRequest) (Order, error) {
	if err := checkOrderable(ctx, r.db, input.CondomID); err != nil {
		return Order{}, err
	}
	return scanOrder(r.db.QueryRow(ctx, `
		INSERT INTO orders (condom_id, quantity_needed, order_date, ordered_by_id,
			ordered_for_store_id, ordered_from_store_id, unit_of_measure_id, comment)
		VALUES ($1, $2, COALESCE($3::text::date, CURRENT_DATE), $4, $5, $6, $7, $8)
		RETURNING `+columns, input.CondomID, input.QuantityNeeded, input.Date, actorID,
		input.OrderedForStoreID, input.OrderedFromStoreID, input.UnitOfMeasureID, input.Comment))
}

func (r *Repository) fulfill(ctx context.Context, access scope, id, actorID string, quantity int32) (Order, error) {
	return scanOrder(r.db.QueryRow(ctx, `
		UPDATE orders SET quantity_issued = $5, order_status = 'fulfilled',
			handled_by_id = $4, updated_at = CURRENT_TIMESTAMP
		WHERE ($1::boolean OR ordered_from_store_id = $2::uuid) AND id = $3
			AND order_status = 'pending'
		RETURNING `+columns, access.allStores, access.storeID, id, actorID, quantity))
}
