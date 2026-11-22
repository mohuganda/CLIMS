package orders

import (
	"context"

	"clims-backend/internal/features/notifications"

	"github.com/jackc/pgx/v5"
)

// NotificationTypes are the order notifications; register them once at startup. A stockout report's
// template receives the keys of stockoutData; the warehouse steps receive product, unit, quantity,
// from_store and to_store.
func NotificationTypes() []notifications.Type {
	inApp := []string{notifications.ChannelInApp}
	return []notifications.Type{
		{Name: "order.stockout_reported", Channels: inApp,
			Title: "Stockout at {{.hotspot}}",
			Body: "{{.hotspot}}{{with .place}}, {{.}},{{end}} is out of {{.product}}." +
				"{{with .message}} Message: \"{{.}}\"{{end}} Reported by {{.reporter}}.{{with .contact}} Contact: {{.}}.{{end}}"},
		{Name: "order.hotspot_delivery", Channels: inApp,
			Title: "Stock on the way to {{.hotspot}}",
			Body:  "The district sent {{.pieces}} for your stockout notification. Acknowledge the pieces you receive."},
		{Name: "order.delivery_acknowledged", Channels: inApp,
			Title: "{{.hotspot}} acknowledged its delivery",
			Body: "{{.hotspot}} has acknowledged {{.pieces}} received." +
				"{{if .fulfilled}} The notification is fulfilled.{{else}} The notification stays open until every selected type is received.{{end}}"},
		{Name: "order.replenishment_requested", Channels: inApp,
			Title: "Stock order from {{.to_store}}",
			Body:  "{{.to_store}} ordered {{.quantity}} {{.unit}} of {{.product}}."},
		{Name: "order.shipment_dispatched", Channels: inApp,
			Title: "Stock on the way from {{.from_store}}",
			Body:  "{{.from_store}} dispatched {{.quantity}} {{.unit}} of {{.product}}. Record the receipt when it arrives."},
		{Name: "order.shipment_received", Channels: inApp,
			Title: "Stock received at {{.to_store}}",
			Body:  "{{.quantity}} {{.unit}} of {{.product}} from {{.from_store}} arrived at {{.to_store}}."},
	}
}

// notification picks the type for a warehouse request step and the permission that acts on it at
// the notified store. The second result is false for steps that notify nobody.
func notification(action string) (string, string, bool) {
	switch action {
	case "replenishment_requested":
		return "order.replenishment_requested", "orders:process", true
	case "dispatch":
		return "order.shipment_dispatched", "orders:receive", true
	case "receive":
		// The DCFPs who order from the warehouse learn their stock is in.
		return "order.shipment_received", "orders:replenish", true
	}
	return "", "", false
}

// productLabel names a product the same way as the inventory reports: brand,
// distribution channel and category, e.g. "Engabu Free Male".
const productLabel = `concat_ws(' ', (SELECT pb.name FROM brands pb WHERE pb.id = c.brand_id),
	(SELECT pt.name FROM product_types pt WHERE pt.id = c.type_id),
	CASE c.category WHEN 'male' THEN 'Male' WHEN 'female' THEN 'Female' END)`

// record writes a workflow step to order_events, the order's history, and notifies the people
// holding the permission that acts on the step at the notified store, rather than everyone assigned to it.
func (r *Repository) record(ctx context.Context, tx pgx.Tx, order Order, actorID, action string, notifyStore *string) error {
	// The notify columns keep the deprecated /orders/notifications inbox working until
	// clients use the central one.
	var eventID string
	if err := tx.QueryRow(ctx, `INSERT INTO order_events (order_id, actor_id, action, status, notify_store_id, quantity)
		VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
		order.ID, actorID, action, order.Status, notifyStore, quantityFor(order, action)).Scan(&eventID); err != nil {
		return err
	}
	typeName, permission, notifies := notification(action)
	if !notifies || notifyStore == nil {
		return nil
	}
	var product, fromStore, toStore string
	var unit *string
	if err := tx.QueryRow(ctx, `SELECT `+productLabel+`, um.name, fs.name, ts.name
		FROM orders o
		JOIN condoms c ON c.id = o.condom_id
		JOIN stores fs ON fs.id = o.ordered_from_store_id
		JOIN stores ts ON ts.id = o.ordered_for_store_id
		LEFT JOIN unit_of_measures um ON um.id = o.unit_of_measure_id
		WHERE o.id = $1`, order.ID).Scan(&product, &unit, &fromStore, &toStore); err != nil {
		return err
	}
	if product == "" {
		product = "condoms"
	}
	data := map[string]any{"product": product, "from_store": fromStore, "to_store": toStore,
		"unit": "units", "quantity": quantityFor(order, action)}
	if unit != nil {
		data["unit"] = *unit
	}
	return r.notifier.Notify(ctx, tx, notifications.Message{
		Type:           typeName,
		Targets:        []notifications.Target{{Permission: permission, StoreID: *notifyStore}},
		ActorID:        &actorID,
		Resource:       &notifications.Resource{Type: "order", ID: order.ID},
		Data:           data,
		IdempotencyKey: eventID,
	})
}

// quantityFor is the quantity a step is about: ordered, approved, issued or counted on arrival.
func quantityFor(order Order, action string) int32 {
	value := order.QuantityNeeded
	switch action {
	case "review":
		value = order.QuantityApproved
	case "dispatch":
		value = order.QuantityIssued
	case "receive":
		value = order.QuantityReceived
	}
	if value == nil {
		return 0
	}
	return *value
}
