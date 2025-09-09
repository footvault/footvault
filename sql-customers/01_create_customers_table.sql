-- Create customers table
CREATE TABLE public.customers (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    zip_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'Philippines',
    customer_type VARCHAR(20) DEFAULT 'regular' CHECK (customer_type IN ('regular', 'vip', 'wholesale')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_archived BOOLEAN DEFAULT FALSE,
    total_orders INTEGER DEFAULT 0,
    total_spent NUMERIC(12, 2) DEFAULT 0.00,
    last_order_date DATE,
    
    -- Constraints
    CONSTRAINT customers_email_phone_check CHECK (email IS NOT NULL OR phone IS NOT NULL),
    CONSTRAINT unique_customer_per_user UNIQUE (user_id, email),
    CONSTRAINT unique_phone_per_user UNIQUE (user_id, phone)
);

-- Indexes for better performance
CREATE INDEX idx_customers_user_id ON public.customers (user_id);
CREATE INDEX idx_customers_name ON public.customers (name);
CREATE INDEX idx_customers_email ON public.customers (email);
CREATE INDEX idx_customers_phone ON public.customers (phone);
CREATE INDEX idx_customers_customer_type ON public.customers (customer_type);
CREATE INDEX idx_customers_last_order_date ON public.customers (last_order_date);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_customers_updated_at();

-- Function to update customer stats
CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update customer total orders and total spent when a sale is made
    IF TG_OP = 'INSERT' THEN
        UPDATE customers 
        SET 
            total_orders = total_orders + 1,
            total_spent = total_spent + NEW.total_amount,
            last_order_date = NEW.sale_date
        WHERE id = NEW.customer_id;
        RETURN NEW;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        UPDATE customers 
        SET 
            total_orders = total_orders - 1,
            total_spent = total_spent - OLD.total_amount
        WHERE id = OLD.customer_id;
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- We'll create the trigger after the sales table modifications
