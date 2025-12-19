-- ================================================================
-- PRODUCTION MIGRATION - December 19, 2025
-- ================================================================
-- This migration includes:
-- 1. Add location_id UUID column to variants (replaces text-based location)
-- 2. Add per-variant payout method columns
-- 3. Fix consignment_sales payout_status constraint for refunds
-- ================================================================

BEGIN;

-- ================================================================
-- PART 1: Add location_id column to variants table
-- ================================================================
DO $$ 
BEGIN
    -- Add location_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'variants' AND column_name = 'location_id'
    ) THEN
        ALTER TABLE public.variants 
        ADD COLUMN location_id UUID NULL;
        
        RAISE NOTICE 'Added location_id column to variants table';
    ELSE
        RAISE NOTICE 'location_id column already exists in variants table';
    END IF;
END $$;

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'variants_location_id_fkey'
    ) THEN
        ALTER TABLE public.variants 
        ADD CONSTRAINT variants_location_id_fkey 
        FOREIGN KEY (location_id) 
        REFERENCES custom_locations (id) 
        ON DELETE SET NULL;
        
        RAISE NOTICE 'Added foreign key constraint for location_id';
    ELSE
        RAISE NOTICE 'Foreign key constraint already exists';
    END IF;
END $$;

-- Add index for location_id queries
CREATE INDEX IF NOT EXISTS idx_variants_location_id 
ON public.variants USING btree (location_id);

-- Migrate existing text-based location data to location_id
-- This will match location names to custom_locations.name and populate location_id
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Update variants with matching custom_locations
    UPDATE variants v
    SET location_id = cl.id
    FROM custom_locations cl
    WHERE v.location = cl.name
      AND v.user_id = cl.user_id
      AND v.location_id IS NULL
      AND v.location IS NOT NULL;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Migrated % variants to use location_id', v_count;
END $$;

-- ================================================================
-- PART 2: Add per-variant payout method columns to variants
-- ================================================================
DO $$
BEGIN
    -- Add payout_method column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'variants' AND column_name = 'payout_method'
    ) THEN
        ALTER TABLE public.variants 
        ADD COLUMN payout_method VARCHAR(30) NULL;
        
        RAISE NOTICE 'Added payout_method column to variants table';
    ELSE
        RAISE NOTICE 'payout_method column already exists';
    END IF;

    -- Add fixed_markup column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'variants' AND column_name = 'fixed_markup'
    ) THEN
        ALTER TABLE public.variants 
        ADD COLUMN fixed_markup NUMERIC(10, 2) NULL;
        
        RAISE NOTICE 'Added fixed_markup column to variants table';
    ELSE
        RAISE NOTICE 'fixed_markup column already exists';
    END IF;

    -- Add markup_percentage column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'variants' AND column_name = 'markup_percentage'
    ) THEN
        ALTER TABLE public.variants 
        ADD COLUMN markup_percentage NUMERIC(5, 2) NULL;
        
        RAISE NOTICE 'Added markup_percentage column to variants table';
    ELSE
        RAISE NOTICE 'markup_percentage column already exists';
    END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN public.variants.payout_method IS 'Per-variant payout method for consignment: percentage_split, cost_price, cost_plus_fixed, cost_plus_percentage';
COMMENT ON COLUMN public.variants.fixed_markup IS 'Fixed markup amount for cost_plus_fixed payout method';
COMMENT ON COLUMN public.variants.markup_percentage IS 'Markup percentage for cost_plus_percentage payout method';

-- Add index for payout_method queries
CREATE INDEX IF NOT EXISTS idx_variants_payout_method 
ON public.variants USING btree (payout_method) 
WHERE payout_method IS NOT NULL;

-- ================================================================
-- PART 3: Fix consignment_sales payout_status constraint
-- ================================================================
DO $$
BEGIN
    -- Drop existing constraint
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'valid_payout_status' 
        AND table_name = 'consignment_sales'
    ) THEN
        ALTER TABLE public.consignment_sales 
        DROP CONSTRAINT valid_payout_status;
        
        RAISE NOTICE 'Dropped old valid_payout_status constraint';
    END IF;

    -- Add new constraint with 'refunded' and 'cancelled' statuses
    ALTER TABLE public.consignment_sales 
    ADD CONSTRAINT valid_payout_status 
    CHECK (
        payout_status IN ('pending', 'paid', 'cancelled', 'refunded')
    );
    
    RAISE NOTICE 'Added updated valid_payout_status constraint with refunded and cancelled statuses';
END $$;

-- ================================================================
-- VERIFY MIGRATION
-- ================================================================
DO $$
DECLARE
    location_id_exists BOOLEAN;
    payout_method_exists BOOLEAN;
    constraint_valid BOOLEAN;
    migrated_count INTEGER;
BEGIN
    -- Check location_id column
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'variants' AND column_name = 'location_id'
    ) INTO location_id_exists;
    
    -- Check payout_method column
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'variants' AND column_name = 'payout_method'
    ) INTO payout_method_exists;
    
    -- Check constraint
    SELECT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage 
        WHERE constraint_name = 'valid_payout_status'
    ) INTO constraint_valid;
    
    -- Count migrated variants
    SELECT COUNT(*) INTO migrated_count
    FROM variants
    WHERE location_id IS NOT NULL;
    
    -- Report verification results
    RAISE NOTICE '========================================';
    RAISE NOTICE 'MIGRATION VERIFICATION RESULTS:';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'location_id column exists: %', location_id_exists;
    RAISE NOTICE 'payout_method column exists: %', payout_method_exists;
    RAISE NOTICE 'valid_payout_status constraint exists: %', constraint_valid;
    RAISE NOTICE 'Variants with location_id populated: %', migrated_count;
    RAISE NOTICE '========================================';
    
    IF location_id_exists AND payout_method_exists AND constraint_valid THEN
        RAISE NOTICE '✅ Migration completed successfully!';
    ELSE
        RAISE WARNING '⚠️ Some migration steps may have failed. Please review.';
    END IF;
END $$;

COMMIT;

-- ================================================================
-- ROLLBACK SCRIPT (Keep for emergency use)
-- ================================================================
-- Uncomment and run this section ONLY if you need to rollback the migration
/*
BEGIN;

-- Rollback Part 3: Restore original payout_status constraint
ALTER TABLE public.consignment_sales DROP CONSTRAINT IF EXISTS valid_payout_status;
ALTER TABLE public.consignment_sales 
ADD CONSTRAINT valid_payout_status 
CHECK (payout_status IN ('pending', 'paid'));

-- Rollback Part 2: Remove payout method columns
ALTER TABLE public.variants DROP COLUMN IF EXISTS payout_method;
ALTER TABLE public.variants DROP COLUMN IF EXISTS fixed_markup;
ALTER TABLE public.variants DROP COLUMN IF EXISTS markup_percentage;
DROP INDEX IF EXISTS idx_variants_payout_method;

-- Rollback Part 1: Remove location_id
-- Note: This will NOT restore the old location text values
ALTER TABLE public.variants DROP COLUMN IF EXISTS location_id;
DROP INDEX IF EXISTS idx_variants_location_id;

COMMIT;
*/
