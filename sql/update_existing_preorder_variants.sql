-- Update existing variants that were created from pre-orders to have the correct type
UPDATE public.variants 
SET type = 'Pre-order' 
WHERE notes IS NOT NULL 
  AND (
    notes ILIKE '%pre-order%' 
    OR notes ILIKE '%cancelled pre-order%' 
    OR notes ILIKE '%from pre-order%'
    OR notes ILIKE '%created from pre-order%'
  );
