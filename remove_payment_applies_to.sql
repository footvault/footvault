-- Migration: Remove applies_to column from payment_types table
-- Date: 2026-01-22
-- Description: Simplifies payment type fee logic by removing the applies_to field.
-- Payment fees will now always be added to the customer's total amount.

-- Drop the applies_to column from payment_types table
ALTER TABLE payment_types 
DROP COLUMN IF EXISTS applies_to;

-- Note: This migration removes the applies_to field which previously determined
-- whether a payment fee affected "cost" (added to customer total) or "profit" (reduced store profit).
-- After this migration, all payment fees will be added to the customer's total amount.
