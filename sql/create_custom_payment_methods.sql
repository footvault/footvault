-- Create custom payment methods table
-- This allows users to create and reuse custom payment method names

CREATE TABLE IF NOT EXISTS public.custom_payment_methods (
  id SERIAL NOT NULL,
  user_id UUID NULL,
  method_name CHARACTER VARYING(100) NOT NULL,
  description TEXT NULL,
  is_active BOOLEAN NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NULL DEFAULT now(),
  CONSTRAINT custom_payment_methods_pkey PRIMARY KEY (id),
  CONSTRAINT custom_payment_methods_user_id_method_name_key UNIQUE (user_id, method_name),
  CONSTRAINT custom_payment_methods_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_custom_payment_methods_user_id 
ON public.custom_payment_methods 
USING btree (user_id) 
TABLESPACE pg_default;

-- Create trigger to update updated_at column
CREATE TRIGGER update_custom_payment_methods_updated_at 
BEFORE UPDATE ON custom_payment_methods 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies
ALTER TABLE custom_payment_methods ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own custom payment methods
CREATE POLICY "Users can view their own custom payment methods"
ON custom_payment_methods
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can only insert their own custom payment methods
CREATE POLICY "Users can insert their own custom payment methods"
ON custom_payment_methods
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only update their own custom payment methods
CREATE POLICY "Users can update their own custom payment methods"
ON custom_payment_methods
FOR UPDATE
USING (auth.uid() = user_id);

-- Policy: Users can only delete their own custom payment methods
CREATE POLICY "Users can delete their own custom payment methods"
ON custom_payment_methods
FOR DELETE
USING (auth.uid() = user_id);
