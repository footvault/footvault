-- Migration: Update Pre-order System
-- Date: 2026-01-22
-- Description: 
-- 1. Add down_payment_method column to track how down payment was paid
-- 2. Remove cost_price requirement (make nullable) since cost is entered at checkout

-- Add down_payment_method column to track payment method for down payment
ALTER TABLE pre_orders
ADD COLUMN IF NOT EXISTS down_payment_method VARCHAR(100);

-- Make cost_price nullable since it will be entered at checkout
ALTER TABLE pre_orders
ALTER COLUMN cost_price DROP NOT NULL;

-- Set default cost_price to 0 for existing records
UPDATE pre_orders
SET cost_price = 0
WHERE cost_price IS NULL;

-- Note: This migration allows pre-orders to be created without knowing the cost upfront.
-- The cost will be entered during checkout when the product arrives and is sold.
-- Down payment method tracks how the customer paid their deposit (Cash, GCash, etc.)
