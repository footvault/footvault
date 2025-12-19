-- Add payout method columns to variants table
-- These columns store per-variant payout settings for consignment items

ALTER TABLE public.variants 
ADD COLUMN IF NOT EXISTS payout_method VARCHAR(30) NULL,
ADD COLUMN IF NOT EXISTS fixed_markup NUMERIC(10, 2) NULL,
ADD COLUMN IF NOT EXISTS markup_percentage NUMERIC(5, 2) NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.variants.payout_method IS 'Payout method for consignment: percentage_split, cost_price, cost_plus_fixed, cost_plus_percentage';
COMMENT ON COLUMN public.variants.fixed_markup IS 'Fixed markup amount for cost_plus_fixed payout method';
COMMENT ON COLUMN public.variants.markup_percentage IS 'Markup percentage for cost_plus_percentage payout method';

-- Add index for payout_method queries
CREATE INDEX IF NOT EXISTS idx_variants_payout_method 
ON public.variants USING btree (payout_method) 
WHERE payout_method IS NOT NULL;
