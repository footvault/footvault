-- Row Level Security (RLS) Policies for Pre_Orders Table
-- This file should be run after creating the pre_orders table

-- Enable RLS on pre_orders table
ALTER TABLE pre_orders ENABLE ROW LEVEL SECURITY;

-- Policy for SELECT: Users can only see pre_orders they created
CREATE POLICY "Users can view their own pre_orders" ON pre_orders
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy for INSERT: Users can only insert pre_orders for themselves
CREATE POLICY "Users can insert their own pre_orders" ON pre_orders
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy for UPDATE: Users can only update pre_orders they created
CREATE POLICY "Users can update their own pre_orders" ON pre_orders
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy for DELETE: Users can only delete pre_orders they created
CREATE POLICY "Users can delete their own pre_orders" ON pre_orders
  FOR DELETE
  USING (auth.uid() = user_id);

-- Additional policy for viewing pre_orders through customer relationship
-- This allows access when joining with customers table
CREATE POLICY "Users can view pre_orders through customers" ON pre_orders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM customers 
      WHERE customers.id = pre_orders.customer_id 
      AND customers.user_id = auth.uid()
    )
  );

-- Additional policy for viewing pre_orders through product relationship
-- This allows access when joining with products table
CREATE POLICY "Users can view pre_orders through products" ON pre_orders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM products 
      WHERE products.id = pre_orders.product_id 
      AND products.user_id = auth.uid()
    )
  );

-- Policy for status transitions (business logic)
-- Basic validation - complex status transition rules should be handled in application code or triggers
CREATE POLICY "Users can update their own pre_order transitions" ON pre_orders
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Grant necessary permissions
GRANT ALL ON pre_orders TO authenticated;
GRANT USAGE ON SEQUENCE pre_orders_id_seq TO authenticated;

-- Create indexes for performance with RLS (most already exist from your table creation)
CREATE INDEX IF NOT EXISTS idx_pre_orders_user_id_status ON pre_orders(user_id, status);
CREATE INDEX IF NOT EXISTS idx_pre_orders_user_id_customer_id ON pre_orders(user_id, customer_id);
