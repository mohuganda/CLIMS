package integration

import (
	"context"
	"strings"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
)

// testOrderWorkflow covers the two flows: a hotspot's stockout report notifies its district's DCFPs,
// and a DCFP orders stock from a national warehouse, which reviews, checks and dispatches it for the
// district to receive.
func testOrderWorkflow(t *testing.T, pool *pgxpool.Pool,
	request func(string, string, any, string, int) map[string]any,
	login func(string, string, int) string,
	admin, warehouse, district, product, unit string,
) {
	t.Helper()
	ctx := context.Background()
	exec := func(sql string, args ...any) {
		t.Helper()
		if _, err := pool.Exec(ctx, sql, args...); err != nil {
			t.Fatal(err)
		}
	}
	scalar := func(dest any, sql string, args ...any) {
		t.Helper()
		if err := pool.QueryRow(ctx, sql, args...).Scan(dest); err != nil {
			t.Fatal(err)
		}
	}
	var hotSpot string
	scalar(&hotSpot, `SELECT id FROM hot_spots ORDER BY id LIMIT 1`)
	// Reports go to the store of the hotspot's district. The hotspot is picked by random UUID, so clear
	// its subcounty: one from its old district would break the subcounty/district foreign key.
	exec(`UPDATE hot_spots SET district_id = (SELECT district_id FROM stores WHERE id = $2), subcounty_id = NULL,
		village = 'Kisenyi' WHERE id = $1`, hotSpot, district)
	exec(`INSERT INTO contact_persons (name, phone_number, hot_spot_id) VALUES ('Peter Okello', '0700123456', $1)`, hotSpot)
	account := func(role, name string, store, hotspot *string, permissions ...string) (string, string) {
		t.Helper()
		var roleID string
		scalar(&roleID, `SELECT id FROM roles WHERE name = $1`, role)
		request("PUT", "/roles/"+roleID+"/permissions",
			map[string]any{"permissions": append([]string{"orders:read"}, permissions...)}, admin, 200)
		email := name + "@example.test"
		profile := request("POST", "/users", map[string]any{
			"username": name, "email": email, "password": "test-password-123", "role_ids": []string{roleID},
		}, admin, 201)["data"].(map[string]any)
		id := profile["user_id"].(string)
		exec(`UPDATE users SET store_id = $2, hot_spot_id = $3 WHERE id = $1`, id, store, hotspot)
		return id, login(email, "test-password-123", 200)
	}
	_, hotspotToken := account("hotspot manager", "workflow-hotspot", nil, &hotSpot, "orders:stockout")
	_, districtToken := account("dfcp", "workflow-district", &district, nil, "orders:replenish", "orders:receive")
	_, warehouseToken := account("jms", "workflow-warehouse", &warehouse, nil, "orders:process")
	var otherStore string
	scalar(&otherStore, `SELECT s.id FROM stores s WHERE s.store_type = 'district' AND s.id <> $1 LIMIT 1`, district)
	_, otherToken := account("dfcp", "workflow-other-district", &otherStore, nil, "orders:replenish", "orders:receive")

	// inbox returns the central-inbox notification of this type about the resource, if any.
	inbox := func(token, resourceType, resourceID, typeName string) map[string]any {
		t.Helper()
		for _, item := range request("GET", "/notifications?limit=100", nil, token, 200)["data"].([]any) {
			n := item.(map[string]any)
			if n["resource_type"] == resourceType && n["resource_id"] == resourceID && n["type"] == typeName {
				return n
			}
		}
		return nil
	}
	listed := func(path, token, id string) bool {
		t.Helper()
		for _, item := range request("GET", path, nil, token, 200)["data"].([]any) {
			if item.(map[string]any)["id"] == id {
				return true
			}
		}
		return false
	}

	// 1. A stockout is a report with a message. It carries no quantity and creates no order.
	var ordersBefore int
	scalar(&ordersBefore, `SELECT count(*) FROM orders`)
	request("POST", "/orders/stockouts", map[string]any{"hot_spot_id": hotSpot, "condom_id": product, "quantity_needed": 50}, hotspotToken, 400)
	report := request("POST", "/orders/stockouts", map[string]any{
		"hot_spot_id": hotSpot, "condom_id": product, "comment": "Dispenser empty since Monday",
	}, hotspotToken, 201)["data"].(map[string]any)
	reportID := report["id"].(string)
	if report["district_store_id"] != district || report["hot_spot_id"] != hotSpot || report["order_status"] != nil ||
		report["comment"] != "Dispenser empty since Monday" || report["hot_spot"].(map[string]any)["village"] != "Kisenyi" {
		t.Fatalf("unexpected stockout report: %v", report)
	}
	var ordersAfter int
	scalar(&ordersAfter, `SELECT count(*) FROM orders`)
	if ordersAfter != ordersBefore {
		t.Fatal("a stockout report created an order")
	}

	// The district's DCFPs get the hotspot's details and the message; nobody else does.
	stockout := inbox(districtToken, "hotspot", hotSpot, "order.stockout_reported")
	if stockout == nil {
		t.Fatal("the district's DCFP was not notified of the stockout")
	}
	body := stockout["body"].(string)
	for _, part := range []string{"Kisenyi", `Message: "Dispenser empty since Monday"`, "Reported by workflow-hotspot",
		"Contact: Peter Okello (0700123456)"} {
		if !strings.Contains(body, part) {
			t.Fatalf("stockout notification lacks %q: %s", part, body)
		}
	}
	if data := stockout["data"].(map[string]any); data["report_id"] != reportID || data["contact_phone"] != "0700123456" {
		t.Fatalf("stockout notification data: %v", data)
	}
	for name, token := range map[string]string{"another district's DCFP": otherToken, "the warehouse": warehouseToken,
		"the reporter": hotspotToken} {
		if inbox(token, "hotspot", hotSpot, "order.stockout_reported") != nil {
			t.Fatalf("%s was notified of the stockout", name)
		}
	}
	// The DCFP and the reporter's hotspot see the report; other districts do not.
	if !listed("/orders/stockouts", districtToken, reportID) || !listed("/orders/stockouts?hot_spot_id="+hotSpot, hotspotToken, reportID) {
		t.Fatal("the stockout report is missing from the DCFP's or the hotspot's list")
	}
	if listed("/orders/stockouts", otherToken, reportID) {
		t.Fatal("another district listed the stockout report")
	}
	request("GET", "/orders/stockouts?hot_spot_id=nope", nil, districtToken, 400)
	// A hotspot without a district cannot route a report.
	var noDistrictHotSpot string
	scalar(&noDistrictHotSpot, `SELECT id FROM hot_spots WHERE district_id IS NULL LIMIT 1`)
	if message := request("POST", "/orders/stockouts", map[string]any{"hot_spot_id": noDistrictHotSpot, "condom_id": product},
		admin, 422)["message"]; message != "hotspot has no district with a store; set the hotspot's district" {
		t.Fatalf("hotspot without a district: %v", message)
	}

	// 2. The DCFP orders a product and quantity from NMS or JMS for the district store.
	order := func(token string, body map[string]any, code int) map[string]any {
		t.Helper()
		result := request("POST", "/orders/warehouse-requests", body, token, code)
		if code >= 400 {
			return result
		}
		return result["data"].(map[string]any)
	}
	// Later checks read the product's catalogue unit, so put it back as found.
	var catalogueUnit *string
	scalar(&catalogueUnit, `SELECT unit_id FROM condoms WHERE id = $1`, product)
	defer exec(`UPDATE condoms SET unit_id = $2 WHERE id = $1`, product, catalogueUnit)
	exec(`UPDATE condoms SET unit_id = $2 WHERE id = $1`, product, unit)
	valid := map[string]any{"warehouse_store_id": warehouse, "condom_id": product, "quantity": 50, "comment": "Two hotspots are out"}
	with := func(changes map[string]any) map[string]any {
		body := map[string]any{}
		for k, v := range valid {
			body[k] = v
		}
		for k, v := range changes {
			body[k] = v
		}
		return body
	}
	order(hotspotToken, valid, 403) // only DCFPs order from the warehouse
	order(admin, valid, 403)        // for an assigned district store, even with orders:all_stores
	if res := order(districtToken, with(map[string]any{"warehouse_store_id": otherStore}), 422); res["error"].(map[string]any)["warehouse_store_id"] == nil {
		t.Fatalf("a district store was accepted as the warehouse: %v", res)
	}
	order(districtToken, with(map[string]any{"quantity": 0}), 422)
	order(districtToken, with(map[string]any{"condom_id": "not-a-uuid"}), 422)
	order(districtToken, with(map[string]any{"hot_spot_id": hotSpot}), 400)
	order(districtToken, with(map[string]any{"condom_id": "00000000-0000-4000-8000-000000000001"}), 422)
	// Without a unit, the order uses the product's catalogue unit; a product without one needs it given.
	created := order(districtToken, valid, 201)
	if created["order_status"] != "queued" || created["ordered_for_store_id"] != district || created["ordered_from_store_id"] != warehouse ||
		created["quantity_needed"] != float64(50) || created["unit_of_measure_id"] != unit || created["hot_spot_id"] != nil ||
		created["parent_order_id"] != nil || created["comment"] != "Two hotspots are out" {
		t.Fatalf("unexpected warehouse order: %v", created)
	}
	exec(`UPDATE condoms SET unit_id = NULL WHERE id = $1`, product)
	if res := order(districtToken, valid, 422); res["error"].(map[string]any)["unit_of_measure_id"] == nil {
		t.Fatalf("an order without a unit was accepted: %v", res)
	}
	exec(`UPDATE condoms SET unit_id = $2 WHERE id = $1`, product, unit)
	orderID := created["id"].(string)
	orderPath := "/orders/" + orderID
	if requested := inbox(warehouseToken, "order", orderID, "order.replenishment_requested"); requested == nil ||
		!strings.Contains(requested["body"].(string), "ordered 50 ") {
		t.Fatalf("warehouse order notification: %v", requested)
	}

	// 3. The warehouse reviews the order, checks stock (holding it until stock arrives) and dispatches.
	act := func(name, token string, input any, code int, state string) map[string]any {
		t.Helper()
		result := request("POST", orderPath+"/actions/"+name, input, token, code)
		if code >= 400 {
			return nil
		}
		data := result["data"].(map[string]any)
		if data["order_status"] != state {
			t.Fatalf("%s: expected %s, got %v", name, state, data)
		}
		return data
	}
	act("review", otherToken, nil, 403, "") // no orders:process
	act("receive", otherToken, map[string]any{"quantity_received": 1}, 404, "")
	act("review", hotspotToken, nil, 403, "")
	// The alert-only steps went with the alert orders.
	for _, gone := range []string{"request-replenishment", "deliver"} {
		request("POST", orderPath+"/actions/"+gone, nil, districtToken, 404)
	}
	act("check-stock", warehouseToken, nil, 409, "")
	act("review", warehouseToken, nil, 200, "reviewed")
	act("check-stock", warehouseToken, nil, 200, "on_hold")
	// Warehouse stock arrives through the inventory API, so the ledger accounts for every unit.
	request("POST", "/inventory/movements", map[string]any{"store_id": warehouse, "condom_id": product,
		"unit_of_measure_id": unit, "reason": "receipt", "quantity": 100, "note": "Delivery from supplier"}, admin, 201)
	act("check-stock", warehouseToken, nil, 200, "confirmed")
	act("dispatch", warehouseToken, map[string]any{"quantity_issued": 51}, 422, "")
	act("dispatch", warehouseToken, map[string]any{"quantity_issued": 0}, 422, "")
	request("POST", orderPath+"/actions/dispatch", map[string]any{"rider_id": warehouse}, warehouseToken, 400)
	act("dispatch", warehouseToken, nil, 200, "dispatched")
	if inbox(districtToken, "order", orderID, "order.shipment_dispatched") == nil {
		t.Fatal("the district was not told the stock is on the way")
	}

	// 4. The district records what arrived; a difference needs a note.
	_, colleagueToken := account("dfcp", "workflow-district-colleague", &district, nil, "orders:replenish", "orders:receive")
	act("receive", districtToken, map[string]any{"quantity_received": 55}, 422, "")
	act("receive", districtToken, map[string]any{"quantity_received": 55, "quantity_issued": 5}, 422, "")
	receipt := map[string]any{"quantity_received": 55, "discrepancy_note": "Five additional units counted"}
	act("receive", districtToken, receipt, 200, "received")
	act("receive", districtToken, receipt, 409, "")
	// The receipt notifies the district's other DCFPs, not the one who records it.
	if inbox(colleagueToken, "order", orderID, "order.shipment_received") == nil {
		t.Fatal("the district's other DCFP was not told the stock arrived")
	}
	if inbox(districtToken, "order", orderID, "order.shipment_received") != nil {
		t.Fatal("the DCFP who recorded the receipt was notified of it")
	}
	request("GET", orderPath+"/events", nil, districtToken, 200)

	// Alert orders raised before stockouts became reports are history: no workflow step applies.
	var legacy string
	scalar(&legacy, `INSERT INTO orders (hot_spot_id, condom_id, ordered_by_id, ordered_for_store_id, ordered_from_store_id, order_status)
		SELECT $1, $2, id, $3, $3, 'queued' FROM users ORDER BY id LIMIT 1 RETURNING id`, hotSpot, product, district)
	request("POST", "/orders/"+legacy+"/actions/review", nil, admin, 409)
	exec(`DELETE FROM orders WHERE id = $1`, legacy)

	balance := func(store string, wantOnHand int) {
		t.Helper()
		var onHand, reserved int
		if err := pool.QueryRow(ctx, `SELECT on_hand, reserved FROM order_store_stock
			WHERE store_id = $1 AND condom_id = $2 AND unit_of_measure_id = $3`, store, product, unit).Scan(&onHand, &reserved); err != nil {
			t.Fatal(err)
		}
		if onHand != wantOnHand || reserved != 0 {
			t.Fatalf("store %s balance on hand=%d reserved=%d, want %d and 0", store, onHand, reserved, wantOnHand)
		}
	}
	balance(district, 55)
	balance(warehouse, 50)
	testInventoryReports(t, pool, request, admin, districtToken, warehouse, district, hotSpot)
	testNotificationFulfilment(t, pool, request, admin, hotspotToken, districtToken, otherToken, district, hotSpot, unit, reportID)
	testSupplyReports(t, pool, request, admin, districtToken, warehouseToken, otherToken, warehouse, district, product, unit)
}
