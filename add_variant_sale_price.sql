-- Add sale_price column to variants table
-- This allows each variant to have its own independent sale price

-- Add sale_price column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'variants' AND column_name = 'sale_price'
    ) THEN
        ALTER TABLE public.variants 
        ADD COLUMN sale_price NUMERIC(10, 2) NULL;
        
        RAISE NOTICE 'Added sale_price column to variants table';
    ELSE
        RAISE NOTICE 'sale_price column already exists';
    END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN public.variants.sale_price IS 'Individual sale price for this variant (independent from product base price)';

-- Add index for sale_price queries (useful for filtering/sorting)
CREATE INDEX IF NOT EXISTS idx_variants_sale_price 
ON public.variants USING btree (sale_price) 
WHERE sale_price IS NOT NULL;

-- Optional: Copy existing product sale prices to variants as default values (one-time migration)
-- Uncomment the following if you want to backfill existing variants with their product's sale price
/*
UPDATE public.variants v
SET sale_price = p.sale_price
FROM public.products p
WHERE v.product_id = p.id 
AND v.sale_price IS NULL;
*/
