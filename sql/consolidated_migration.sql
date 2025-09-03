-- ============================================
-- FOOTVAULT CONSIGNMENT SYSTEM - CONSOLIDATED MIGRATION
-- Run this entire script in your production Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. CREATE CONSIGNORS TABLE
-- ============================================

-- Create consignors table (basic structure)
CREATE TABLE IF NOT EXISTS consignors (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  commission_rate DECIMAL(5,2) DEFAULT 20.00,
  payment_method VARCHAR(100) DEFAULT 'PayPal',
  notes TEXT,
  status VARCHAR(50) DEFAULT 'active',
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_commission_rate CHECK (commission_rate >= 0 AND commission_rate <= 100),
  CONSTRAINT valid_status CHECK (status IN ('active', 'inactive'))
);

-- ============================================
-- 2. ADD NEW COLUMNS TO CONSIGNORS
-- ============================================

-- Add archive column
ALTER TABLE consignors 
ADD COLUMN IF NOT EXISTS isArchived BOOLEAN NOT NULL DEFAULT false;

-- Add portal password column
ALTER TABLE consignors 
ADD COLUMN IF NOT EXISTS portal_password TEXT;

-- Add payout method columns
ALTER TABLE consignors 
ADD COLUMN IF NOT EXISTS payout_method TEXT DEFAULT 'percentage_split' 
CHECK (payout_method IN ('cost_price', 'cost_plus_fixed', 'cost_plus_percentage', 'percentage_split'));

ALTER TABLE consignors 
ADD COLUMN IF NOT EXISTS fixed_markup NUMERIC(10,2) DEFAULT 0.00;

ALTER TABLE consignors 
ADD COLUMN IF NOT EXISTS markup_percentage NUMERIC(5,2) DEFAULT 0.00;

-- ============================================
-- 3. UPDATE EXISTING DATA
-- ============================================

-- Update existing consignors to use percentage_split method
UPDATE consignors SET payout_method = 'percentage_split' WHERE payout_method IS NULL;

-- Update any existing consignors with status 'inactive' to be archived
UPDATE consignors 
SET isArchived = true 
WHERE status = 'inactive';

-- Remove payment method constraint to allow custom values
ALTER TABLE consignors 
DROP CONSTRAINT IF EXISTS valid_payment_method;

-- ============================================
-- 4. ADD COLUMNS TO VARIANTS TABLE
-- ============================================

-- Add owner tracking to variants table
ALTER TABLE variants 
ADD COLUMN IF NOT EXISTS owner_type VARCHAR(20) DEFAULT 'store',
ADD COLUMN IF NOT EXISTS consignor_id INTEGER REFERENCES consignors(id) ON DELETE SET NULL;

-- ============================================
-- 5. CREATE CONSIGNMENT SALES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS consignment_sales (
  id SERIAL PRIMARY KEY,
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES variants(id) ON DELETE CASCADE,
  consignor_id INTEGER REFERENCES consignors(id) ON DELETE CASCADE,
  sale_price DECIMAL(10,2) NOT NULL,
  commission_rate DECIMAL(5,2) NOT NULL,
  store_commission DECIMAL(10,2) NOT NULL,
  consignor_payout DECIMAL(10,2) NOT NULL,
  payout_status VARCHAR(50) DEFAULT 'pending',
  payout_date DATE,
  payout_method VARCHAR(100),
  notes TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_payout_status CHECK (payout_status IN ('pending', 'paid'))
);

-- ============================================
-- 6. CREATE CUSTOM PAYMENT METHODS TABLE
-- ============================================

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

-- ============================================
-- 7. CREATE PAYOUT TRANSACTION TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS payout_transactions (
  id SERIAL PRIMARY KEY,
  consignor_id INTEGER REFERENCES consignors(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  total_amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(100) NOT NULL,
  payout_date DATE NOT NULL,
  transaction_reference VARCHAR(255),
  notes TEXT,
  status VARCHAR(50) DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_payout_transaction_status CHECK (status IN ('completed', 'pending', 'failed', 'cancelled')),
  CONSTRAINT positive_amount CHECK (total_amount > 0)
);

CREATE TABLE IF NOT EXISTS payout_transaction_items (
  id SERIAL PRIMARY KEY,
  payout_transaction_id INTEGER REFERENCES payout_transactions(id) ON DELETE CASCADE,
  consignment_sale_id INTEGER REFERENCES consignment_sales(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT positive_item_amount CHECK (amount > 0)
);

-- ============================================
-- 8. CREATE INDEXES FOR PERFORMANCE
-- ============================================

-- Consignors indexes
CREATE INDEX IF NOT EXISTS idx_consignors_user_id ON consignors(user_id);
CREATE INDEX IF NOT EXISTS idx_consignors_isarchived ON consignors(isArchived);

-- Variants indexes
CREATE INDEX IF NOT EXISTS idx_variants_owner_type ON variants(owner_type);
CREATE INDEX IF NOT EXISTS idx_variants_consignor_id ON variants(consignor_id);

-- Consignment sales indexes
CREATE INDEX IF NOT EXISTS idx_consignment_sales_consignor_id ON consignment_sales(consignor_id);
CREATE INDEX IF NOT EXISTS idx_consignment_sales_payout_status ON consignment_sales(payout_status);
CREATE INDEX IF NOT EXISTS idx_consignment_sales_user_id ON consignment_sales(user_id);
CREATE INDEX IF NOT EXISTS idx_consignment_sales_sale_id ON consignment_sales(sale_id);
CREATE INDEX IF NOT EXISTS idx_consignment_sales_created_at ON consignment_sales(created_at);

-- Custom payment methods indexes
CREATE INDEX IF NOT EXISTS idx_custom_payment_methods_user_id ON custom_payment_methods(user_id);

-- Payout transaction indexes
CREATE INDEX IF NOT EXISTS idx_payout_transactions_consignor_id ON payout_transactions(consignor_id);
CREATE INDEX IF NOT EXISTS idx_payout_transactions_user_id ON payout_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payout_transactions_date ON payout_transactions(payout_date);
CREATE INDEX IF NOT EXISTS idx_payout_transaction_items_payout_id ON payout_transaction_items(payout_transaction_id);
CREATE INDEX IF NOT EXISTS idx_payout_transaction_items_sale_id ON payout_transaction_items(consignment_sale_id);

-- ============================================
-- 9. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE consignors ENABLE ROW LEVEL SECURITY;
ALTER TABLE consignment_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_transaction_items ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 10. CREATE RLS POLICIES
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own consignors" ON consignors;
DROP POLICY IF EXISTS "Users can insert their own consignors" ON consignors;
DROP POLICY IF EXISTS "Users can update their own consignors" ON consignors;
DROP POLICY IF EXISTS "Users can delete their own consignors" ON consignors;

-- Consignors policies
CREATE POLICY "Users can view their own consignors" ON consignors
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own consignors" ON consignors
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own consignors" ON consignors
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own consignors" ON consignors
  FOR DELETE USING (auth.uid() = user_id);

-- Consignment sales policies
CREATE POLICY "Users can view their own consignment sales" ON consignment_sales
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own consignment sales" ON consignment_sales
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own consignment sales" ON consignment_sales
  FOR UPDATE USING (auth.uid() = user_id);

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

-- ============================================
-- 11. CREATE FUNCTIONS AND TRIGGERS
-- ============================================

-- Create function for automatic updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at columns
CREATE TRIGGER update_consignors_updated_at BEFORE UPDATE ON consignors 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_custom_payment_methods_updated_at 
  BEFORE UPDATE ON custom_payment_methods 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 12. CREATE VIEWS
-- ============================================

-- Drop existing view if it exists
DROP VIEW IF EXISTS consignor_dashboard_stats;

-- Create enhanced consignor dashboard stats view
CREATE VIEW consignor_dashboard_stats AS
SELECT 
    c.id,
    c.name,
    c.email,
    c.phone,
    c.commission_rate,
    c.status,
    c.isArchived,
    c.payment_method,
    c.payout_method,
    c.fixed_markup,
    c.markup_percentage,
    c.created_at,
    c.updated_at,
    COUNT(DISTINCT v.id) as total_variants,
    COUNT(DISTINCT CASE WHEN v.status = 'Available' THEN v.id END) as available_variants,
    COUNT(DISTINCT CASE WHEN v.status != 'Available' THEN v.id END) as sold_variants,
    COUNT(DISTINCT cs.id) as total_sales,
    COALESCE(SUM(cs.sale_price), 0) as total_sales_amount,
    COALESCE(SUM(cs.consignor_payout), 0) as total_earned,
    COALESCE(SUM(CASE WHEN cs.payout_status = 'pending' THEN cs.consignor_payout ELSE 0 END), 0) as pending_payout,
    COALESCE(SUM(CASE WHEN cs.payout_status = 'paid' THEN cs.consignor_payout ELSE 0 END), 0) as paid_out,
    c.user_id
FROM consignors c
LEFT JOIN variants v ON v.consignor_id = c.id AND v.owner_type = 'consignor'
LEFT JOIN consignment_sales cs ON cs.consignor_id = c.id
GROUP BY c.id, c.name, c.email, c.phone, c.commission_rate, c.status, c.isArchived, 
         c.payment_method, c.payout_method, c.fixed_markup, c.markup_percentage, 
         c.created_at, c.updated_at, c.user_id;

-- Create payout history view
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

-- ============================================
-- 13. CREATE UTILITY FUNCTIONS
-- ============================================

-- Function to calculate sale splits
CREATE OR REPLACE FUNCTION calculate_sale_split(
    sale_price DECIMAL(10,2),
    owner_type VARCHAR(20),
    commission_rate DECIMAL(5,2) DEFAULT 20.00
)
RETURNS JSON AS $$
DECLARE
    store_commission DECIMAL(10,2);
    consignor_payout DECIMAL(10,2);
BEGIN
    IF owner_type = 'store' THEN
        -- Store owns it, keeps everything
        RETURN json_build_object(
            'sale_price', sale_price,
            'owner_type', 'store',
            'store_gets', sale_price,
            'consignor_gets', 0
        );
    ELSE
        -- Consignor owns it, calculate split
        store_commission := ROUND(sale_price * (commission_rate / 100), 2);
        consignor_payout := sale_price - store_commission;
        
        RETURN json_build_object(
            'sale_price', sale_price,
            'owner_type', 'consignor',
            'commission_rate', commission_rate,
            'store_gets', store_commission,
            'consignor_gets', consignor_payout
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get grouped payout history for portal
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

-- ============================================
-- 14. ADD COLUMN COMMENTS
-- ============================================

COMMENT ON COLUMN consignors.payout_method IS 'Method for calculating consignor payout: cost_price (cost only), cost_plus_fixed (cost + fixed amount), cost_plus_percentage (cost + percentage markup), percentage_split (traditional commission split)';
COMMENT ON COLUMN consignors.fixed_markup IS 'Fixed dollar amount added to cost price when payout_method is cost_plus_fixed';
COMMENT ON COLUMN consignors.markup_percentage IS 'Percentage markup applied to cost price when payout_method is cost_plus_percentage';
COMMENT ON COLUMN consignors.isArchived IS 'Indicates if the consignor is archived (soft deleted)';

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- Commit all changes
COMMIT;

-- Success message
SELECT 'FootVault Consignment System migration completed successfully!' as status;
