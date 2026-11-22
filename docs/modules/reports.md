# Reports

[Module architecture](README.md)

The reports module serves the programme reports described in the reporting requirements (draft v0.2). Every figure is calculated on request from source records, using the same notification facts as the orders screens, so a total and the records behind it always agree (RN02).

| Method | Route                                        | Permission     |
| ------ | -------------------------------------------- | -------------- |
| GET    | `/api/v1/reports/notifications`              | `reports:read` |
| GET    | `/api/v1/reports/notifications/records`      | `reports:read` |
| GET    | `/api/v1/reports/warehouse-requests`         | `reports:read` |
| GET    | `/api/v1/reports/warehouse-requests/records` | `reports:read` |
| GET    | `/api/v1/reports/stock`                      | `reports:read` |

## Notification fulfilment

A hotspot stockout notification names Male, Female or Both and no quantity. The district delivers against it and the hotspot's manager acknowledges the pieces received; see [orders](orders.md#1a-the-district-delivers-and-the-hotspot-manager-acknowledges). Each notification has one status:

| Status                     | Meaning                                                             |
| -------------------------- | ------------------------------------------------------------------- |
| `awaiting_supply`          | Nothing delivered yet                                               |
| `awaiting_acknowledgement` | Delivered, but no positive acknowledgement yet                      |
| `partly_received`          | Some selected types acknowledged, not all                           |
| `fulfilled`                | The manager acknowledged a positive receipt for every selected type |

`GET /api/v1/reports/notifications` reports on notifications **raised in the period**:

- **Notifications raised**, counted once each; repeated messages against an open notification are not counted again. `by_selection` splits them by Male, Female and Both.
- **Notifications fulfilled**: raised in the period and fully acknowledged by `data_updated_at`. Dispatch or delivery entry alone does not count. `acknowledgements_through` states the time up to which acknowledgements are included.
- **Fulfilment rate**: fulfilled divided by raised, as a percentage to one decimal. With no notifications it is `null` (Not applicable).
- **Component**: with `category=male` or `female`, the report covers notifications that include that type, and `component` gives that type's part. A Both notification counts under each type, so the two components exceed the unique total.
- **Response**: the median hours from notification to the last acknowledgement needed, among fulfilled notifications, with the pending count and the oldest pending age. The clock starts when the notification was first raised; a repeat does not restart it.
- **Deadline**: notifications fulfilled within `deadline_days` (default 7) divided by those raised, against `target_percent` (default 80), and open notifications already past the deadline. For a period still in progress this is progress to date.
- **Backlog**: open notifications raised before the period, kept apart from it.
- **Acknowledgement overdue**: a quality issue, counting notifications with a delivery left unacknowledged for longer than the deadline.
- **Districts**: raised, fulfilled and rate per district, for comparison.

`GET /api/v1/reports/notifications/records` lists the notifications behind those totals for the same filters, newest first, with the pieces delivered and acknowledged per type, the response time and the overdue flag. Filter by `status` and page with `limit` and `offset`. `GET /api/v1/orders/stockouts/{id}` opens one notification's deliveries, acknowledgements and history.

## Warehouse requests

`GET /api/v1/reports/warehouse-requests` reports on district requests to the national warehouses raised in the period, in total and `by_type` (male, female), `by_warehouse` and `by_district`:

- **Requested, approved, issued and acknowledged pieces.** Requested is the original request. Approved is what the warehouse approved at review, which may be less ([orders](orders.md)). Issued is what it dispatched, and acknowledged is what the district counted on receipt.
- **Quantity fulfilment rate**: acknowledged pieces divided by originally requested pieces, as a percentage to one decimal.
- **Fully received, partly received and pending**: a request is fully received when the district counted at least the quantity requested.
- **Response**: median hours from the request to the district's receipt, with the pending count and the oldest pending age.
- **Unconverted**: a quality issue. Quantities convert to pieces with the product's `pieces_per_unit` in its catalogue unit; requests in another unit, or for a product without pieces per unit, are left out of the piece totals and counted here.

`GET /api/v1/reports/warehouse-requests/records` lists the requests behind those totals, newest first, in units and pieces. Filter both by `warehouse_store_id`, `district_id` and `category`.

## Store stock

`GET /api/v1/reports/stock` is a current, dated view of stock at warehouses and district stores, separate from any reporting period (`stock_date`). Each line is a store, product and unit:

- **Physical, reserved, usable and in transit.** Usable is physical less reserved. In transit is stock dispatched to the store and not yet received, counted once. Pieces are given when the stock is held in the product's catalogue unit.
- **Reconciled**: whether the inventory ledger adds up to the physical balance.
- **Months of stock**: usable stock divided by average monthly outward issues over the last three complete Kampala months. Outward issues are warehouse dispatches to districts and district deliveries to hotspots. This is issue-based coverage, not consumption. `coverage_status` explains when it is unavailable: the ledger does not reconcile, the history does not cover the whole window, or nothing was issued.

Filter by `store_id`, `store_type`, `district_id` and `category`. Batches and expiry dates are not recorded yet (`expiry_tracked` is false), so expired and unknown-expiry stock cannot be separated from usable stock.

## Filters and dates

The notification and warehouse request reports accept `from` and `to` as calendar days in Africa/Kampala (`YYYY-MM-DD`, both included), defaulting to the current month to date, and `district_id`, `hot_spot_id`, `category`, `deadline_days` and `target_percent`. Timestamps are stored with their time zone and periods are cut at Kampala midnight (RN09).

## Access

Access is checked on the server for every request (RN01). `orders:all_stores` sees every notification, request and store, for national users. Warehouse request and stock reports show other users their assigned store only. For notifications, others see the notifications of their assigned district store, of their assigned hotspot, the ones they sent, and with `orders:stockout_district` the district they work in. Filters only narrow what the user can already see, so another district's data is never returned, including by asking for its hotspot.

Migration 24 grants `reports:read` to `admin` only. Grant it to MoH, district and community reporting roles through `PUT /api/v1/roles/{id}/permissions`, with `orders:all_stores` for national users.

## Not covered yet

These parts of the requirements need decisions or data that do not exist yet:

- **Saved response settings (RF07, RN11):** `deadline_days` and `target_percent` are request parameters. Saving them per organisation, with who set them and from when, waits for approval of the defaults.
- **Batches and expiry (RF10, RF16):** stock is not tracked by batch or expiry date, so expired, quarantined and unknown-expiry stock are not deducted from usable stock, and FEFO is not applied.
- **Coverage settings (RF11):** the three-month window is the draft's proposal and awaits the supply-chain team's approval.
- **HMIS 105 (RF14):** awaits programme approval; DHIS2 integration stays disabled.
- **Report versions and exports (RF15, RN04):** totals are live, not saved as approved versions.
