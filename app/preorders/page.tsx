import { cookies } from "next/headers";
import { redirect } from 'next/navigation';
import { createClient } from "@/lib/supabase/server";
import { PreordersPageClient } from "@/components/preorders-page-client";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

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
  down_payment_method: string | null;
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
    return (
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1 bg-white md:bg-transparent" />
          <Separator orientation="vertical" className="mr-2 h-4 hidden md:block" />
          <h1 className="text-xl font-semibold">Pre-orders</h1>
        </header>
        <div className="w-full px-2 py-8">
          <div className="container mx-auto py-8 w-full">
            <PreordersPageClient initialPreorders={preorders} />
          </div>
        </div>
      </SidebarInset>
    )
  } catch (error) {
    console.error('Error in PreordersPage:', error)
    return (
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1 bg-white md:bg-transparent" />
          <Separator orientation="vertical" className="mr-2 h-4 hidden md:block" />
          <h1 className="text-xl font-semibold">Pre-orders</h1>
        </header>
        <div className="w-full px-2 py-8">
          <div className="container mx-auto py-8 w-full">
            <PreordersPageClient initialPreorders={[]} error={error instanceof Error ? error.message : 'Unknown error'} />
          </div>
        </div>
      </SidebarInset>
    )
  }
}
