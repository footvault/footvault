-- Create pre_order_payments table to track payment history
CREATE TABLE public.pre_order_payments (
    id SERIAL PRIMARY KEY,
    pre_order_id INTEGER NOT NULL REFERENCES pre_orders(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(50),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Index for performance
CREATE INDEX idx_pre_order_payments_pre_order_id ON public.pre_order_payments (pre_order_id);
CREATE INDEX idx_pre_order_payments_payment_date ON public.pre_order_payments (payment_date);

-- Function to update pre_order down_payment when payments are added
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

-- Trigger to update pre_order payment total
CREATE TRIGGER update_pre_order_payment_total_trigger
    AFTER INSERT OR DELETE ON pre_order_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_pre_order_payment_total();
