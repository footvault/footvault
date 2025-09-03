import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

// PUT: Update a custom payment method
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)
    
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const methodId = parseInt(params.id)
    const { method_name, description } = await request.json()

    if (!method_name || method_name.trim().length === 0) {
      return NextResponse.json({ error: 'Method name is required' }, { status: 400 })
    }

    // Check if method exists and belongs to user
    const { data: existing, error: checkError } = await supabase
      .from('custom_payment_methods')
      .select('id')
      .eq('id', methodId)
      .eq('user_id', session.user.id)
      .single()

    if (checkError || !existing) {
      return NextResponse.json({ error: 'Custom payment method not found' }, { status: 404 })
    }

    // Check if another method with same name exists for this user
    const { data: duplicate, error: dupError } = await supabase
      .from('custom_payment_methods')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('method_name', method_name.trim())
      .neq('id', methodId)
      .single()

    if (dupError && dupError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error checking duplicate method:', dupError)
      return NextResponse.json({ error: dupError.message }, { status: 500 })
    }

    if (duplicate) {
      return NextResponse.json({ error: 'A payment method with this name already exists' }, { status: 400 })
    }

    // Update the method
    const { data: updatedMethod, error: updateError } = await supabase
      .from('custom_payment_methods')
      .update({
        method_name: method_name.trim(),
        description: description?.trim() || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', methodId)
      .eq('user_id', session.user.id)
      .select('id, method_name, description')
      .single()

    if (updateError) {
      console.error('Error updating custom payment method:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ method: updatedMethod })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE: Delete a custom payment method
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)
    
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const methodId = parseInt(params.id)

    // Check if method exists and belongs to user
    const { data: existing, error: checkError } = await supabase
      .from('custom_payment_methods')
      .select('id, method_name')
      .eq('id', methodId)
      .eq('user_id', session.user.id)
      .single()

    if (checkError || !existing) {
      return NextResponse.json({ error: 'Custom payment method not found' }, { status: 404 })
    }

    // TODO: Check if this payment method is being used by any consignors
    // For now, we'll allow deletion but in production you might want to prevent deletion of methods in use

    // Delete the method
    const { error: deleteError } = await supabase
      .from('custom_payment_methods')
      .delete()
      .eq('id', methodId)
      .eq('user_id', session.user.id)

    if (deleteError) {
      console.error('Error deleting custom payment method:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Custom payment method deleted' })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
