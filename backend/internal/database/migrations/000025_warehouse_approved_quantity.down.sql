BEGIN;

-- Approved quantities and step quantities are dropped; the requested and issued quantities remain.
ALTER TABLE order_events DROP COLUMN quantity;
ALTER TABLE orders DROP COLUMN quantity_approved;

COMMIT;
