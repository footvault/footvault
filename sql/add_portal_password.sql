-- Add portal_password field to consignors table
ALTER TABLE consignors 
ADD COLUMN portal_password TEXT;
