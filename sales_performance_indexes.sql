-- Sales Performance Optimization Indexes
-- These indexes are specifically designed to optimize the sales-stats API performance

-- 1. Composite index for the main sales stats query (user_id, sale_date, status)
-- This will speed up filtering by user, date range, and status all at once
CREATE INDEX IF NOT EXISTS idx_sales_user_date_status 
ON public.sales (user_id, sale_date, status) 
TABLESPACE pg_default;

-- 2. Composite index for pending sales filtering (user_id, status) where status = 'pending'
-- This optimizes the pending sales calculation
CREATE INDEX IF NOT EXISTS idx_sales_user_pending 
ON public.sales (user_id, status) 
WHERE status = 'pending'
TABLESPACE pg_default;

-- 3. Composite index for completed sales (user_id, status) where status = 'completed'
-- This optimizes the main sales stats calculation
CREATE INDEX IF NOT EXISTS idx_sales_user_completed 
ON public.sales (user_id, status) 
WHERE status = 'completed'
TABLESPACE pg_default;

-- 4. Index for voided sales (already exists in shipping_system.sql but adding here for completeness)
CREATE INDEX IF NOT EXISTS idx_sales_status_voided 
ON public.sales (status) 
WHERE status = 'voided'
TABLESPACE pg_default;

-- 5. Covering index for the optimized base query - includes all needed fields
-- This allows the database to get all required data from the index without table lookups
CREATE INDEX IF NOT EXISTS idx_sales_stats_covering 
ON public.sales (user_id, sale_date, status) 
INCLUDE (id, total_amount, net_profit)
TABLESPACE pg_default;

-- 6. Index for date range queries (sale_date with user_id)
-- Optimizes queries with date range filters
CREATE INDEX IF NOT EXISTS idx_sales_date_user 
ON public.sales (sale_date, user_id) 
TABLESPACE pg_default;

-- Performance Analysis Query
-- Run this to check if indexes are being used effectively:
/*
EXPLAIN (ANALYZE, BUFFERS) 
SELECT 
  id, total_amount, net_profit, sale_date, status
FROM sales 
WHERE user_id = 'your-user-id' 
  AND sale_date >= '2024-01-01' 
  AND sale_date <= '2024-12-31'
  AND status IN ('completed', 'refunded', 'voided');
*/