-- Migration Script: Location Text to ID Migration
-- This script migrates the variants.location column from text to UUID foreign key
-- Run this in your Supabase SQL editor

-- ========================================
-- STEP 0: Fix custom_locations unique constraint
-- ========================================

-- Drop the global unique constraint that prevents multiple users from having same location name
ALTER TABLE custom_locations 
DROP CONSTRAINT IF EXISTS custom_locations_name_key;

-- Add a composite unique constraint (name + user_id) so each user can have their own locations
-- Check if constraint already exists before adding
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'custom_locations_name_user_id_key'
    ) THEN
        ALTER TABLE custom_locations 
        ADD CONSTRAINT custom_locations_name_user_id_key 
        UNIQUE (name, user_id);
    END IF;
END $$;

-- ========================================
-- STEP 1: Add location_id column to variants
-- ========================================
ALTER TABLE variants ADD COLUMN IF NOT EXISTS location_id uuid NULL;

-- Add foreign key constraint
ALTER TABLE variants 
DROP CONSTRAINT IF EXISTS variants_location_id_fkey;

ALTER TABLE variants 
ADD CONSTRAINT variants_location_id_fkey 
FOREIGN KEY (location_id) 
REFERENCES custom_locations(id) 
ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_variants_location_id ON variants(location_id);

-- ========================================
-- STEP 2: Create custom_locations for ALL unique location texts per user
-- ========================================

-- This ensures every existing location text has a corresponding custom_location entry
-- Each user gets their own copy of locations with the same name
INSERT INTO custom_locations (name, user_id)
SELECT DISTINCT 
  v.location,
  v.user_id
FROM variants v
WHERE v.location IS NOT NULL 
AND v.location != ''
AND v.user_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM custom_locations cl
  WHERE cl.name = v.location AND cl.user_id = v.user_id
)
ON CONFLICT (name, user_id) DO NOTHING;

-- ========================================
-- STEP 3: Migrate ALL existing location text to location_id
-- ========================================

-- Update ALL variants (In Stock, Pre-order, downpayment) that have location text
UPDATE variants v
SET location_id = cl.id
FROM custom_locations cl
WHERE v.location = cl.name
AND v.user_id = cl.user_id
AND v.location IS NOT NULL
AND v.location != '';

-- ========================================
-- STEP 4: Verify migration by variant type
-- ========================================

-- Show migration statistics by variant type
SELECT 
  COALESCE(v.type, 'NULL type') as variant_type,
  COUNT(*) as total_variants,
  COUNT(v.location_id) as with_location_id,
  COUNT(v.location) FILTER (WHERE v.location IS NOT NULL AND v.location != '') as with_location_text,
  COUNT(*) FILTER (WHERE v.location IS NOT NULL AND v.location != '' AND v.location_id IS NULL) as unmigrated
FROM variants v
GROUP BY v.type
ORDER BY v.type;

-- ========================================
-- STEP 5: Overall migration summary
-- ========================================

SELECT 
  'Total variants' as metric,
  COUNT(*) as count,
  '' as breakdown
FROM variants
UNION ALL
SELECT 
  'Variants with location_id',
  COUNT(*),
  CONCAT(ROUND(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM variants), 0), 2), '%')
FROM variants
WHERE location_id IS NOT NULL
UNION ALL
SELECT 
  'Variants with text location',
  COUNT(*),
  ''
FROM variants
WHERE location IS NOT NULL AND location != ''
UNION ALL
SELECT 
  'Successfully migrated',
  COUNT(*),
  ''
FROM variants
WHERE location IS NOT NULL 
AND location != ''
AND location_id IS NOT NULL
UNION ALL
SELECT 
  'Unmigrated (has text, no ID)',
  COUNT(*),
  ''
FROM variants
WHERE location IS NOT NULL 
AND location != ''
AND location_id IS NULL;

-- ========================================
-- STEP 6: Show any remaining unmigrated variants (if any)
-- ========================================

SELECT 
  v.id,
  v.type,
  v.location as location_text,
  v.location_id,
  v.user_id,
  v.variant_sku
FROM variants v
WHERE v.location IS NOT NULL 
AND v.location != ''
AND v.location_id IS NULL
ORDER BY v.type, v.location
LIMIT 20;

-- ========================================
-- STEP 7: Add comments
-- ========================================

COMMENT ON COLUMN variants.location IS 'DEPRECATED: Use location_id instead. Kept for backward compatibility during transition.';
COMMENT ON COLUMN variants.location_id IS 'Foreign key to custom_locations table. This is the new way to store locations.';
COMMENT ON CONSTRAINT custom_locations_name_user_id_key ON custom_locations IS 'Each user can have their own set of location names. User 1 can have "Warehouse A" and User 2 can also have "Warehouse A".';