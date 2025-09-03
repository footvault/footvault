import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

// GET: Fetch user's custom payment methods
export async function GET() {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)
    
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: customMethods, error } = await supabase
      .from('custom_payment_methods')
      .select('id, method_name, description')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .order('method_name')

    if (error) {
      console.error('Error fetching custom payment methods:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ methods: customMethods || [] })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: Create a new custom payment method
export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)
    
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { method_name, description } = await request.json()

    if (!method_name || method_name.trim().length === 0) {
      return NextResponse.json({ error: 'Method name is required' }, { status: 400 })
    }

    // Check if method already exists for this user
    const { data: existing, error: checkError } = await supabase
      .from('custom_payment_methods')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('method_name', method_name.trim())
      .single()

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error checking existing method:', checkError)
      return NextResponse.json({ error: checkError.message }, { status: 500 })
    }

    if (existing) {
      return NextResponse.json({ error: 'Payment method already exists' }, { status: 400 })
    }

    // Create new custom payment method
    const { data: newMethod, error: insertError } = await supabase
      .from('custom_payment_methods')
      .insert([{
        user_id: session.user.id,
        method_name: method_name.trim(),
        description: description?.trim() || null
      }])
      .select('id, method_name, description')
      .single()

    if (insertError) {
      console.error('Error creating custom payment method:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({ method: newMethod }, { status: 201 })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
