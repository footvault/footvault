-- ============================================
-- SIMPLIFIED CONSIGNOR SYSTEM DATABASE SCHEMA
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. Create consignors table (simplified)
CREATE TABLE IF NOT EXISTS consignors (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  commission_rate DECIMAL(5,2) DEFAULT 20.00, -- Default 20% commission (store keeps this %)
  payment_method VARCHAR(100) DEFAULT 'PayPal',
  notes TEXT,
  status VARCHAR(50) DEFAULT 'active', -- active, inactive
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Add constraints
  CONSTRAINT valid_commission_rate CHECK (commission_rate >= 0 AND commission_rate <= 100),
  CONSTRAINT valid_status CHECK (status IN ('active', 'inactive'))
);

-- 2. Simply add owner to variants (this is the key field!)
ALTER TABLE variants 
ADD COLUMN IF NOT EXISTS owner_type VARCHAR(20) DEFAULT 'store', -- 'store' or 'consignor'
ADD COLUMN IF NOT EXISTS consignor_id INTEGER REFERENCES consignors(id) ON DELETE SET NULL;

-- 3. Create simple consignment_sales table to track payouts
CREATE TABLE IF NOT EXISTS consignment_sales (
  id SERIAL PRIMARY KEY,
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES variants(id) ON DELETE CASCADE,
  consignor_id INTEGER REFERENCES consignors(id) ON DELETE CASCADE,
  sale_price DECIMAL(10,2) NOT NULL,
  commission_rate DECIMAL(5,2) NOT NULL,
  store_commission DECIMAL(10,2) NOT NULL, -- What store keeps
  consignor_payout DECIMAL(10,2) NOT NULL, -- What consignor gets
  payout_status VARCHAR(50) DEFAULT 'pending', -- pending, paid
  payout_date DATE,
  payout_method VARCHAR(100),
  notes TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_payout_status CHECK (payout_status IN ('pending', 'paid'))
);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_consignors_user_id ON consignors(user_id);
CREATE INDEX IF NOT EXISTS idx_variants_owner_type ON variants(owner_type);
CREATE INDEX IF NOT EXISTS idx_variants_consignor_id ON variants(consignor_id);
CREATE INDEX IF NOT EXISTS idx_consignment_sales_consignor_id ON consignment_sales(consignor_id);
CREATE INDEX IF NOT EXISTS idx_consignment_sales_payout_status ON consignment_sales(payout_status);

-- 5. Create RLS (Row Level Security) policies
ALTER TABLE consignors ENABLE ROW LEVEL SECURITY;
ALTER TABLE consignment_sales ENABLE ROW LEVEL SECURITY;

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

-- 6. Create function for automatic updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger for updated_at
CREATE TRIGGER update_consignors_updated_at BEFORE UPDATE ON consignors 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Create simple view for consignor dashboard stats
CREATE OR REPLACE VIEW consignor_dashboard_stats AS
SELECT 
    c.id,
    c.name,
    c.email,
    c.phone,
    c.commission_rate,
    c.status,
    COUNT(DISTINCT v.id) as total_variants,
    COUNT(DISTINCT CASE WHEN v.status = 'Available' THEN v.id END) as available_variants,
    COUNT(DISTINCT cs.id) as total_sales,
    COALESCE(SUM(cs.sale_price), 0) as total_sales_amount,
    COALESCE(SUM(cs.consignor_payout), 0) as total_earned,
    COALESCE(SUM(CASE WHEN cs.payout_status = 'pending' THEN cs.consignor_payout ELSE 0 END), 0) as pending_payout,
    COALESCE(SUM(CASE WHEN cs.payout_status = 'paid' THEN cs.consignor_payout ELSE 0 END), 0) as paid_out,
    c.user_id
FROM consignors c
LEFT JOIN variants v ON v.consignor_id = c.id AND v.owner_type = 'consignor'
LEFT JOIN consignment_sales cs ON cs.consignor_id = c.id
GROUP BY c.id, c.name, c.email, c.phone, c.commission_rate, c.status, c.user_id;

-- 8. Function to calculate splits (for reference)
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
        -- Store owns it, keeps everything (minus team profit split handled elsewhere)
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

COMMIT;
