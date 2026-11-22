package reports

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5"
)

// coverageMonths is the issue history the coverage estimate uses. The requirements draft proposes the
// last three complete months, pending the supply-chain team's approval.
const coverageMonths = 3

// StockLine is a store's current stock of one product in one unit (RF10), with issue-based coverage
// when the history supports it (RF11).
type StockLine struct {
	StoreID         string  `json:"store_id"`
	Store           string  `json:"store"`
	StoreType       string  `json:"store_type"`
	DistrictID      *string `json:"district_id"`
	District        *string `json:"district"`
	CondomID        string  `json:"condom_id"`
	Product         string  `json:"product"`
	Category        *string `json:"category"`
	UnitOfMeasureID string  `json:"unit_of_measure_id"`
	Unit            string  `json:"unit"`
	Physical        int64   `json:"physical"`
	Reserved        int64   `json:"reserved"`
	Usable          int64   `json:"usable"`
	InTransit       int64   `json:"in_transit"`
	// Pieces are null when the stock is not held in the product's catalogue unit.
	PhysicalPieces  *int64 `json:"physical_pieces"`
	UsablePieces    *int64 `json:"usable_pieces"`
	InTransitPieces *int64 `json:"in_transit_pieces"`
	// Reconciled is true when the inventory ledger adds up to the physical balance.
	Reconciled bool `json:"reconciled"`
	// MonthlyIssues is the average outward issue per month over the coverage window.
	MonthlyIssues *float64 `json:"average_monthly_issues"`
	// MonthsOfStock is usable stock divided by MonthlyIssues: issue-based coverage, not consumption.
	MonthsOfStock  *float64 `json:"months_of_stock"`
	CoverageStatus string   `json:"coverage_status"`
}

// StockReport is the current dated stock view. Batches and expiry are not tracked yet, so expired
// and unknown-expiry stock cannot be separated from usable stock.
type StockReport struct {
	StockDate      time.Time   `json:"stock_date"`
	CoverageWindow Period      `json:"coverage_window"`
	CoverageMethod string      `json:"coverage_method"`
	ExpiryTracked  bool        `json:"expiry_tracked"`
	Lines          []StockLine `json:"lines"`
}

// coverageWindow is the last coverageMonths complete Kampala months before now.
func coverageWindow(now time.Time) (time.Time, time.Time) {
	local := now.In(Kampala)
	end := time.Date(local.Year(), local.Month(), 1, 0, 0, 0, 0, Kampala)
	return end.AddDate(0, -coverageMonths, 0), end
}

func (r *Repository) stockReport(ctx context.Context, s scope, f SupplyFilter, now time.Time) (StockReport, error) {
	start, end := coverageWindow(now)
	out := StockReport{
		StockDate:      now,
		CoverageWindow: Period{From: start.Format(time.DateOnly), To: end.AddDate(0, 0, -1).Format(time.DateOnly)},
		CoverageMethod: "Usable stock divided by average monthly outward issues (warehouse dispatches to districts, district deliveries to hotspots) over the coverage window. Issue-based coverage; it does not measure consumption.",
		Lines:          []StockLine{},
	}
	rows, err := r.db.Query(ctx, `WITH lines AS (
		SELECT b.store_id, s.name AS store, s.store_type, s.district_id, d.name AS district, b.condom_id,
			concat_ws(' ', (SELECT pb.name FROM brands pb WHERE pb.id = c.brand_id),
				(SELECT pt.name FROM product_types pt WHERE pt.id = c.type_id),
				CASE c.category WHEN 'male' THEN 'Male' WHEN 'female' THEN 'Female' END) AS product,
			c.category, b.unit_of_measure_id, um.name AS unit, b.on_hand, b.reserved,
			coalesce((SELECT sum(o.quantity_issued) FROM orders o WHERE o.ordered_for_store_id = b.store_id
				AND o.condom_id = b.condom_id AND o.unit_of_measure_id = b.unit_of_measure_id
				AND o.order_status = 'dispatched'), 0) AS in_transit,
			CASE WHEN c.pieces_per_unit IS NOT NULL AND b.unit_of_measure_id = c.unit_id THEN c.pieces_per_unit END AS per_unit,
			coalesce((SELECT sum(m.quantity) FROM inventory_movements m WHERE m.store_id = b.store_id
				AND m.condom_id = b.condom_id AND m.unit_of_measure_id = b.unit_of_measure_id), 0) AS ledger,
			(SELECT min(m.created_at) FROM inventory_movements m WHERE m.store_id = b.store_id
				AND m.condom_id = b.condom_id AND m.unit_of_measure_id = b.unit_of_measure_id) AS history_from,
			coalesce((SELECT -sum(m.quantity) FROM inventory_movements m WHERE m.store_id = b.store_id
				AND m.condom_id = b.condom_id AND m.unit_of_measure_id = b.unit_of_measure_id
				AND m.reason IN ('dispatch', 'hotspot_delivery') AND m.created_at >= $7 AND m.created_at < $8), 0) AS issued
		FROM order_store_stock b
		JOIN stores s ON s.id = b.store_id
		LEFT JOIN districts d ON d.id = s.district_id
		JOIN condoms c ON c.id = b.condom_id
		JOIN unit_of_measures um ON um.id = b.unit_of_measure_id
		WHERE ($1::boolean OR b.store_id = $2::uuid)
			AND ($3::uuid IS NULL OR b.store_id = $3) AND ($4 = '' OR s.store_type = $4)
			AND ($5::uuid IS NULL OR s.district_id = $5) AND ($6 = '' OR c.category = $6))
	SELECT store_id, store, store_type, district_id, district, condom_id, product, category, unit_of_measure_id, unit,
		on_hand, reserved, on_hand - reserved, in_transit,
		on_hand * per_unit, (on_hand - reserved) * per_unit, in_transit * per_unit,
		ledger = on_hand, issued, history_from
	FROM lines ORDER BY store_type DESC, store, product, unit`,
		s.all, s.storeID, f.StoreID, f.StoreType, f.DistrictID, f.Category, start, end)
	if err != nil {
		return StockReport{}, err
	}
	out.Lines, err = pgx.CollectRows(rows, func(row pgx.CollectableRow) (StockLine, error) {
		var l StockLine
		var issued int64
		var historyFrom *time.Time
		if err := row.Scan(&l.StoreID, &l.Store, &l.StoreType, &l.DistrictID, &l.District, &l.CondomID, &l.Product,
			&l.Category, &l.UnitOfMeasureID, &l.Unit, &l.Physical, &l.Reserved, &l.Usable, &l.InTransit,
			&l.PhysicalPieces, &l.UsablePieces, &l.InTransitPieces, &l.Reconciled, &issued, &historyFrom); err != nil {
			return StockLine{}, err
		}
		l.MonthlyIssues, l.MonthsOfStock, l.CoverageStatus = coverage(l.Usable, issued, l.Reconciled, historyFrom, start)
		return l, nil
	})
	return out, err
}

// coverage estimates months of stock from outward issues over the window (RF11). It is offered only
// when the ledger reconciles with the balance and covers the whole window; otherwise the status says why.
func coverage(usable, issued int64, reconciled bool, historyFrom *time.Time, windowStart time.Time) (*float64, *float64, string) {
	switch {
	case !reconciled:
		return nil, nil, "unavailable_unreconciled"
	case historyFrom == nil || historyFrom.After(windowStart):
		return nil, nil, "unavailable_short_history"
	case issued <= 0:
		return nil, nil, "unavailable_no_issues"
	}
	monthly := float64(issued) / coverageMonths
	months := float64(int64(float64(usable)/monthly*10+0.5)) / 10
	monthly = float64(int64(monthly*10+0.5)) / 10
	return &monthly, &months, "available"
}
