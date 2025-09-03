-- Add payout method columns to consignors table
-- This enables multiple payout calculation methods for consignors

-- Add payout_method column with default value
ALTER TABLE consignors 
ADD COLUMN payout_method TEXT DEFAULT 'percentage_split' 
CHECK (payout_method IN ('cost_price', 'cost_plus_fixed', 'cost_plus_percentage', 'percentage_split'));

-- Add fixed_markup column for cost_plus_fixed method
ALTER TABLE consignors 
ADD COLUMN fixed_markup NUMERIC(10,2) DEFAULT 0.00;

-- Add markup_percentage column for cost_plus_percentage method  
ALTER TABLE consignors 
ADD COLUMN markup_percentage NUMERIC(5,2) DEFAULT 0.00;

-- Add comments for documentation
COMMENT ON COLUMN consignors.payout_method IS 'Method for calculating consignor payout: cost_price (cost only), cost_plus_fixed (cost + fixed amount), cost_plus_percentage (cost + percentage markup), percentage_split (traditional commission split)';
COMMENT ON COLUMN consignors.fixed_markup IS 'Fixed dollar amount added to cost price when payout_method is cost_plus_fixed';
COMMENT ON COLUMN consignors.markup_percentage IS 'Percentage markup applied to cost price when payout_method is cost_plus_percentage';

-- Update existing consignors to use percentage_split method (maintains current behavior)
UPDATE consignors SET payout_method = 'percentage_split' WHERE payout_method IS NULL;

-- Ensure the default value is set correctly
ALTER TABLE consignors ALTER COLUMN payout_method SET DEFAULT 'percentage_split';
