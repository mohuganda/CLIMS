package reports

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5"
)

// SupplyFilter narrows the warehouse request and stock reports.
type SupplyFilter struct {
	Filter
	WarehouseID *string
	StoreID     *string
	StoreType   string
}

// piecesOf converts a quantity of an order or ledger line to pieces, or NULL when the line is not in
// the product's catalogue unit or the product has no pieces per unit (reported as unconverted).
func piecesOf(quantity, unit string) string {
	return `CASE WHEN c.pieces_per_unit IS NOT NULL AND ` + unit + ` = c.unit_id THEN ` + quantity + `::bigint * c.pieces_per_unit END`
}

// requestsCTE is every warehouse request the user may see that matches the filter: a district's order
// to a national warehouse. Parameters: $1 all, $2 store, $3 from, $4 to, $5 warehouse, $6 district,
// $7 category.
var requestsCTE = `WITH q AS (
	SELECT o.id, o.condom_id, c.category, o.unit_of_measure_id, o.order_status, o.created_at,
		o.ordered_from_store_id AS warehouse_id, fs.name AS warehouse, o.ordered_for_store_id AS district_store_id,
		ts.name AS district_store, ts.district_id, d.name AS district,
		o.quantity_needed AS requested, coalesce(o.quantity_approved,
			CASE WHEN o.order_status NOT IN ('queued') THEN o.quantity_needed END) AS approved,
		o.quantity_issued AS issued, o.quantity_received AS received,
		` + piecesOf("o.quantity_needed", "o.unit_of_measure_id") + ` AS requested_pieces,
		` + piecesOf("coalesce(o.quantity_approved, CASE WHEN o.order_status NOT IN ('queued') THEN o.quantity_needed END)", "o.unit_of_measure_id") + ` AS approved_pieces,
		` + piecesOf("o.quantity_issued", "o.unit_of_measure_id") + ` AS issued_pieces,
		` + piecesOf("o.quantity_received", "o.unit_of_measure_id") + ` AS received_pieces,
		(SELECT max(e.created_at) FROM order_events e WHERE e.order_id = o.id AND e.action = 'receive') AS received_at
	FROM orders o
	JOIN condoms c ON c.id = o.condom_id
	JOIN stores fs ON fs.id = o.ordered_from_store_id AND fs.store_type = 'national'
	JOIN stores ts ON ts.id = o.ordered_for_store_id AND ts.store_type = 'district'
	LEFT JOIN districts d ON d.id = ts.district_id
	WHERE o.hot_spot_id IS NULL AND o.order_status NOT IN ('pending', 'fulfilled')
		AND ($1::boolean OR $2::uuid IN (o.ordered_from_store_id, o.ordered_for_store_id))
		AND o.created_at >= $3 AND o.created_at < $4
		AND ($5::uuid IS NULL OR o.ordered_from_store_id = $5) AND ($6::uuid IS NULL OR ts.district_id = $6)
		AND ($7 = '' OR c.category = $7))`

func (f SupplyFilter) requestArgs(s scope) []any {
	return []any{s.all, s.storeID, f.From, f.To, f.WarehouseID, f.DistrictID, f.Category}
}

// RequestTotals are the RF06 quantities for a group of warehouse requests. Pieces count only requests
// in the product's catalogue unit; the rest are counted in Unconverted.
type RequestTotals struct {
	Requests           int64    `json:"requests"`
	RequestedPieces    int64    `json:"requested_pieces"`
	ApprovedPieces     int64    `json:"approved_pieces"`
	IssuedPieces       int64    `json:"issued_pieces"`
	AcknowledgedPieces int64    `json:"acknowledged_pieces"`
	QuantityFulfilment *float64 `json:"quantity_fulfilment_rate"`
	FullyReceived      int64    `json:"fully_received"`
	PartlyReceived     int64    `json:"partly_received"`
	Pending            int64    `json:"pending"`
	Unconverted        int64    `json:"unconverted"`
}

// totalsSQL aggregates q into RequestTotals' columns, in order.
const totalsSQL = `count(*), coalesce(sum(requested_pieces), 0), coalesce(sum(approved_pieces), 0),
	coalesce(sum(issued_pieces), 0), coalesce(sum(received_pieces) FILTER (WHERE requested_pieces IS NOT NULL), 0),
	count(*) FILTER (WHERE received IS NOT NULL AND received >= requested),
	count(*) FILTER (WHERE received IS NOT NULL AND received < requested),
	count(*) FILTER (WHERE received IS NULL),
	count(*) FILTER (WHERE requested_pieces IS NULL)`

func scanTotals(row pgx.Row, t *RequestTotals, extra ...any) error {
	dest := append(extra, &t.Requests, &t.RequestedPieces, &t.ApprovedPieces, &t.IssuedPieces, &t.AcknowledgedPieces,
		&t.FullyReceived, &t.PartlyReceived, &t.Pending, &t.Unconverted)
	if err := row.Scan(dest...); err != nil {
		return err
	}
	t.QuantityFulfilment = rate(t.AcknowledgedPieces, t.RequestedPieces)
	return nil
}

type RequestGroup struct {
	ID   *string `json:"id"`
	Name *string `json:"name"`
	RequestTotals
}

// SupplyReport is the warehouse supply report: district requests to national warehouses raised in the
// period, by condom type, warehouse and district (RF06).
type SupplyReport struct {
	Period        Period           `json:"period"`
	DataUpdatedAt time.Time        `json:"data_updated_at"`
	Total         RequestTotals    `json:"total"`
	ByType        []RequestGroup   `json:"by_type"`
	ByWarehouse   []RequestGroup   `json:"by_warehouse"`
	ByDistrict    []RequestGroup   `json:"by_district"`
	Response      ResponseDuration `json:"response"`
}

func (r *Repository) supplyReport(ctx context.Context, s scope, f SupplyFilter, now time.Time) (SupplyReport, error) {
	args := f.requestArgs(s)
	out := SupplyReport{Period: periodOf(f.Filter), DataUpdatedAt: now}
	if err := scanTotals(r.db.QueryRow(ctx, requestsCTE+` SELECT `+totalsSQL+` FROM q`, args...), &out.Total); err != nil {
		return SupplyReport{}, err
	}
	if err := r.db.QueryRow(ctx, requestsCTE+`
		SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM received_at - created_at) / 3600)
				FILTER (WHERE received_at IS NOT NULL),
			count(*) FILTER (WHERE received_at IS NOT NULL),
			extract(epoch FROM now() - min(created_at) FILTER (WHERE received_at IS NULL)) / 3600
		FROM q`, args...).Scan(&out.Response.MedianHours, &out.Response.FulfilledIncluded,
		&out.Response.OldestPendingHours); err != nil {
		return SupplyReport{}, err
	}
	out.Response.Pending = out.Total.Pending
	groups := func(id, name string) ([]RequestGroup, error) {
		rows, err := r.db.Query(ctx, requestsCTE+` SELECT `+id+`, `+name+`, `+totalsSQL+` FROM q
			GROUP BY 1, 2 ORDER BY 2 NULLS LAST`, args...)
		if err != nil {
			return nil, err
		}
		return pgx.CollectRows(rows, func(row pgx.CollectableRow) (RequestGroup, error) {
			var g RequestGroup
			err := scanTotals(row, &g.RequestTotals, &g.ID, &g.Name)
			return g, err
		})
	}
	var err error
	if out.ByType, err = groups("category", "category"); err != nil {
		return SupplyReport{}, err
	}
	if out.ByWarehouse, err = groups("warehouse_id::text", "warehouse"); err != nil {
		return SupplyReport{}, err
	}
	out.ByDistrict, err = groups("district_id::text", "district")
	return out, err
}

// RequestRecord is one warehouse request behind the supply totals.
type RequestRecord struct {
	ID              string     `json:"id"`
	CondomID        string     `json:"condom_id"`
	Category        *string    `json:"category"`
	UnitOfMeasureID *string    `json:"unit_of_measure_id"`
	Status          string     `json:"order_status"`
	CreatedAt       time.Time  `json:"created_at"`
	WarehouseID     string     `json:"warehouse_store_id"`
	Warehouse       string     `json:"warehouse"`
	DistrictStoreID string     `json:"district_store_id"`
	DistrictStore   string     `json:"district_store"`
	DistrictID      *string    `json:"district_id"`
	District        *string    `json:"district"`
	Requested       *int32     `json:"requested"`
	Approved        *int32     `json:"approved"`
	Issued          *int32     `json:"issued"`
	Received        *int32     `json:"received"`
	RequestedPieces *int64     `json:"requested_pieces"`
	ApprovedPieces  *int64     `json:"approved_pieces"`
	IssuedPieces    *int64     `json:"issued_pieces"`
	ReceivedPieces  *int64     `json:"received_pieces"`
	ReceivedAt      *time.Time `json:"received_at"`
	ResponseHours   *float64   `json:"response_hours"`
}

func (r *Repository) requestRecords(ctx context.Context, s scope, f SupplyFilter) ([]RequestRecord, error) {
	rows, err := r.db.Query(ctx, requestsCTE+`
		SELECT id, condom_id, category, unit_of_measure_id, order_status, created_at, warehouse_id, warehouse,
			district_store_id, district_store, district_id, district, requested, approved, issued, received,
			requested_pieces, approved_pieces, issued_pieces, received_pieces, received_at,
			extract(epoch FROM received_at - created_at) / 3600
		FROM q ORDER BY created_at DESC, id DESC LIMIT $8 OFFSET $9`, append(f.requestArgs(s), f.Limit, f.Offset)...)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, pgx.RowToStructByPos[RequestRecord])
}

func periodOf(f Filter) Period {
	return Period{From: f.From.In(Kampala).Format(time.DateOnly), To: f.To.In(Kampala).AddDate(0, 0, -1).Format(time.DateOnly)}
}
