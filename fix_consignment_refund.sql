-- Fix consignment_sales payout_status constraint for refunds
-- First, let's check what the current constraint allows
-- Then update the refund_sale function to handle payout_status correctly

-- Option 1: Update the check constraint to allow 'refunded' status
ALTER TABLE consignment_sales 
DROP CONSTRAINT IF EXISTS valid_payout_status;

ALTER TABLE consignment_sales 
ADD CONSTRAINT valid_payout_status 
CHECK (payout_status IN ('pending', 'paid', 'cancelled', 'refunded'));

-- Option 2: Update refund_sale function to set correct payout_status
-- You'll need to find and update your refund_sale function in Supabase
-- to set payout_status = 'refunded' or 'cancelled' when creating reversal records

-- To check your current refund_sale function:
-- SELECT prosrc FROM pg_proc WHERE proname = 'refund_sale';
