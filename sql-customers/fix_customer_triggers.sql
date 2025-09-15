-- Fix customer table triggers for updated schema
-- Remove the old triggers that reference non-existent columns

-- Drop the trigger that updates customer stats
DROP TRIGGER IF EXISTS update_customer_stats_trigger ON sales;

-- Drop the function that references the old columns
DROP FUNCTION IF EXISTS update_customer_stats();

-- Note: The customers table schema should match the new structure:
-- - Removed total_orders column (calculated in real-time)
-- - Removed total_spent column (calculated in real-time)
-- - Kept last_order_date column (still useful for quick lookups)

-- The update_customers_updated_at trigger and function can remain as they only touch the updated_at column