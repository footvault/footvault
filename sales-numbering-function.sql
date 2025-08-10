-- Create a function to safely generate the next sales number for a user
-- This function handles concurrency and ensures no duplicate sales numbers

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

-- Grant execute permission to the appropriate roles
GRANT EXECUTE ON FUNCTION get_next_sales_no(uuid) TO authenticated, service_role;
