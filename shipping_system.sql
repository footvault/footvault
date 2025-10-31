-- Add shipping-related columns to the sales table
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS shipping_address TEXT,
ADD COLUMN IF NOT EXISTS shipping_city VARCHAR(100),
ADD COLUMN IF NOT EXISTS shipping_state VARCHAR(100), 
ADD COLUMN IF NOT EXISTS shipping_zip VARCHAR(20),
ADD COLUMN IF NOT EXISTS shipping_country VARCHAR(100) DEFAULT 'Philippines',
ADD COLUMN IF NOT EXISTS shipping_notes TEXT,
ADD COLUMN IF NOT EXISTS down_payment DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS remaining_balance DECIMAL(10,2) DEFAULT 0;

-- Update the status check constraint to include 'voided'
ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS sales_status_check;
ALTER TABLE public.sales ADD CONSTRAINT sales_status_check CHECK (
  (status)::text = ANY (
    ARRAY[
      'pending'::character varying,
      'completed'::character varying,
      'refunded'::character varying,
      'canceled'::character varying,
      'downpayment'::character varying,
      'voided'::character varying
    ]::text[]
  )
);

-- Update existing sales to have correct remaining balance (0 for completed sales)
UPDATE public.sales 
SET remaining_balance = 0 
WHERE status = 'completed' AND remaining_balance IS NULL;

-- Add index for pending sales
CREATE INDEX IF NOT EXISTS idx_sales_status_pending ON public.sales (status) WHERE status = 'pending';

-- Add index for voided sales
CREATE INDEX IF NOT EXISTS idx_sales_status_voided ON public.sales (status) WHERE status = 'voided';

-- Add check constraint to ensure down_payment doesn't exceed total_amount
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'chk_down_payment_valid' 
        AND table_name = 'sales'
    ) THEN
        ALTER TABLE public.sales 
        ADD CONSTRAINT chk_down_payment_valid 
        CHECK (down_payment >= 0 AND down_payment <= total_amount);
    END IF;
END $$;

-- Add check constraint to ensure remaining_balance is consistent
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'chk_remaining_balance_valid' 
        AND table_name = 'sales'
    ) THEN
        ALTER TABLE public.sales 
        ADD CONSTRAINT chk_remaining_balance_valid 
        CHECK (remaining_balance >= 0 AND remaining_balance <= total_amount);
    END IF;
END $$;

-- Create index for shipping orders
CREATE INDEX IF NOT EXISTS idx_sales_shipping ON public.sales (user_id, status) WHERE shipping_address IS NOT NULL;

-- Add comment to document the shipping system
COMMENT ON COLUMN public.sales.shipping_address IS 'Street address for shipping orders';
COMMENT ON COLUMN public.sales.down_payment IS 'Initial payment received for pending orders';
COMMENT ON COLUMN public.sales.remaining_balance IS 'Amount remaining to be paid (total_amount - down_payment)';