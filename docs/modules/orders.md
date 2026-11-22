# Orders

CLIMS records stock requests between two distinct stores. Orders use UUIDs for the product, unit of measure, stores and users. The request records the authenticated account as `ordered_by_id` and starts with status `pending`.

| Method | Route                         | Permission       |
| ------ | ----------------------------- | ---------------- |
| GET    | `/api/v1/orders`              | `orders:read`    |
| GET    | `/api/v1/orders/{id}`         | `orders:read`    |
| POST   | `/api/v1/orders`              | `orders:create`  |
| PATCH  | `/api/v1/orders/{id}/fulfill` | `orders:fulfill` |

Either store can view the order. The receiving store creates it and the supplying store fulfills it. `orders:all_stores` extends the assigned operation permissions across stores. Lists use `limit` (default 50, maximum 100) and `offset` (default 0).

Fulfillment records the signed-in handler and one positive issue quantity up to the requested quantity. It closes the order as `fulfilled`, including when the quantity issued is smaller than the quantity requested. A second fulfillment returns HTTP 409. Inventory balances, stock movement transactions and notifications are outside this first API slice.

Migration 6 creates the store and geography tables and seeds the national JMS store. Before district staff can use orders, provision their region, district and store with the relevant DHIS2 UIDs, set their account's `store_id` to the store UUID, and assign orders permissions through RBAC. Store and assignment setup currently requires database provisioning. Use existing `condoms` and `unit_of_measures` UUIDs when placing orders.

The supplied legacy dataset has no order rows. The migration archives any rows from other deployments in `legacy_orders` since the old table did not record the product. The legacy seed importer targets that archive.

## Stockout reports and warehouse orders

Two separate flows replace the earlier hotspot alert orders (migration 22). Health facilities are not part of either.

### 1. A hotspot reports a stockout to its DCFPs

A hotspot manager, or a VHT on the hotspot's behalf, sends `POST /api/v1/orders/stockouts` with the hotspot, a `selection` of `male`, `female` or `both`, and an optional message (`comment`). Older clients may send one product (`condom_id`) instead, whose category becomes the selection. It carries no quantity and **creates no order**. If the hotspot already has an open notification, the message is counted against it rather than raising a second one (200): its `repeat_count` rises, and naming another type widens its selection (Male then Female is Both). Its history keeps every message. CLIMS records a stockout report (`stockout_reports`) addressed to the store of the hotspot's district and sends that district's DCFPs an `order.stockout_reported` notification. The notification gives the hotspot's name, village, subcounty and district, its latest contact person and phone number, the product, who reported it and the message. Its resource is the hotspot. Other districts are not notified. A hotspot without a district cannot report (422) until its district is set.

`GET /api/v1/orders/stockouts` lists reports newest first: those sent to your district store, about your hotspot, or sent by you (`orders:all_stores`: all). `hot_spot_id` narrows it to one hotspot. Lists use `limit` (default 50, maximum 100) and `offset`.

The report is kept so a retried request still notifies nobody twice, and so a report survives when the district has no DCFP yet. What to order in response is the DCFP's decision, made in flow 2.

### 1a. The district delivers and the hotspot manager acknowledges

The DCFP records each delivery against the notification with `POST /api/v1/orders/stockouts/{id}/deliveries` (`orders:supply_hotspots` at the notification's district store): one or more lines of a product of a selected type and a `quantity` in the product's catalogue unit, an optional `note`, and an optional `client_reference` so a retried send records the delivery once. Each line is converted to pieces with the product's `pieces_per_unit`, taken out of the store's available stock (409 when too little) and written to the inventory ledger as a `hotspot_delivery`. The hotspot's manager accounts are notified (`order.hotspot_delivery`); a contact person without an account is not.

The hotspot's manager acknowledges what arrived with `POST /api/v1/orders/stockouts/{id}/acknowledgements`, giving the pieces actually received per delivery line (zero when nothing came). Only a user assigned to the hotspot can acknowledge: district and national users cannot complete fulfilment. Sending a line's count again is accepted once; a different count returns 409, since corrections must stay visible. The notification is **fulfilled** once every selected type has a positive acknowledgement, and the district is notified (`order.delivery_acknowledged`). Until then its status is `awaiting_supply`, `awaiting_acknowledgement` or `partly_received`. A fulfilled notification accepts no further deliveries, and the hotspot's next stockout opens a new one. `GET /api/v1/orders/stockouts/{id}` shows the deliveries, acknowledgements and history behind the status. [Reports](reports.md) count these records.

A hotspot manager may report for their assigned hotspot (`users.hot_spot_id`). A VHT with `orders:stockout_district` may report for any **active** hotspot in the district they work in: their assigned store's district, or else their assigned subcounty's (`users.DistrictOfUser`). Reports for inactive hotspots or other districts return 403. `orders:all_stores` may report for any hotspot. Products come from the catalogue (`GET /api/v1/catalogue/products`).

### 2. The DCFP orders stock from NMS or JMS

1. The DCFP sends `POST /api/v1/orders/warehouse-requests` with `warehouse_store_id` (NMS or JMS, the national stores from `GET /api/v1/locations/stores`), `condom_id` and `quantity`, e.g. 500 of a female product, and optionally a `comment`. The product fixes the condom type. `unit_of_measure_id` defaults to the product's catalogue unit and is required for a product without one (422). The order is for the DCFP's assigned district store; an account without one is refused (403), even with `orders:all_stores`. It starts `queued`, and the warehouse is notified.
2. Warehouse staff `review` the order, optionally approving a smaller `quantity_approved` (the request keeps the original `quantity_needed`), `check-stock` (which reserves the approved quantity, or holds it `on_hold` until stock arrives, when they rerun `check-stock`) and `dispatch` it, optionally with a smaller `quantity_issued`. Each step's quantity is kept in the order's events, so the original request and any revision stay visible.
3. The district runs `receive` on the dispatched order with the counted `quantity_received`; a mismatch requires a `discrepancy_note`. Receipt credits the counted quantity to the district store.

Workflow actions use `POST /api/v1/orders/{id}/actions/{action}`: `review`, `check-stock` and `dispatch` with `orders:process` at the warehouse, `receive` with `orders:receive` at the district store. Run `GET /api/v1/orders?status=on_hold` to review held orders and `GET /api/v1/orders/{id}/events` for audit history.

### Alert orders raised before migration 22

Hotspot stockouts used to be orders that the DCFP sent to the hotspot with a rider (`dispatch`, `deliver`) or covered with a linked warehouse request (`request-replenishment`). Those three actions are gone. Alert orders already in the database remain readable as history, but no workflow step applies to them (409). A warehouse request linked to one carries on through review, dispatch and receipt as usual. Migration 22 does not convert them to reports.

### Notifications

Every step notifies people through the shared [notification service](notifications.md), so they appear in each person's central inbox (`GET /api/v1/notifications`) with a message, read state and a link to the hotspot or order. A store is notified through the people holding the permission that acts on the step there, not everyone assigned to it, and the person who acted is never notified of their own step.

| Type                            | Sent to                                                    | Resource |
| ------------------------------- | ---------------------------------------------------------- | -------- |
| `order.stockout_reported`       | `orders:replenish` at the hotspot's district store (DCFPs) | hotspot  |
| `order.hotspot_delivery`        | The hotspot's manager accounts                             | hotspot  |
| `order.delivery_acknowledged`   | `orders:supply_hotspots` at the district store             | hotspot  |
| `order.replenishment_requested` | `orders:process` at the warehouse                          | order    |
| `order.shipment_dispatched`     | `orders:receive` at the district store                     | order    |
| `order.shipment_received`       | `orders:replenish` at the district store                   | order    |

`order.stockout_reported` also carries the report's details in `data`: `report_id`, `hotspot_id`, `hotspot`, `village`, `subcounty`, `district`, `place`, `contact_name`, `contact_phone`, `contact`, `condom_id`, `product`, `reporter` and `message`. Empty details are empty strings. The type names keep their earlier spelling so existing notifications stay grouped with new ones. `review`, `check-stock` and orders outside the workflow notify nobody. `GET /api/v1/orders/notifications`, the earlier orders-only inbox, is deprecated and does not include stockout reports: it keeps working until the web and mobile clients use the central inbox, and is then removed.

### Permissions

Migration 21 adds `orders:stockout_district` and `hotspots:read_district`; migration 24 adds `orders:supply_hotspots` and `reports:read`. As with every role, grant permissions through the RBAC API:

| Who                  | Permissions                                                                                                 |
| -------------------- | ----------------------------------------------------------------------------------------------------------- |
| Hotspot manager      | `orders:read`, `orders:stockout`                                                                            |
| VHT (field app)      | `hotspots:read`, `hotspots:submit`, `hotspots:read_district`, `orders:stockout`, `orders:stockout_district` |
| DCFP                 | `orders:read`, `orders:replenish`, `orders:receive`, `orders:supply_hotspots`, `reports:read`               |
| Warehouse (NMS, JMS) | `orders:read`, `orders:process`                                                                             |

A VHT without `orders:read` can send reports but not list them. `orders:deliver` is no longer used. Assign the corresponding hotspot or store to each user. Record verified opening balances per store, product and unit as receipts with `POST /api/v1/inventory/movements` before warehouses check stock (see [inventory](inventory.md)). Dispatch and receipt add their own entries to the inventory ledger.

These operations are exposed in Swagger. Generic store-to-store requests continue to use `POST /api/v1/orders` and the fulfillment endpoint.
