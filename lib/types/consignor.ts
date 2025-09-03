// TypeScript types for the simplified consignor system
import { Product, Variant } from '@/lib/types';

export interface Consignor {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  commission_rate: number; // Store keeps this percentage
  payment_method: 'PayPal' | 'Bank Transfer' | 'Cash' | 'Check' | 'Venmo' | 'Zelle';
  payout_method: 'cost_price' | 'cost_plus_fixed' | 'cost_plus_percentage' | 'percentage_split';
  fixed_markup?: number; // For cost_plus_fixed method
  markup_percentage?: number; // For cost_plus_percentage method
  notes?: string;
  status: 'active' | 'inactive';
  user_id: string;
  created_at: string;
  updated_at: string;
  portal_password?: string;
}

export interface ConsignmentSale {
  id: number;
  sale_id: string;
  variant_id: string;
  consignor_id: number;
  sale_price: number;
  commission_rate: number;
  store_commission: number; // What store keeps
  consignor_payout: number; // What consignor gets
  payout_status: 'pending' | 'paid';
  payout_date?: string;
  payout_method?: string;
  notes?: string;
  user_id: string;
  created_at: string;
  consignor?: Consignor;
  variant?: Variant & { product?: Product };
}

export interface ConsignorDashboardStats {
  payment_method: string;
  payout_method: string;
  fixed_markup?: number;
  markup_percentage?: number;
  total_products: number;
  id: number;
  name: string;
  email?: string;
  phone?: string;
  commission_rate: number;
  status: string;
  total_variants: number;
  available_variants: number;
  total_sales: number;
  total_sales_amount: number;
  total_earned: number;
  pending_payout: number;
  paid_out: number;
  user_id: string;
  portal_password?: string;
}

// Form types for creating/editing
export interface CreateConsignorData {
  name: string;
  email?: string;
  phone?: string;
  commission_rate: number;
  payment_method: 'PayPal' | 'Bank Transfer' | 'Cash' | 'Check' | 'Venmo' | 'Zelle';
  payout_method?: 'cost_price' | 'cost_plus_fixed' | 'cost_plus_percentage' | 'percentage_split';
  fixed_markup?: number;
  markup_percentage?: number;
  notes?: string;
  portal_password?: string;
}

// Sale split calculation
export interface SaleSplit {
  sale_price: number;
  owner_type: 'store' | 'consignor';
  store_gets: number;
  consignor_gets: number;
  commission_rate?: number;
  payout_method?: 'cost_price' | 'cost_plus_fixed' | 'cost_plus_percentage' | 'percentage_split';
  markup_amount?: number;
}
