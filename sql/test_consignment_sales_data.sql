-- Sample data for testing consignment_sales functionality
-- Make sure to replace the UUIDs and user_id with actual values from your database

-- First, let's check what sales and variants exist
-- SELECT id, user_id, total_amount FROM sales LIMIT 5;
-- SELECT id, product_id, size FROM variants LIMIT 5;
-- SELECT id, name FROM consignors LIMIT 5;

-- Sample insert (replace with actual IDs from your database)
-- INSERT INTO consignment_sales (
--   sale_id,
--   variant_id,
--   consignor_id,
--   sale_price,
--   commission_rate,
--   store_commission,
--   consignor_payout,
--   payout_status,
--   user_id
-- ) VALUES (
--   'your-sale-id-here',  -- Replace with actual sale ID
--   'your-variant-id-here',  -- Replace with actual variant ID
--   1,  -- Replace with actual consignor ID
--   150.00,  -- Sale price
--   20.00,  -- Commission rate (20%)
--   30.00,  -- Store commission (20% of 150)
--   120.00,  -- Consignor payout (150 - 30)
--   'pending',
--   'your-user-id-here'  -- Replace with actual user ID
-- );

-- To get actual IDs for testing, run these queries first:
SELECT 'Sales available:' as info;
SELECT id, total_amount, created_at FROM sales ORDER BY created_at DESC LIMIT 3;

SELECT 'Variants available:' as info;
SELECT v.id, v.size, p.name as product_name 
FROM variants v 
JOIN products p ON v.product_id = p.id 
ORDER BY v.created_at DESC LIMIT 3;

SELECT 'Consignors available:' as info;
SELECT id, name FROM consignors ORDER BY created_at DESC LIMIT 3;
