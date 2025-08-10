-- Add user-specific sales numbering
-- This script ensures that sales_no is unique per user and starts from 1 for each user

-- First, let's update existing sales to have proper sales_no values
-- This will assign sequential numbers starting from 1 for each user's sales
WITH user_sales AS (
  SELECT 
    id,
    user_id,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at ASC) as row_num
  FROM public.sales
  WHERE sales_no IS NULL
)
UPDATE public.sales 
SET sales_no = user_sales.row_num
FROM user_sales 
WHERE public.sales.id = user_sales.id;

-- Add a unique constraint to ensure sales_no is unique per user
-- This prevents duplicate sales numbers for the same user
ALTER TABLE public.sales 
ADD CONSTRAINT sales_unique_sales_no_per_user 
UNIQUE (user_id, sales_no);

-- Create an index for better performance on sales_no queries
CREATE INDEX IF NOT EXISTS idx_sales_user_id_sales_no 
ON public.sales (user_id, sales_no);

-- Optional: Add a check constraint to ensure sales_no is positive
ALTER TABLE public.sales 
ADD CONSTRAINT sales_no_positive 
CHECK (sales_no > 0);
