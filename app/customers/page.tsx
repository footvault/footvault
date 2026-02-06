import { cookies } from "next/headers";
import { redirect } from 'next/navigation';
import { createClient } from "@/lib/supabase/server";
import { CustomersPageClient } from "@/components/customers-page-client";

// Define database types
interface DatabaseCustomer {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  country: string | null;
  customer_type: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
  total_orders: number;
  total_spent: number;
  last_order_date: string | null;
}

interface TransformedCustomer {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  country: string | null;
  customerType: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  isArchived: boolean;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: string | null;
}

async function getCustomers(userId: string) {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);
    
    const { data: customersData, error: customersError } = await supabase
      .from('customers')
      .select('*')
      .eq('user_id', userId)
      .eq('is_archived', false)
      .range(0, 4999) // Support up to 5000 customers
      .order('created_at', { ascending: false });

    if (customersError) {
      console.error("Error fetching customers:", customersError);
      return { data: null, error: customersError };
    }

    if (!customersData) {
      return { data: [], error: null };
    }

    // For each customer, calculate real-time statistics from sales data
    const transformedCustomers: TransformedCustomer[] = await Promise.all(
      customersData.map(async (customer) => {
        // Fetch sales data for this customer, excluding downpayments
        const { data: salesData } = await supabase
          .from('sales')
          .select(`
            id,
            total_amount,
            sale_date,
            status,
            sale_items (
              id,
              quantity,
              sold_price,
              variants (
                id,
                type,
                size,
                products (
                  id,
                  name,
                  brand
                )
              )
            )
          `)
          .eq('customer_id', customer.id)
          .eq('user_id', userId)
          .eq('status', 'completed');

        // Calculate statistics excluding downpayments
        let totalSpent = 0;
        let totalOrders = 0;
        let lastOrderDate: string | null = null;

        if (salesData) {
          // Filter out downpayments and calculate totals
          const validSales = salesData.filter(sale => {
            // Check if this sale contains any non-downpayment items
            const hasNonDownpaymentItems = sale.sale_items?.some(item => {
              // Handle variant data properly (could be array or single object)
              let variant = null;
              if (item.variants) {
                if (Array.isArray(item.variants)) {
                  variant = item.variants[0] || null;
                } else {
                  variant = item.variants;
                }
              }
              // Only count non-downpayment items
              return variant?.type !== 'downpayment';
            });
            return hasNonDownpaymentItems;
          });

          totalOrders = validSales.length;
          totalSpent = validSales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);
          
          // Find the most recent order date
          if (validSales.length > 0) {
            lastOrderDate = validSales
              .map(sale => sale.sale_date)
              .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
          }
        }

        return {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          address: customer.address,
          city: customer.city,
          state: customer.state,
          zipCode: customer.zip_code,
          country: customer.country,
          customerType: customer.customer_type,
          notes: customer.notes,
          createdAt: customer.created_at,
          updatedAt: customer.updated_at,
          isArchived: customer.is_archived,
          totalOrders: totalOrders,
          totalSpent: totalSpent,
          lastOrderDate: lastOrderDate,
        };
      })
    );

    return { data: transformedCustomers, error: null };
  } catch (error: any) {
    console.error("Error in getCustomers:", error);
    return { data: null, error };
  }
}

export default async function CustomersPage() {
  // Check authentication
  const cookieStore = await cookies();
  const supabase = await createClient(cookieStore);
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect unauthenticated users to home page
  if (!user) {
    redirect("/");
  }

  // Get session for access token
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect("/");
  }

  // Fetch customers
  const { data: allCustomers, error: customersError } = await getCustomers(user.id);

  if (customersError) {
    console.error("Failed to load customers:", customersError);
  }

  return (
    <CustomersPageClient
      initialCustomers={allCustomers || []}
      error={customersError}
    />
  );
}
