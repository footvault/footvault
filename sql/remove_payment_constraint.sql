-- Remove payment method constraint to allow custom values
ALTER TABLE consignors 
DROP CONSTRAINT IF EXISTS valid_payment_method;

-- This allows any payment method value to be stored
COMMIT;
