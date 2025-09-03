import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'

const supabaseUrl: string = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey: string = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')

    const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })

    const {
      data: { user },
      error: userError,
    }: {
      data: { user: User | null }
      error: Error | null
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's custom payment methods
    const { data: customMethods, error: methodsError } = await supabase
      .from('custom_payment_methods')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (methodsError) {
      console.error('Error fetching custom payment methods:', methodsError)
      return NextResponse.json({ error: 'Error fetching payment methods' }, { status: 500 })
    }

    // Standard payment methods
    const standardMethods = [
      'PayPal',
      'Bank Transfer', 
      'Venmo',
      'Zelle',
      'Cash',
      'Check',
      'Wire Transfer'
    ]

    return NextResponse.json({
      standard_methods: standardMethods,
      custom_methods: customMethods || []
    })

  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')

    const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })

    const {
      data: { user },
      error: userError,
    }: {
      data: { user: User | null }
      error: Error | null
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { method_name, description } = await request.json()

    if (!method_name || method_name.trim().length === 0) {
      return NextResponse.json({ error: 'Payment method name is required' }, { status: 400 })
    }

    // Check if method already exists
    const { data: existing } = await supabase
      .from('custom_payment_methods')
      .select('id')
      .eq('user_id', user.id)
      .eq('method_name', method_name.trim())
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Payment method already exists' }, { status: 400 })
    }

    // Create new custom payment method
    const { data: newMethod, error: insertError } = await supabase
      .from('custom_payment_methods')
      .insert({
        user_id: user.id,
        method_name: method_name.trim(),
        description: description?.trim() || null
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating payment method:', insertError)
      return NextResponse.json({ error: 'Failed to create payment method' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Payment method created successfully',
      method: newMethod
    })

  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
