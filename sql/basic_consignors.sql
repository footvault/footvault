-- Quick test to create just the basic consignors table if it doesn't exist
-- Run this first in Supabase SQL Editor

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

-- Enable RLS
ALTER TABLE consignors ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then create new ones
DROP POLICY IF EXISTS "Users can view their own consignors" ON consignors;
DROP POLICY IF EXISTS "Users can insert their own consignors" ON consignors;
DROP POLICY IF EXISTS "Users can update their own consignors" ON consignors;
DROP POLICY IF EXISTS "Users can delete their own consignors" ON consignors;

-- Create policies
CREATE POLICY "Users can view their own consignors" ON consignors
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own consignors" ON consignors
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own consignors" ON consignors
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own consignors" ON consignors
  FOR DELETE USING (auth.uid() = user_id);

COMMIT;
