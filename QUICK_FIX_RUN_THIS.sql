-- QUICK START: Run this in Supabase SQL Editor to optimize your database
-- This script adds essential indexes for handling 5000+ records efficiently across all pages

BEGIN;

-- ========================================
-- INVENTORY & VARIANTS OPTIMIZATION
-- ========================================

-- 1. Variants table indexes (for inventory and variants pages)
CREATE INDEX IF NOT EXISTS idx_variants_product_id ON variants(product_id) WHERE "isArchived" = false;
CREATE INDEX IF NOT EXISTS idx_variants_user_id ON variants(user_id) WHERE "isArchived" = false;
CREATE INDEX IF NOT EXISTS idx_variants_user_status_archived ON variants(user_id, status, "isArchived");
CREATE INDEX IF NOT EXISTS idx_variants_serial_number ON variants(serial_number DESC) WHERE "isArchived" = false;
CREATE INDEX IF NOT EXISTS idx_variants_location_id ON variants(location_id) WHERE location_id IS NOT NULL AND "isArchived" = false;
CREATE INDEX IF NOT EXISTS idx_variants_owner_type ON variants(owner_type, user_id) WHERE "isArchived" = false;

-- 2. Products table indexes
CREATE INDEX IF NOT EXISTS idx_products_user_id_archived ON products(user_id) WHERE "isArchived" = false;
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC) WHERE "isArchived" = false;

-- ========================================
-- SALES PAGE OPTIMIZATION
-- ========================================

-- 3. Sales table indexes
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON sales(sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_user_date ON sales(user_id, sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status, user_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id);

-- 4. Sale items indexes
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_variant_id ON sale_items(variant_id);

-- 5. Sale profit distributions indexes
CREATE INDEX IF NOT EXISTS idx_sale_profit_distributions_sale_id ON sale_profit_distributions(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_profit_distributions_avatar_id ON sale_profit_distributions(avatar_id);

-- ========================================
-- PREORDERS PAGE OPTIMIZATION
-- ========================================

-- 6. Pre-orders table indexes
CREATE INDEX IF NOT EXISTS idx_pre_orders_user_id ON pre_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_pre_orders_created_at ON pre_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pre_orders_customer_id ON pre_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_pre_orders_product_id ON pre_orders(product_id);
CREATE INDEX IF NOT EXISTS idx_pre_orders_status ON pre_orders(status, user_id);

-- ========================================
-- CUSTOMERS PAGE OPTIMIZATION
-- ========================================

-- 7. Customers table indexes
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id) WHERE is_archived = false;
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at DESC) WHERE is_archived = false;
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email) WHERE is_archived = false;
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone) WHERE is_archived = false;

-- ========================================
-- CONSIGNORS PAGE OPTIMIZATION
-- ========================================

-- 8. Consignors table indexes (using lowercase isarchived)
CREATE INDEX IF NOT EXISTS idx_consignors_user_id ON consignors(user_id) WHERE isarchived = false;
CREATE INDEX IF NOT EXISTS idx_consignors_created_at ON consignors(created_at DESC) WHERE isarchived = false;
CREATE INDEX IF NOT EXISTS idx_consignors_status ON consignors(status, user_id);

-- 9. Consignment sales indexes
CREATE INDEX IF NOT EXISTS idx_consignment_sales_consignor_id ON consignment_sales(consignor_id);
CREATE INDEX IF NOT EXISTS idx_consignment_sales_payout_status ON consignment_sales(payout_status);
CREATE INDEX IF NOT EXISTS idx_consignment_sales_created_at ON consignment_sales(created_at DESC);

-- ========================================
-- COMMON RELATIONS OPTIMIZATION
-- ========================================

-- 10. Custom locations indexes
CREATE INDEX IF NOT EXISTS idx_custom_locations_user_id ON custom_locations(user_id);

-- 11. Avatars indexes
CREATE INDEX IF NOT EXISTS idx_avatars_user_id ON avatars(user_id);

-- 12. Payment types indexes (if exists)
CREATE INDEX IF NOT EXISTS idx_payment_types_name ON payment_types(name);

-- ========================================
-- UPDATE TABLE STATISTICS
-- ========================================

ANALYZE variants;
ANALYZE products;
ANALYZE sales;
ANALYZE sale_items;
ANALYZE sale_profit_distributions;
ANALYZE pre_orders;
ANALYZE customers;
ANALYZE consignors;
ANALYZE consignment_sales;
ANALYZE custom_locations;
ANALYZE avatars;

COMMIT;

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- Verify all indexes were created successfully
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Check index usage statistics (run this after a few days of usage)
-- SELECT 
--     schemaname,
--     tablename,
--     indexname,
--     idx_scan as times_used,
--     idx_tup_read as tuples_read,
--     idx_tup_fetch as tuples_fetched
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
--   AND indexname LIKE 'idx_%'
-- ORDER BY idx_scan DESC;

