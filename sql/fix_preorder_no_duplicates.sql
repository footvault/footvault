-- Fix pre_order_no duplicates and add unique constraint
-- This script handles the case where pre_order_no column already exists with duplicates

-- Step 1: Update existing records to have proper sequential pre_order_no values
WITH numbered_preorders AS (
    SELECT 
        id,
        user_id,
        ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at, id) as new_pre_order_no
    FROM pre_orders
)
UPDATE pre_orders 
SET pre_order_no = numbered_preorders.new_pre_order_no
FROM numbered_preorders
WHERE pre_orders.id = numbered_preorders.id;

-- Step 2: Create function to get next pre-order number for a user (if not exists)
CREATE OR REPLACE FUNCTION get_next_preorder_no(user_uuid uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    next_no integer;
BEGIN
    -- Get the maximum pre_order_no for this user and add 1
    SELECT COALESCE(MAX(pre_order_no), 0) + 1 
    INTO next_no
    FROM pre_orders 
    WHERE user_id = user_uuid;
    
    RETURN next_no;
END;
$$;

-- Step 3: Create trigger function to auto-assign pre_order_no on insert (if not exists)
CREATE OR REPLACE FUNCTION assign_preorder_no()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only assign if pre_order_no is not already set (allows manual override)
    IF NEW.pre_order_no IS NULL OR NEW.pre_order_no = 1 THEN
        NEW.pre_order_no := get_next_preorder_no(NEW.user_id);
    END IF;
    
    RETURN NEW;
END;
$$;

-- Step 4: Create trigger to auto-assign pre_order_no before insert
DROP TRIGGER IF EXISTS assign_preorder_no_trigger ON pre_orders;
CREATE TRIGGER assign_preorder_no_trigger
    BEFORE INSERT ON pre_orders
    FOR EACH ROW
    EXECUTE FUNCTION assign_preorder_no();

-- Step 5: Create index for pre_order_no (if not exists)
CREATE INDEX IF NOT EXISTS idx_pre_orders_user_id_pre_order_no 
ON public.pre_orders USING btree (user_id, pre_order_no) TABLESPACE pg_default;

-- Step 6: Try to add unique constraint (will fail if still duplicates exist)
-- Check for duplicates first
DO $$
BEGIN
    -- Check if we have any duplicates
    IF EXISTS (
        SELECT user_id, pre_order_no, COUNT(*)
        FROM pre_orders
        GROUP BY user_id, pre_order_no
        HAVING COUNT(*) > 1
    ) THEN
        RAISE NOTICE 'Duplicates still exist. Please check the data.';
    ELSE
        -- No duplicates, safe to add constraint
        ALTER TABLE public.pre_orders 
        ADD CONSTRAINT pre_orders_user_pre_order_no_unique 
        UNIQUE (user_id, pre_order_no);
        RAISE NOTICE 'Unique constraint added successfully.';
    END IF;
END $$;
