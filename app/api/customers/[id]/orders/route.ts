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
    const { data: sales, error: salesError } = await supabase
      .from("sales")
      .select(`
        id,
        sale_date,
        total_amount,
        sale_items (
          id,
          quantity,
          unit_price,
          variants (
            id,
            size,
            size_label,
            products (
              id,
              name,
              brand
            )
          )
        )
      `)
      .eq("customer_id", customerId)
      .eq("user_id", user.id)
      .order("sale_date", { ascending: false })

    if (salesError) {
      console.error("Error fetching customer orders:", salesError)
      return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 })
    }

    // Transform the data to a more frontend-friendly format
    const orderHistory = sales?.map(sale => ({
      id: sale.id,
      saleDate: sale.sale_date,
      totalAmount: sale.total_amount,
      items: sale.sale_items?.map(item => {
        const variant = Array.isArray(item.variants) ? item.variants[0] : item.variants;
        let product: any = null;
        
        if (variant?.products) {
          product = Array.isArray(variant.products) ? variant.products[0] : variant.products;
        }
        
        return {
          productName: product ? `${product.brand || ''} ${product.name || 'Unknown Product'}`.trim() : 'Unknown Product',
          size: variant?.size || '',
          price: item.unit_price,
          quantity: item.quantity
        };
      }) || []
    })) || []

    return NextResponse.json(orderHistory)
  } catch (error) {
    console.error("Error in GET /api/customers/[id]/orders:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
