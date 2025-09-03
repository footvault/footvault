-- ============================================
-- ENHANCED PAYOUT SYSTEM FOR CUSTOM PAYMENT METHODS
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. Create custom_payment_methods table to store user's saved payment methods
CREATE TABLE IF NOT EXISTS custom_payment_methods (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  method_name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, method_name)
);

-- 2. Create payout_transactions table to track individual payout transactions
CREATE TABLE IF NOT EXISTS payout_transactions (
  id SERIAL PRIMARY KEY,
  consignor_id INTEGER REFERENCES consignors(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  total_amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(100) NOT NULL,
  payout_date DATE NOT NULL,
  transaction_reference VARCHAR(255), -- For transaction IDs, reference numbers, etc.
  notes TEXT,
  status VARCHAR(50) DEFAULT 'completed', -- completed, pending, failed, cancelled
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_payout_status CHECK (status IN ('completed', 'pending', 'failed', 'cancelled')),
  CONSTRAINT positive_amount CHECK (total_amount > 0)
);

-- 3. Create payout_transaction_items table to link sales to payouts
CREATE TABLE IF NOT EXISTS payout_transaction_items (
  id SERIAL PRIMARY KEY,
  payout_transaction_id INTEGER REFERENCES payout_transactions(id) ON DELETE CASCADE,
  consignment_sale_id INTEGER REFERENCES consignment_sales(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT positive_item_amount CHECK (amount > 0)
);

-- 4. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_custom_payment_methods_user_id ON custom_payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_payout_transactions_consignor_id ON payout_transactions(consignor_id);
CREATE INDEX IF NOT EXISTS idx_payout_transactions_user_id ON payout_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payout_transactions_date ON payout_transactions(payout_date);
CREATE INDEX IF NOT EXISTS idx_payout_transaction_items_payout_id ON payout_transaction_items(payout_transaction_id);
CREATE INDEX IF NOT EXISTS idx_payout_transaction_items_sale_id ON payout_transaction_items(consignment_sale_id);

-- 5. Enable RLS (Row Level Security) policies
ALTER TABLE custom_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_transaction_items ENABLE ROW LEVEL SECURITY;

-- Custom payment methods policies
CREATE POLICY "Users can view their own payment methods" ON custom_payment_methods
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payment methods" ON custom_payment_methods
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payment methods" ON custom_payment_methods
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own payment methods" ON custom_payment_methods
  FOR DELETE USING (auth.uid() = user_id);

-- Payout transactions policies
CREATE POLICY "Users can view their own payout transactions" ON payout_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own payout transactions" ON payout_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payout transactions" ON payout_transactions
  FOR UPDATE USING (auth.uid() = user_id);

-- Payout transaction items policies
CREATE POLICY "Users can view their own payout items" ON payout_transaction_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM payout_transactions pt 
      WHERE pt.id = payout_transaction_items.payout_transaction_id 
      AND pt.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own payout items" ON payout_transaction_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM payout_transactions pt 
      WHERE pt.id = payout_transaction_items.payout_transaction_id 
      AND pt.user_id = auth.uid()
    )
  );

-- 6. Create functions for automatic updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_custom_payment_methods_updated_at 
  BEFORE UPDATE ON custom_payment_methods 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Create view for payout history with proper grouping
CREATE OR REPLACE VIEW consignor_payout_history AS
SELECT 
    pt.consignor_id,
    pt.payout_date,
    pt.payment_method,
    pt.total_amount as payout_amount,
    pt.transaction_reference,
    pt.notes,
    pt.id as payout_id,
    pt.created_at,
    c.name as consignor_name,
    c.user_id
FROM payout_transactions pt
JOIN consignors c ON c.id = pt.consignor_id
WHERE pt.status = 'completed'
ORDER BY pt.payout_date DESC, pt.created_at DESC;

-- 8. Create function to get grouped payout history for portal
CREATE OR REPLACE FUNCTION get_consignor_payout_groups(consignor_id_param INTEGER)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT JSON_AGG(
        JSON_BUILD_OBJECT(
            'payout_date', payout_date,
            'total_amount', total_amount,
            'payouts', payouts
        )
    )
    INTO result
    FROM (
        SELECT 
            payout_date,
            SUM(payout_amount) as total_amount,
            JSON_AGG(
                JSON_BUILD_OBJECT(
                    'id', payout_id::text,
                    'payout_amount', payout_amount,
                    'payout_date', payout_date::text,
                    'payment_method', payment_method
                )
                ORDER BY created_at DESC
            ) as payouts
        FROM consignor_payout_history
        WHERE consignor_id = consignor_id_param
        GROUP BY payout_date
        ORDER BY payout_date DESC
    ) grouped_payouts;
    
    RETURN COALESCE(result, '[]'::JSON);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
