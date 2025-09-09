-- Row Level Security (RLS) Policies for Pre_Order_Payments Table
-- This file should be run after creating the pre_order_payments table

-- Enable RLS on pre_order_payments table
ALTER TABLE pre_order_payments ENABLE ROW LEVEL SECURITY;

-- Policy for SELECT: Users can only see payments for their own pre_orders
CREATE POLICY "Users can view payments for their own pre_orders" ON pre_order_payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pre_orders 
      WHERE pre_orders.id = pre_order_payments.pre_order_id 
      AND pre_orders.user_id = auth.uid()
    )
  );

-- Policy for INSERT: Users can only insert payments for their own pre_orders
CREATE POLICY "Users can insert payments for their own pre_orders" ON pre_order_payments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pre_orders 
      WHERE pre_orders.id = pre_order_id 
      AND pre_orders.user_id = auth.uid()
    )
  );

-- Policy for UPDATE: Users can only update payments for their own pre_orders
CREATE POLICY "Users can update payments for their own pre_orders" ON pre_order_payments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM pre_orders 
      WHERE pre_orders.id = pre_order_payments.pre_order_id 
      AND pre_orders.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pre_orders 
      WHERE pre_orders.id = pre_order_payments.pre_order_id 
      AND pre_orders.user_id = auth.uid()
    )
  );

-- Policy for DELETE: Users can only delete payments for their own pre_orders
CREATE POLICY "Users can delete payments for their own pre_orders" ON pre_order_payments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM pre_orders 
      WHERE pre_orders.id = pre_order_payments.pre_order_id 
      AND pre_orders.user_id = auth.uid()
    )
  );

-- Policy for payment validation (business logic)
-- Basic validation - more complex business rules should be handled in application code or triggers
CREATE POLICY "Payment validation for pre_order owners" ON pre_order_payments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM pre_orders 
      WHERE pre_orders.id = pre_order_payments.pre_order_id 
      AND pre_orders.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pre_orders 
      WHERE pre_orders.id = pre_order_payments.pre_order_id 
      AND pre_orders.user_id = auth.uid()
    )
  );

-- Additional policy for viewing payments through customer relationship
-- This allows access when joining through customers -> pre_orders -> payments
CREATE POLICY "Users can view payments through customer pre_orders" ON pre_order_payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pre_orders 
      JOIN customers ON customers.id = pre_orders.customer_id
      WHERE pre_orders.id = pre_order_payments.pre_order_id 
      AND customers.user_id = auth.uid()
    )
  );

-- Additional policy for admin/super users (optional)
-- Uncomment if you have admin roles
/*
CREATE POLICY "Admins can manage all payments" ON pre_order_payments
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
GRANT ALL ON pre_order_payments TO authenticated;
GRANT USAGE ON SEQUENCE pre_order_payments_id_seq TO authenticated;

-- Create indexes for performance with RLS
CREATE INDEX IF NOT EXISTS idx_pre_order_payments_pre_order_id ON pre_order_payments(pre_order_id);
CREATE INDEX IF NOT EXISTS idx_pre_order_payments_payment_date ON pre_order_payments(payment_date);

-- Create compound index for common queries
CREATE INDEX IF NOT EXISTS idx_pre_order_payments_pre_order_date 
ON pre_order_payments(pre_order_id, payment_date DESC);
