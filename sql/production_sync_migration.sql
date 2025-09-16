-- Production Sync Migration
-- This migration brings production database in sync with development
-- Run this script on production to add missing features and constraints

-- =============================================================================
-- 1. FIX PRE_ORDER_PAYMENTS TABLE
-- =============================================================================

-- Add missing foreign key constraint
ALTER TABLE public.pre_order_payments 
ADD CONSTRAINT pre_order_payments_pre_order_id_fkey 
FOREIGN KEY (pre_order_id) REFERENCES pre_orders (id) ON DELETE CASCADE;

-- Add missing composite index
CREATE INDEX IF NOT EXISTS idx_pre_order_payments_pre_order_date 
ON public.pre_order_payments USING btree (pre_order_id, payment_date DESC) 
TABLESPACE pg_default;

-- =============================================================================
-- 2. FIX PRE_ORDERS TABLE
-- =============================================================================

-- Fix remaining_balance column to include proper precision
-- Note: PostgreSQL doesn't allow direct ALTER of generated columns
-- We need to drop and recreate the column
ALTER TABLE public.pre_orders DROP COLUMN remaining_balance;
ALTER TABLE public.pre_orders 
ADD COLUMN remaining_balance numeric(12, 2) 
GENERATED ALWAYS AS ((total_amount - down_payment)) STORED;

-- =============================================================================
-- 3. ADD MISSING COLUMNS TO PRODUCTS TABLE
-- =============================================================================

-- Add pre-order related columns
ALTER TABLE public.products 
ADD COLUMN inventory_type character varying(20) DEFAULT 'in_stock';

ALTER TABLE public.products 
ADD COLUMN pre_order_enabled boolean DEFAULT false;

ALTER TABLE public.products 
ADD COLUMN pre_order_deposit_required boolean DEFAULT true;

ALTER TABLE public.products 
ADD COLUMN min_deposit_amount numeric(10, 2) DEFAULT 0.00;

ALTER TABLE public.products 
ADD COLUMN min_deposit_percentage numeric(5, 2) DEFAULT 20.00;

ALTER TABLE public.products 
ADD COLUMN expected_arrival_date date;

ALTER TABLE public.products 
ADD COLUMN pre_order_limit integer;

-- Add constraints for products table
ALTER TABLE public.products 
ADD CONSTRAINT products_inventory_type_check 
CHECK (
  (inventory_type)::text = ANY (
    (ARRAY[
      'in_stock'::character varying,
      'pre_order'::character varying,
      'both'::character varying
    ])::text[]
  )
);

ALTER TABLE public.products 
ADD CONSTRAINT products_min_deposit_percentage_check 
CHECK (
  (min_deposit_percentage >= (0)::numeric) 
  AND (min_deposit_percentage <= (100)::numeric)
);

-- Add missing index for products
CREATE INDEX IF NOT EXISTS idx_products_inventory_type 
ON public.products USING btree (inventory_type) 
TABLESPACE pg_default;

-- =============================================================================
-- 4. ADD MISSING COLUMNS TO SALES TABLE
-- =============================================================================

-- Add customer_id column
ALTER TABLE public.sales 
ADD COLUMN customer_id integer;

-- Add foreign key constraint for customer_id
ALTER TABLE public.sales 
ADD CONSTRAINT sales_customer_id_fkey 
FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE SET NULL;

-- Drop existing status check constraint and recreate with all status values
ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS sales_status_check;
ALTER TABLE public.sales 
ADD CONSTRAINT sales_status_check 
CHECK (
  (status)::text = ANY (
    (ARRAY[
      'pending'::character varying,
      'completed'::character varying,
      'refunded'::character varying,
      'canceled'::character varying,
      'downpayment'::character varying
    ])::text[]
  )
);

-- Add missing indexes for sales table
CREATE INDEX IF NOT EXISTS idx_sales_customer_id 
ON public.sales USING btree (customer_id) 
TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_sales_user_status 
ON public.sales USING btree (user_id, status) 
TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_sales_status_refunded 
ON public.sales USING btree (status) 
TABLESPACE pg_default
WHERE ((status)::text = 'refunded'::text);

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Uncomment these to verify the migration worked correctly:

-- Check pre_order_payments constraints
-- SELECT conname FROM pg_constraint WHERE conrelid = 'pre_order_payments'::regclass;

-- Check products columns
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'products' AND table_schema = 'public'
-- ORDER BY ordinal_position;

-- Check sales columns and constraints
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'sales' AND table_schema = 'public'
-- ORDER BY ordinal_position;

-- Check all indexes
-- SELECT indexname, tablename 
-- FROM pg_indexes 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('pre_order_payments', 'pre_orders', 'products', 'sales')
-- ORDER BY tablename, indexname;

COMMIT;