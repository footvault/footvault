-- Complete Sales Numbering Migration
-- Run this script in your Supabase SQL editor to implement user-specific sales numbering

-- Step 1: Create the function to safely generate next sales number
CREATE OR REPLACE FUNCTION get_next_sales_no(user_uuid uuid) 
RETURNS integer AS $$
DECLARE
    next_no integer;
BEGIN
    -- Lock the user's sales records to prevent concurrent access
    -- Get the current maximum sales_no for this user
    SELECT COALESCE(MAX(sales_no), 0) + 1 
    INTO next_no
    FROM public.sales 
    WHERE user_id = user_uuid
    FOR UPDATE;
    
    RETURN next_no;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Grant execute permission
GRANT EXECUTE ON FUNCTION get_next_sales_no(uuid) TO authenticated, service_role;

-- Step 3: Update existing sales to have proper user-specific sales_no values
-- This will assign sequential numbers starting from 1 for each user's sales
WITH user_sales AS (
  SELECT 
    id,
    user_id,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at ASC) as row_num
  FROM public.sales
  WHERE sales_no IS NULL OR sales_no = 0
)
UPDATE public.sales 
SET sales_no = user_sales.row_num
FROM user_sales 
WHERE public.sales.id = user_sales.id;

-- Step 4: Add constraints to ensure data integrity
-- Unique constraint to ensure sales_no is unique per user
ALTER TABLE public.sales 
DROP CONSTRAINT IF EXISTS sales_unique_sales_no_per_user;

ALTER TABLE public.sales 
ADD CONSTRAINT sales_unique_sales_no_per_user 
UNIQUE (user_id, sales_no);

-- Check constraint to ensure sales_no is positive
ALTER TABLE public.sales 
DROP CONSTRAINT IF EXISTS sales_no_positive;

ALTER TABLE public.sales 
ADD CONSTRAINT sales_no_positive 
CHECK (sales_no > 0);

-- Step 5: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sales_user_id_sales_no 
ON public.sales (user_id, sales_no);

CREATE INDEX IF NOT EXISTS idx_sales_user_id_created_at 
ON public.sales (user_id, created_at);

-- Step 6: Show results for verification
SELECT 
  user_id,
  COUNT(*) as total_sales,
  MIN(sales_no) as first_sale_no,
  MAX(sales_no) as last_sale_no
FROM public.sales 
GROUP BY user_id 
ORDER BY user_id;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Sales numbering migration completed successfully!';
  RAISE NOTICE 'Each user now has their own sequential sales numbers starting from 1.';
END $$;
