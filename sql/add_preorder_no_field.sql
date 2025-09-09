-- Add pre_order_no column to pre_orders table (without default initially)
ALTER TABLE public.pre_orders 
ADD COLUMN pre_order_no integer;

-- Update existing records to have proper pre_order_no values FIRST
-- This will assign sequential numbers to existing pre-orders per user
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

-- Now set the column as NOT NULL with default 1 for new records
ALTER TABLE public.pre_orders 
ALTER COLUMN pre_order_no SET NOT NULL;

ALTER TABLE public.pre_orders 
ALTER COLUMN pre_order_no SET DEFAULT 1;

-- Create function to get next pre-order number for a user
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

-- Create trigger function to auto-assign pre_order_no on insert
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

-- Create trigger to auto-assign pre_order_no before insert
DROP TRIGGER IF EXISTS assign_preorder_no_trigger ON pre_orders;
CREATE TRIGGER assign_preorder_no_trigger
    BEFORE INSERT ON pre_orders
    FOR EACH ROW
    EXECUTE FUNCTION assign_preorder_no();

-- Create index for pre_order_no
CREATE INDEX IF NOT EXISTS idx_pre_orders_user_id_pre_order_no 
ON public.pre_orders USING btree (user_id, pre_order_no) TABLESPACE pg_default;

-- NOW create unique constraint (after records are properly numbered)
ALTER TABLE public.pre_orders 
ADD CONSTRAINT pre_orders_user_pre_order_no_unique 
UNIQUE (user_id, pre_order_no);
