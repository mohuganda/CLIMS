package integration

import (
	"context"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
)

// testSupplyReports checks the warehouse request and stock reports (reporting requirements RF06, RF10,
// RF11) after the order workflow: one request of 50 issued in full and counted as 55 at the district.
// A second request of 40 is approved at 30 and dispatched, so it is in transit to the district.
func testSupplyReports(t *testing.T, pool *pgxpool.Pool,
	request func(string, string, any, string, int) map[string]any,
	admin, districtToken, warehouseToken, otherDistrictToken, warehouse, district, product, unit string,
) {
	t.Helper()
	ctx := context.Background()
	exec := func(sql string, args ...any) {
		t.Helper()
		if _, err := pool.Exec(ctx, sql, args...); err != nil {
			t.Fatal(err)
		}
	}
	// Reports convert to pieces with the product's catalogue unit: 10 pieces per unit here.
	var unitID *string
	var pieces *int32
	if err := pool.QueryRow(ctx, `SELECT unit_id, pieces_per_unit FROM condoms WHERE id = $1`, product).Scan(&unitID, &pieces); err != nil {
		t.Fatal(err)
	}
	defer exec(`UPDATE condoms SET unit_id = $2, pieces_per_unit = $3 WHERE id = $1`, product, unitID, pieces)
	exec(`UPDATE condoms SET unit_id = $2, pieces_per_unit = 10 WHERE id = $1`, product, unit)
	expect := func(what string, data map[string]any, want map[string]any) {
		t.Helper()
		for key, value := range want {
			if data[key] != value {
				t.Fatalf("%s: %s = %v, want %v (%v)", what, key, data[key], value, data)
			}
		}
	}
	report := func(path, token string) map[string]any {
		t.Helper()
		return request("GET", path, nil, token, 200)["data"].(map[string]any)
	}

	before := report("/reports/warehouse-requests", admin)
	expect("one request", before["total"].(map[string]any), map[string]any{"requests": float64(1),
		"requested_pieces": float64(500), "approved_pieces": float64(500), "issued_pieces": float64(500),
		"acknowledged_pieces": float64(550), "quantity_fulfilment_rate": float64(110), "fully_received": float64(1),
		"pending": float64(0), "unconverted": float64(0)})
	if response := before["response"].(map[string]any); response["median_hours"] == nil {
		t.Fatalf("request response time: %v", response)
	}

	// RF06: the warehouse approves less than requested; the original request is kept.
	created := request("POST", "/orders/warehouse-requests", map[string]any{"warehouse_store_id": warehouse,
		"condom_id": product, "quantity": 40}, districtToken, 201)["data"].(map[string]any)
	orderPath := "/orders/" + created["id"].(string)
	act := func(action string, body any, code int) map[string]any {
		t.Helper()
		result := request("POST", orderPath+"/actions/"+action, body, warehouseToken, code)
		if code != 200 {
			return nil
		}
		return result["data"].(map[string]any)
	}
	act("review", map[string]any{"quantity_approved": 41}, 422)
	act("review", map[string]any{"quantity_approved": 0}, 422)
	act("check-stock", map[string]any{"quantity_approved": 30}, 422)
	expect("approved", act("review", map[string]any{"quantity_approved": 30}, 200),
		map[string]any{"quantity_needed": float64(40), "quantity_approved": float64(30), "order_status": "reviewed"})
	act("check-stock", nil, 200)
	act("dispatch", map[string]any{"quantity_issued": 31}, 422)
	expect("dispatched", act("dispatch", nil, 200), map[string]any{"quantity_issued": float64(30), "order_status": "dispatched"})
	var reviewed int
	if err := pool.QueryRow(ctx, `SELECT quantity FROM order_events WHERE order_id = $1 AND action = 'review'`,
		created["id"]).Scan(&reviewed); err != nil || reviewed != 30 {
		t.Fatalf("the review event should keep the approved quantity: %d %v", reviewed, err)
	}

	after := report("/reports/warehouse-requests", admin)
	expect("two requests", after["total"].(map[string]any), map[string]any{"requests": float64(2),
		"requested_pieces": float64(900), "approved_pieces": float64(800), "issued_pieces": float64(800),
		"acknowledged_pieces": float64(550), "pending": float64(1)})
	for _, group := range []string{"by_type", "by_warehouse", "by_district"} {
		if rows := after[group].([]any); len(rows) != 1 || rows[0].(map[string]any)["requests"] != float64(2) {
			t.Fatalf("%s: %v", group, rows)
		}
	}
	records := request("GET", "/reports/warehouse-requests/records", nil, districtToken, 200)["data"].([]any)
	if len(records) != 2 {
		t.Fatalf("request records: %v", records)
	}
	expect("newest record", records[0].(map[string]any), map[string]any{"requested": float64(40), "approved": float64(30),
		"issued": float64(30), "received": nil, "requested_pieces": float64(400)})
	// RN01: another district sees none of these requests.
	if total := report("/reports/warehouse-requests", otherDistrictToken)["total"].(map[string]any); total["requests"] != float64(0) {
		t.Fatalf("another district saw the requests: %v", total)
	}

	// RF10/RF11: stock at the warehouse and the district, with the second request in transit.
	stock := report("/reports/stock?store_id="+warehouse, admin)
	if stock["expiry_tracked"] != false || stock["coverage_method"] == "" {
		t.Fatalf("stock report header: %v", stock)
	}
	lines := stock["lines"].([]any)
	if len(lines) != 1 {
		t.Fatalf("warehouse stock lines: %v", lines)
	}
	// Its history starts this month, so there are not three complete months of issues yet.
	expect("warehouse stock", lines[0].(map[string]any), map[string]any{"physical": float64(20), "reserved": float64(0),
		"usable": float64(20), "usable_pieces": float64(200), "reconciled": true,
		"coverage_status": "unavailable_short_history", "months_of_stock": nil})
	var districtLine map[string]any
	for _, line := range report("/reports/stock", districtToken)["lines"].([]any) {
		l := line.(map[string]any)
		if l["store_id"] != district {
			t.Fatalf("a district user saw another store's stock: %v", l)
		}
		if l["condom_id"] == product && l["unit_of_measure_id"] == unit {
			districtLine = l
		}
	}
	if districtLine == nil {
		t.Fatal("the district's own stock line is missing")
	}
	expect("district in transit", districtLine, map[string]any{"in_transit": float64(30), "in_transit_pieces": float64(300)})
	request("GET", "/reports/stock?store_type=regional", nil, admin, 400)
}
