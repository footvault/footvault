-- Add type column to variants table to distinguish between In Stock and Pre-order items
ALTER TABLE public.variants 
ADD COLUMN type character varying(20) NOT NULL DEFAULT 'In Stock';

-- Add constraint to ensure valid types
ALTER TABLE public.variants 
ADD CONSTRAINT variants_type_check 
CHECK (type IN ('In Stock', 'Pre-order'));

-- Create index for better performance when filtering by type
CREATE INDEX IF NOT EXISTS idx_variants_type ON public.variants USING btree (type);

-- Update existing variants to have proper type based on their notes
-- Items created from pre-orders should be marked as 'Pre-order'
UPDATE public.variants 
SET type = 'Pre-order' 
WHERE notes IS NOT NULL 
  AND (
    notes ILIKE '%pre-order%' 
    OR notes ILIKE '%cancelled pre-order%' 
    OR notes ILIKE '%from pre-order%'
    OR notes ILIKE '%created from pre-order%'
  );

-- All other existing variants remain as 'In Stock' (default)
