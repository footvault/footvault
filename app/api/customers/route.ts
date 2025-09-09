import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: customers, error } = await supabase
      .from("customers")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_archived", false)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching customers:", error)
      return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 })
    }

    return NextResponse.json(customers)
  } catch (error) {
    console.error("Error in GET /api/customers:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      name,
      email,
      phone,
      address,
      city,
      state,
      zipCode,
      country,
      customerType,
      notes
    } = body

    // Validation
    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    if (!email?.trim() && !phone?.trim()) {
      return NextResponse.json({ error: "Either email or phone is required" }, { status: 400 })
    }

    // Check for existing customer with same email or phone
    let existingCustomerQuery = supabase
      .from("customers")
      .select("id, name, email, phone")
      .eq("user_id", user.id)
      .eq("is_archived", false)

    if (email?.trim()) {
      existingCustomerQuery = existingCustomerQuery.eq("email", email.trim())
    }

    const { data: existingCustomers } = await existingCustomerQuery

    if (existingCustomers && existingCustomers.length > 0) {
      return NextResponse.json({ 
        error: "A customer with this email already exists" 
      }, { status: 400 })
    }

    if (phone?.trim()) {
      const { data: existingPhoneCustomers } = await supabase
        .from("customers")
        .select("id, name, phone")
        .eq("user_id", user.id)
        .eq("phone", phone.trim())
        .eq("is_archived", false)

      if (existingPhoneCustomers && existingPhoneCustomers.length > 0) {
        return NextResponse.json({ 
          error: "A customer with this phone number already exists" 
        }, { status: 400 })
      }
    }

    const { data: newCustomer, error } = await supabase
      .from("customers")
      .insert([
        {
          user_id: user.id,
          name: name.trim(),
          email: email?.trim() || null,
          phone: phone?.trim() || null,
          address: address?.trim() || null,
          city: city?.trim() || null,
          state: state?.trim() || null,
          zip_code: zipCode?.trim() || null,
          country: country?.trim() || 'Philippines',
          customer_type: customerType || 'regular',
          notes: notes?.trim() || null,
        }
      ])
      .select()
      .single()

    if (error) {
      console.error("Error creating customer:", error)
      return NextResponse.json({ error: "Failed to create customer" }, { status: 500 })
    }

    // Transform response to match frontend interface
    const transformedCustomer = {
      id: newCustomer.id,
      name: newCustomer.name,
      email: newCustomer.email,
      phone: newCustomer.phone,
      address: newCustomer.address,
      city: newCustomer.city,
      state: newCustomer.state,
      zipCode: newCustomer.zip_code,
      country: newCustomer.country,
      customerType: newCustomer.customer_type,
      notes: newCustomer.notes,
      createdAt: newCustomer.created_at,
      updatedAt: newCustomer.updated_at,
      isArchived: newCustomer.is_archived,
      totalOrders: newCustomer.total_orders,
      totalSpent: newCustomer.total_spent,
      lastOrderDate: newCustomer.last_order_date,
    }

    return NextResponse.json(transformedCustomer)
  } catch (error) {
    console.error("Error in POST /api/customers:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
