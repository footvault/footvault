-- Add isArchived column to consignors table
ALTER TABLE public.consignors 
ADD COLUMN IF NOT EXISTS isArchived BOOLEAN NOT NULL DEFAULT false;

-- Create index for better performance when filtering archived/active consignors
CREATE INDEX IF NOT EXISTS idx_consignors_isarchived ON public.consignors(isArchived);

-- Update any existing consignors with status 'inactive' to be archived
UPDATE public.consignors 
SET isArchived = true 
WHERE status = 'inactive';

-- Add comment to the column
COMMENT ON COLUMN public.consignors.isArchived IS 'Indicates if the consignor is archived (soft deleted)';

-- Drop and recreate the consignor_dashboard_stats view to include isArchived column
DROP VIEW IF EXISTS consignor_dashboard_stats;

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
