-- Add customer_id to sales table
ALTER TABLE public.sales 
ADD COLUMN customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL;

-- Add index for customer_id in sales
CREATE INDEX idx_sales_customer_id ON public.sales (customer_id);

-- Create the trigger to update customer stats when sales are made
CREATE TRIGGER update_customer_stats_trigger
    AFTER INSERT OR DELETE ON sales
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_stats();
