-- Warehouse request quantities (reporting requirements v0.2, RF06): requested, approved, issued and
-- district-acknowledged quantities are reported separately. Review records the quantity the warehouse
-- approves, and every step keeps the quantity it was about, so the original request and any agreed
-- revision stay in the order's history.
BEGIN;

ALTER TABLE orders ADD COLUMN quantity_approved integer
    CHECK (quantity_approved > 0 AND quantity_approved <= quantity_needed);

-- Requests already past review were approved as requested.
UPDATE orders SET quantity_approved = quantity_needed
WHERE quantity_needed IS NOT NULL AND hot_spot_id IS NULL
    AND order_status IN ('reviewed', 'on_hold', 'confirmed', 'dispatched', 'received');

-- The quantity a step was about: requested, approved, issued or counted on arrival.
ALTER TABLE order_events ADD COLUMN quantity integer CHECK (quantity >= 0);

COMMIT;
