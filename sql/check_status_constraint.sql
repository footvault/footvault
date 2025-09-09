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
