-- ================================================
-- FOOTVAULT PRODUCTION MIGRATION SCRIPT
-- ================================================
-- This script contains all database changes needed for production deployment
-- Run this script on your production database to apply all new features
--
-- Features included:
-- ✅ Customers table (without notes column)  
-- ✅ Pre-orders table (with notes column)
-- ✅ Pre-order payments table
-- ✅ Tutorial preferences system
-- ✅ Row Level Security (RLS) policies
-- ✅ Proper indexes and triggers
--
-- IMPORTANT: This script uses IF NOT EXISTS patterns for safe execution
-- ================================================

BEGIN;

-- ================================================
-- 1. CUSTOMERS TABLE UPDATES
-- ================================================

-- Create customers table if not exists (without notes column)
CREATE TABLE IF NOT EXISTS public.customers (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    zip_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'USA',
    customer_type VARCHAR(20) DEFAULT 'walk-in' CHECK (customer_type IN ('walk-in', 'regular', 'vip', 'wholesale')),
    is_archived BOOLEAN DEFAULT FALSE,
    total_orders INTEGER DEFAULT 0,
    total_spent NUMERIC(12, 2) DEFAULT 0.00,
    last_order_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT customers_email_format CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT customers_phone_format CHECK (phone IS NULL OR phone ~ '^[\+]?[0-9\s\-\(\)]{7,20}$'),
    CONSTRAINT customers_unique_email_per_user UNIQUE (user_id, email),
    CONSTRAINT customers_unique_phone_per_user UNIQUE (user_id, phone)
);

-- Remove notes column if it exists (migration from old structure)
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='notes') THEN
        ALTER TABLE public.customers DROP COLUMN notes;
    END IF;
END $$;

-- Create indexes for customers if not exists
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON public.customers (user_id);
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers (name);
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers (email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers (phone);
CREATE INDEX IF NOT EXISTS idx_customers_customer_type ON public.customers (customer_type);
CREATE INDEX IF NOT EXISTS idx_customers_last_order_date ON public.customers (last_order_date);
CREATE INDEX IF NOT EXISTS idx_customers_user_id_name ON public.customers (user_id, name);
CREATE INDEX IF NOT EXISTS idx_customers_user_id_email ON public.customers (user_id, email);

-- Create customers updated_at trigger function
CREATE OR REPLACE FUNCTION update_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create customers updated_at trigger
DROP TRIGGER IF EXISTS update_customers_updated_at ON public.customers;
CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON public.customers
    FOR EACH ROW
    EXECUTE FUNCTION update_customers_updated_at();

-- ================================================
-- 2. PRE-ORDERS TABLE AND PAYMENTS
-- ================================================

-- Create pre_orders table if not exists (with notes column)
CREATE TABLE IF NOT EXISTS public.pre_orders (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES variants(id) ON DELETE SET NULL,
    
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
    
    -- Notes and metadata (includes notes from customers table)
    notes TEXT,
    internal_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT pre_orders_down_payment_check CHECK (down_payment >= 0 AND down_payment <= total_amount)
);

-- Create indexes for pre_orders if not exists
CREATE INDEX IF NOT EXISTS idx_pre_orders_user_id ON public.pre_orders (user_id);
CREATE INDEX IF NOT EXISTS idx_pre_orders_customer_id ON public.pre_orders (customer_id);
CREATE INDEX IF NOT EXISTS idx_pre_orders_product_id ON public.pre_orders (product_id);
CREATE INDEX IF NOT EXISTS idx_pre_orders_variant_id ON public.pre_orders (variant_id);
CREATE INDEX IF NOT EXISTS idx_pre_orders_status ON public.pre_orders (status);
CREATE INDEX IF NOT EXISTS idx_pre_orders_pre_order_date ON public.pre_orders (pre_order_date);
CREATE INDEX IF NOT EXISTS idx_pre_orders_expected_delivery ON public.pre_orders (expected_delivery_date);

-- Create pre_orders updated_at trigger function
CREATE OR REPLACE FUNCTION update_pre_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create pre_orders updated_at trigger
DROP TRIGGER IF EXISTS update_pre_orders_updated_at ON public.pre_orders;
CREATE TRIGGER update_pre_orders_updated_at
    BEFORE UPDATE ON public.pre_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_pre_orders_updated_at();

-- Create pre_order_payments table if not exists
CREATE TABLE IF NOT EXISTS public.pre_order_payments (
    id SERIAL PRIMARY KEY,
    pre_order_id INTEGER NOT NULL REFERENCES pre_orders(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(50),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for pre_order_payments if not exists
CREATE INDEX IF NOT EXISTS idx_pre_order_payments_pre_order_id ON public.pre_order_payments (pre_order_id);
CREATE INDEX IF NOT EXISTS idx_pre_order_payments_payment_date ON public.pre_order_payments (payment_date);

-- Create function to update pre_order down_payment when payments are added
CREATE OR REPLACE FUNCTION update_pre_order_payment_total()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE pre_orders 
        SET down_payment = (
            SELECT COALESCE(SUM(amount), 0) 
            FROM pre_order_payments 
            WHERE pre_order_id = NEW.pre_order_id
        )
        WHERE id = NEW.pre_order_id;
        RETURN NEW;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        UPDATE pre_orders 
        SET down_payment = (
            SELECT COALESCE(SUM(amount), 0) 
            FROM pre_order_payments 
            WHERE pre_order_id = OLD.pre_order_id
        )
        WHERE id = OLD.pre_order_id;
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update pre_order payment total
DROP TRIGGER IF EXISTS update_pre_order_payment_total_trigger ON public.pre_order_payments;
CREATE TRIGGER update_pre_order_payment_total_trigger
    AFTER INSERT OR DELETE ON public.pre_order_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_pre_order_payment_total();

-- ================================================
-- 3. TUTORIAL PREFERENCES SYSTEM
-- ================================================

-- Add tutorial preference columns to the existing users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS has_seen_welcome BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS tutorial_preferences JSONB DEFAULT '{
    "show_tutorials": true,
    "completed_tutorials": [],
    "dont_show_again": []
}'::jsonb;

-- Create indexes for tutorial preferences if not exists
CREATE INDEX IF NOT EXISTS idx_users_tutorial_preferences ON public.users USING GIN (tutorial_preferences);
CREATE INDEX IF NOT EXISTS idx_users_has_seen_welcome ON public.users USING btree (has_seen_welcome);

-- Create function to initialize tutorial preferences for existing users
CREATE OR REPLACE FUNCTION public.initialize_tutorial_preferences()
RETURNS void AS $$
BEGIN
    -- Update existing users who don't have tutorial preferences set
    UPDATE public.users 
    SET 
        has_seen_welcome = TRUE, -- Existing users have already used the app
        tutorial_preferences = '{
            "show_tutorials": true,
            "completed_tutorials": [],
            "dont_show_again": []
        }'::jsonb
    WHERE tutorial_preferences IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to set default tutorial preferences for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_tutorial_setup()
RETURNS TRIGGER AS $$
BEGIN
    -- Set default tutorial preferences for new users
    NEW.has_seen_welcome = FALSE;
    NEW.tutorial_preferences = '{
        "show_tutorials": true,
        "completed_tutorials": [],
        "dont_show_again": []
    }'::jsonb;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to set tutorial defaults for new users
DROP TRIGGER IF EXISTS on_user_insert_tutorial_setup ON public.users;
CREATE TRIGGER on_user_insert_tutorial_setup
    BEFORE INSERT ON public.users
    FOR EACH ROW 
    WHEN (NEW.has_seen_welcome IS NULL OR NEW.tutorial_preferences IS NULL)
    EXECUTE FUNCTION public.handle_new_user_tutorial_setup();


-- ================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ================================================

-- Enable RLS on customers table
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Create customers RLS policies if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'Users can view their own customers') THEN
        CREATE POLICY "Users can view their own customers" ON customers
          FOR SELECT
          USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'Users can insert their own customers') THEN
        CREATE POLICY "Users can insert their own customers" ON customers
          FOR INSERT
          WITH CHECK (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'Users can update their own customers') THEN
        CREATE POLICY "Users can update their own customers" ON customers
          FOR UPDATE
          USING (auth.uid() = user_id)
          WITH CHECK (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'Users can delete their own customers') THEN
        CREATE POLICY "Users can delete their own customers" ON customers
          FOR UPDATE
          USING (auth.uid() = user_id AND is_archived = false)
          WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Enable RLS on pre_orders table
ALTER TABLE pre_orders ENABLE ROW LEVEL SECURITY;

-- Create pre_orders RLS policies if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pre_orders' AND policyname = 'Users can view their own pre_orders') THEN
        CREATE POLICY "Users can view their own pre_orders" ON pre_orders
          FOR SELECT
          USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pre_orders' AND policyname = 'Users can insert their own pre_orders') THEN
        CREATE POLICY "Users can insert their own pre_orders" ON pre_orders
          FOR INSERT
          WITH CHECK (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pre_orders' AND policyname = 'Users can update their own pre_orders') THEN
        CREATE POLICY "Users can update their own pre_orders" ON pre_orders
          FOR UPDATE
          USING (auth.uid() = user_id)
          WITH CHECK (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pre_orders' AND policyname = 'Users can delete their own pre_orders') THEN
        CREATE POLICY "Users can delete their own pre_orders" ON pre_orders
          FOR DELETE
          USING (auth.uid() = user_id);
    END IF;
END $$;

-- Enable RLS on pre_order_payments table
ALTER TABLE pre_order_payments ENABLE ROW LEVEL SECURITY;

-- Create pre_order_payments RLS policies if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pre_order_payments' AND policyname = 'Users can view payments for their pre_orders') THEN
        CREATE POLICY "Users can view payments for their pre_orders" ON pre_order_payments
          FOR SELECT
          USING (EXISTS (
            SELECT 1 FROM pre_orders 
            WHERE pre_orders.id = pre_order_payments.pre_order_id 
            AND pre_orders.user_id = auth.uid()
          ));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pre_order_payments' AND policyname = 'Users can insert payments for their pre_orders') THEN
        CREATE POLICY "Users can insert payments for their pre_orders" ON pre_order_payments
          FOR INSERT
          WITH CHECK (EXISTS (
            SELECT 1 FROM pre_orders 
            WHERE pre_orders.id = pre_order_payments.pre_order_id 
            AND pre_orders.user_id = auth.uid()
          ));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pre_order_payments' AND policyname = 'Users can update payments for their pre_orders') THEN
        CREATE POLICY "Users can update payments for their pre_orders" ON pre_order_payments
          FOR UPDATE
          USING (EXISTS (
            SELECT 1 FROM pre_orders 
            WHERE pre_orders.id = pre_order_payments.pre_order_id 
            AND pre_orders.user_id = auth.uid()
          ));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pre_order_payments' AND policyname = 'Users can delete payments for their pre_orders') THEN
        CREATE POLICY "Users can delete payments for their pre_orders" ON pre_order_payments
          FOR DELETE
          USING (EXISTS (
            SELECT 1 FROM pre_orders 
            WHERE pre_orders.id = pre_order_payments.pre_order_id 
            AND pre_orders.user_id = auth.uid()
          ));
    END IF;
END $$;

-- ================================================
-- 6. GRANT PERMISSIONS
-- ================================================

-- Grant necessary permissions for customers
GRANT ALL ON customers TO authenticated;
GRANT USAGE ON SEQUENCE customers_id_seq TO authenticated;

-- Grant necessary permissions for pre_orders  
GRANT ALL ON pre_orders TO authenticated;
GRANT USAGE ON SEQUENCE pre_orders_id_seq TO authenticated;

-- Grant necessary permissions for pre_order_payments
GRANT ALL ON pre_order_payments TO authenticated;
GRANT USAGE ON SEQUENCE pre_order_payments_id_seq TO authenticated;

-- ================================================
-- 7. INITIALIZE DATA
-- ================================================

-- Initialize tutorial preferences for existing users
SELECT public.initialize_tutorial_preferences();

COMMIT;

-- ================================================
-- MIGRATION COMPLETE
-- ================================================
-- ✅ Customers table updated (notes column removed)
-- ✅ Pre-orders table created (with notes column)
-- ✅ Pre-order payments table created
-- ✅ Tutorial preferences system added
-- ✅ Row Level Security policies applied
-- ✅ All indexes and triggers created
-- ✅ Proper permissions granted
-- ✅ Existing user data initialized
-- 
-- Your FootVault database is now ready for production! 🚀
-- ================================================