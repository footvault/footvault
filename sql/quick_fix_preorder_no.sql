-- Quick fix for pre_order_no duplicates
UPDATE pre_orders 
SET pre_order_no = t.new_pre_order_no
FROM (
    SELECT 
        id,
        ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at, id) as new_pre_order_no
    FROM pre_orders
) t
WHERE pre_orders.id = t.id;
