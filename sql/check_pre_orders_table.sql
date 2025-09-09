-- Quick check if pre_orders table exists and its structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'pre_orders' 
ORDER BY ordinal_position;
