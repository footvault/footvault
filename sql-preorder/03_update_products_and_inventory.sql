-- Add inventory type and pre-order fields to products table
ALTER TABLE public.products 
ADD COLUMN inventory_type VARCHAR(20) DEFAULT 'in_stock' CHECK (
    inventory_type IN ('in_stock', 'pre_order', 'both')
),
ADD COLUMN pre_order_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN pre_order_deposit_required BOOLEAN DEFAULT TRUE,
ADD COLUMN min_deposit_amount NUMERIC(10, 2) DEFAULT 0.00,
ADD COLUMN min_deposit_percentage NUMERIC(5, 2) DEFAULT 20.00 CHECK (min_deposit_percentage >= 0 AND min_deposit_percentage <= 100),
ADD COLUMN expected_arrival_date DATE,
ADD COLUMN pre_order_limit INTEGER; -- NULL means unlimited

-- Add index for inventory type
CREATE INDEX idx_products_inventory_type ON public.products (inventory_type);

-- Function to handle pre-order completion and inventory updates
CREATE OR REPLACE FUNCTION handle_pre_order_completion()
RETURNS TRIGGER AS $$
BEGIN
    -- When a pre-order is completed, check if we need to create/update a variant
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        -- If variant_id is set, update the variant status to sold
        IF NEW.variant_id IS NOT NULL THEN
            UPDATE variants 
            SET status = 'Sold', 
                date_sold = CURRENT_DATE
            WHERE id = NEW.variant_id;
        END IF;
        
        -- Set completed_date
        NEW.completed_date = CURRENT_DATE;
    END IF;
    
    -- When a pre-order is canceled or voided, free up the variant if assigned
    IF (NEW.status IN ('canceled', 'voided')) AND (OLD.status NOT IN ('canceled', 'voided')) THEN
        IF NEW.variant_id IS NOT NULL THEN
            UPDATE variants 
            SET status = 'Available',
                date_sold = NULL
            WHERE id = NEW.variant_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for pre-order status changes
CREATE TRIGGER handle_pre_order_completion_trigger
    BEFORE UPDATE ON pre_orders
    FOR EACH ROW
    EXECUTE FUNCTION handle_pre_order_completion();
