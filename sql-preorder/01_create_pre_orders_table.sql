-- Create pre_orders table
CREATE TABLE public.pre_orders (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES variants(id) ON DELETE SET NULL, -- NULL if no specific variant yet
    
    -- Order details
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    size VARCHAR(10),
    size_label VARCHAR(20) DEFAULT 'US',
    
    -- Pricing
    unit_price NUMERIC(10, 2) NOT NULL,
    total_amount NUMERIC(12, 2) NOT NULL,
    down_payment NUMERIC(12, 2) DEFAULT 0.00,
    remaining_balance NUMERIC(12, 2) GENERATED ALWAYS AS (total_amount - down_payment) STORED,
    
    -- Status and dates
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'confirmed', 'completed', 'canceled', 'voided', 'refunded')
    ),
    pre_order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    completed_date DATE,
    
    -- Notes and metadata
    notes TEXT,
    internal_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT pre_orders_down_payment_check CHECK (down_payment >= 0 AND down_payment <= total_amount)
);

-- Indexes for performance
CREATE INDEX idx_pre_orders_user_id ON public.pre_orders (user_id);
CREATE INDEX idx_pre_orders_customer_id ON public.pre_orders (customer_id);
CREATE INDEX idx_pre_orders_product_id ON public.pre_orders (product_id);
CREATE INDEX idx_pre_orders_variant_id ON public.pre_orders (variant_id);
CREATE INDEX idx_pre_orders_status ON public.pre_orders (status);
CREATE INDEX idx_pre_orders_pre_order_date ON public.pre_orders (pre_order_date);
CREATE INDEX idx_pre_orders_expected_delivery ON public.pre_orders (expected_delivery_date);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_pre_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pre_orders_updated_at
    BEFORE UPDATE ON pre_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_pre_orders_updated_at();
