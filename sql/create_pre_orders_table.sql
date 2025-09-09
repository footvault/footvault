-- Create pre_orders table for customer pre-orders
CREATE TABLE IF NOT EXISTS pre_orders (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id BIGINT REFERENCES variants(id) ON DELETE SET NULL,
    size TEXT,
    size_label TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'voided', 'canceled', 'fulfilled', 'delivered')),
    cost_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(10,2) NOT NULL,
    down_payment DECIMAL(10,2) DEFAULT 0.00,
    remaining_balance DECIMAL(10,2) NOT NULL,
    expected_delivery_date DATE,
    completed_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pre_orders_customer_id ON pre_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_pre_orders_product_id ON pre_orders(product_id);
CREATE INDEX IF NOT EXISTS idx_pre_orders_user_id ON pre_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_pre_orders_status ON pre_orders(status);
CREATE INDEX IF NOT EXISTS idx_pre_orders_created_at ON pre_orders(created_at);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_pre_orders_updated_at BEFORE UPDATE ON pre_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE pre_orders ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own pre-orders
CREATE POLICY "Users can manage their own pre-orders" ON pre_orders
    FOR ALL USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON pre_orders TO authenticated;
GRANT ALL ON pre_orders TO service_role;
