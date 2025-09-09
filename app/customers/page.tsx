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
      .order('created_at', { ascending: false });

    if (customersError) {
      console.error("Error fetching customers:", customersError);
      return { data: null, error: customersError };
    }

    if (!customersData) {
      return { data: [], error: null };
    }

    // Transform the database response to our expected format
    const transformedCustomers: TransformedCustomer[] = customersData.map(customer => ({
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
      totalOrders: customer.total_orders,
      totalSpent: customer.total_spent,
      lastOrderDate: customer.last_order_date,
    }));

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
