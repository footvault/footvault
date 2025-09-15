import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const customerId = parseInt(id)
    if (isNaN(customerId)) {
      return NextResponse.json({ error: "Invalid customer ID" }, { status: 400 })
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

    // Check if customer exists and belongs to user
    const { data: existingCustomer, error: fetchError } = await supabase
      .from("customers")
      .select("id")
      .eq("id", customerId)
      .eq("user_id", user.id)
      .single()

    if (fetchError || !existingCustomer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    // Check for duplicate email (excluding current customer)
    if (email?.trim()) {
      const { data: duplicateEmail } = await supabase
        .from("customers")
        .select("id")
        .eq("user_id", user.id)
        .eq("email", email.trim())
        .neq("id", customerId)
        .eq("is_archived", false)

      if (duplicateEmail && duplicateEmail.length > 0) {
        return NextResponse.json({ 
          error: "Another customer with this email already exists" 
        }, { status: 400 })
      }
    }

    const { data: updatedCustomer, error } = await supabase
      .from("customers")
      .update({
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
      })
      .eq("id", customerId)
      .eq("user_id", user.id)
      .select()
      .single()

    if (error) {
      console.error("Error updating customer:", error)
      return NextResponse.json({ error: "Failed to update customer" }, { status: 500 })
    }

    // Transform response to match frontend interface
    const transformedCustomer = {
      id: updatedCustomer.id,
      name: updatedCustomer.name,
      email: updatedCustomer.email,
      phone: updatedCustomer.phone,
      address: updatedCustomer.address,
      city: updatedCustomer.city,
      state: updatedCustomer.state,
      zipCode: updatedCustomer.zip_code,
      country: updatedCustomer.country,
      customerType: updatedCustomer.customer_type,
      notes: updatedCustomer.notes,
      createdAt: updatedCustomer.created_at,
      updatedAt: updatedCustomer.updated_at,
      isArchived: updatedCustomer.is_archived,
      totalOrders: updatedCustomer.total_orders,
      totalSpent: updatedCustomer.total_spent,
      lastOrderDate: updatedCustomer.last_order_date,
    }

    return NextResponse.json(transformedCustomer)
  } catch (error) {
    console.error("Error in PUT /api/customers/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const customerId = parseInt(id)
    if (isNaN(customerId)) {
      return NextResponse.json({ error: "Invalid customer ID" }, { status: 400 })
    }

    // Soft delete by archiving
    const { error } = await supabase
      .from("customers")
      .update({ is_archived: true })
      .eq("id", customerId)
      .eq("user_id", user.id)

    if (error) {
      console.error("Error archiving customer:", error)
      return NextResponse.json({ error: "Failed to archive customer" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in DELETE /api/customers/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
