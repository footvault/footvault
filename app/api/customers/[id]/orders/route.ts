import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const customerId = parseInt(params.id)
    if (isNaN(customerId)) {
      return NextResponse.json({ error: "Invalid customer ID" }, { status: 400 })
    }

    // Verify customer belongs to user
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id")
      .eq("id", customerId)
      .eq("user_id", user.id)
      .single()

    if (customerError || !customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    // Fetch sales for this customer
    const { data: salesData, error: salesError } = await supabase
      .from("sales")
      .select(`
        id,
        sale_date,
        total_amount,
        sale_items (
          id,
          quantity,
          unit_price,
          product_name,
          size,
          sale_price
        )
      `)
      .eq("customer_id", customerId)
      .eq("user_id", user.id)
      .order("sale_date", { ascending: false })

    if (salesError) {
      console.error("Error fetching sales:", salesError)
    }

    // Fetch preorders (both completed and pending) for this customer
    const { data: preordersData, error: preordersError } = await supabase
      .from('pre_orders')
      .select(`
        id,
        pre_order_no,
        status,
        total_amount,
        down_payment,
        remaining_balance,
        completed_date,
        created_at,
        size,
        size_label,
        product:products (
          name,
          brand
        )
      `)
      .eq('user_id', user.id)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (preordersError) {
      console.error("Error fetching preorders:", preordersError);
    }

    // Transform sales data
    const transformedSales = (salesData || []).map(sale => ({
      id: sale.id,
      type: 'sale',
      saleDate: sale.sale_date,
      totalAmount: sale.total_amount,
      status: 'completed',
      items: (sale.sale_items || []).map(item => ({
        productName: item.product_name,
        size: item.size,
        price: item.sale_price,
        quantity: item.quantity
      }))
    }));

    // Transform preorders data
    const transformedPreorders = (preordersData || []).map(preorder => ({
      id: `preorder-${preorder.id}`,
      type: 'preorder',
      preorderNo: preorder.pre_order_no,
      saleDate: preorder.completed_date || preorder.created_at,
      totalAmount: preorder.total_amount,
      downPayment: preorder.down_payment,
      remainingBalance: preorder.remaining_balance,
      status: preorder.status,
      items: [{
        productName: (preorder.product as any)?.name || 'Unknown Product',
        size: preorder.size_label ? `${preorder.size} ${preorder.size_label}` : preorder.size,
        price: preorder.total_amount,
        quantity: 1
      }]
    }));

    // Combine and sort all orders by date
    const allOrders = [...transformedSales, ...transformedPreorders].sort((a, b) => 
      new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime()
    );

    return NextResponse.json(allOrders)
  } catch (error) {
    console.error("Error in GET /api/customers/[id]/orders:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
