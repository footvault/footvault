import { cookies } from "next/headers";
import { redirect } from 'next/navigation';
import { createClient } from "@/lib/supabase/server";
import { PreordersPageClient } from "@/components/preorders-page-client";

export const dynamic = 'force-dynamic'

interface Preorder {
  id: number;
  pre_order_no: number;
  customer_id: number;
  product_id: number;
  variant_id: number | null;
  size: string | null;
  size_label: string | null;
  status: string;
  cost_price: number;
  total_amount: number;
  down_payment: number | null;
  remaining_balance: number;
  expected_delivery_date: string | null;
  completed_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  customer: {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    zip_code: string | null;
    country: string | null;
  };
  product: {
    name: string;
    brand: string;
    sku: string;
    image: string | null;
  };
}

async function getPreorders(): Promise<Preorder[]> {
  const cookieStore = await cookies();
  const supabase = await createClient(cookieStore);
  
  try {
    const { data: preorders, error } = await supabase
      .from('pre_orders')
      .select(`
        *,
        customer:customers!inner(id, name, email, phone, address, city, state, zip_code, country),
        product:products!inner(name, brand, sku, image)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching pre_orders:', error)
      // Don't throw error for empty results or missing table
      if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
        console.log('Pre_orders table not found or empty, returning empty array')
        return []
      }
      throw error
    }

    return preorders || []
  } catch (error) {
    console.error('Error in getPreorders:', error)
    return []
  }
}

export default async function PreordersPage() {
  const cookieStore = await cookies();
  const supabase = await createClient(cookieStore);
  
  // Check authentication
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    redirect('/login')
  }

  try {
    const preorders = await getPreorders()
    
    return <PreordersPageClient initialPreorders={preorders} />
  } catch (error) {
    console.error('Error in PreordersPage:', error)
    return <PreordersPageClient initialPreorders={[]} error={error instanceof Error ? error.message : 'Unknown error'} />
  }
}
