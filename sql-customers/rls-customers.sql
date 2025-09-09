-- Row Level Security (RLS) Policies for Customers Table
-- This file should be run after creating the customers table

-- Enable RLS on customers table
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Policy for SELECT: Users can only see customers they created
CREATE POLICY "Users can view their own customers" ON customers
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy for INSERT: Users can only insert customers for themselves
CREATE POLICY "Users can insert their own customers" ON customers
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy for UPDATE: Users can only update customers they created
CREATE POLICY "Users can update their own customers" ON customers
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy for DELETE: Users can only delete customers they created (soft delete)
CREATE POLICY "Users can delete their own customers" ON customers
  FOR UPDATE
  USING (auth.uid() = user_id AND is_archived = false)
  WITH CHECK (auth.uid() = user_id);

-- Additional policy for admin/super users (optional)
-- Uncomment if you have admin roles
/*
CREATE POLICY "Admins can manage all customers" ON customers
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );
*/

-- Grant necessary permissions
GRANT ALL ON customers TO authenticated;
GRANT USAGE ON SEQUENCE customers_id_seq TO authenticated;

-- Create indexes for performance with RLS
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_user_id_name ON customers(user_id, name);
CREATE INDEX IF NOT EXISTS idx_customers_user_id_email ON customers(user_id, email);
