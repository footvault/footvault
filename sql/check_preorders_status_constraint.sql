-- Check the status constraint on pre_orders table
SELECT 
    tc.constraint_name,
    cc.check_clause,
    tc.table_name
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc 
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'pre_orders' 
    AND tc.constraint_type = 'CHECK'
    AND cc.check_clause LIKE '%status%';

-- Also check what values are currently in the status column
SELECT DISTINCT status, COUNT(*) as count
FROM pre_orders 
GROUP BY status
ORDER BY status;

-- Show the full table schema to understand all constraints
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'pre_orders'
ORDER BY ordinal_position;
