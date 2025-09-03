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

    const { searchParams } = new URL(request.url)
    const consignorId = searchParams.get('consignor_id')
    const status = searchParams.get('status') || 'all'
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    let query = supabase
      .from('consignment_payouts')
      .select(`
        *,
        consignor:consignors(id, name, email, phone)
      `)
      .eq('user_id', user.id)

    // Apply filters
    if (consignorId) {
      query = query.eq('consignor_id', parseInt(consignorId))
    }

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    if (dateFrom) {
      query = query.gte('payout_date', dateFrom)
    }

    if (dateTo) {
      query = query.lte('payout_date', dateTo)
    }

    // Get total count
    const { count } = await query

    // Get paginated results
    const { data: payouts, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching payouts:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Calculate totals
    const totalAmount = payouts?.reduce((sum, payout) => sum + payout.total_amount, 0) || 0

    return NextResponse.json({
      payouts: payouts || [],
      total: count || 0,
      totalAmount,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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

    const body = await request.json()
    const { 
      consignor_id, 
      total_amount, 
      payout_method, 
      payout_date,
      reference_number,
      notes,
      sale_ids // Array of consignment sale IDs to include in this payout
    } = body

    // Generate payout number
    const { data: payoutNumberData, error: payoutNumberError } = await supabase
      .rpc('generate_payout_number')

    if (payoutNumberError) {
      throw new Error('Failed to generate payout number')
    }

    const payoutNumber = payoutNumberData

    // Get the sales to calculate period
    const { data: sales, error: salesError } = await supabase
      .from('consignment_sales')
      .select('created_at')
      .in('id', sale_ids)
      .order('created_at', { ascending: true })

    if (salesError) {
      throw new Error('Failed to fetch sales for payout calculation')
    }

    const periodStart = sales[0]?.created_at
    const periodEnd = sales[sales.length - 1]?.created_at

    const payoutData = {
      consignor_id,
      payout_number: payoutNumber,
      total_amount,
      payout_method,
      payout_date,
      reference_number,
      status: 'pending',
      sales_included: sale_ids.length,
      period_start: periodStart,
      period_end: periodEnd,
      notes,
      user_id: user.id,
      created_at: new Date().toISOString()
    }

    // Create the payout record
    const { data: payout, error: payoutError } = await supabase
      .from('consignment_payouts')
      .insert([payoutData])
      .select(`
        *,
        consignor:consignors(id, name, email, phone)
      `)
      .single()

    if (payoutError) {
      throw new Error('Failed to create payout record')
    }

    // Update the consignment sales to mark them as paid
    const { error: updateError } = await supabase
      .from('consignment_sales')
      .update({ 
        payout_status: 'paid',
        payout_date: payout_date,
        payout_method: payout_method,
        payout_reference: reference_number
      })
      .in('id', sale_ids)

    if (updateError) {
      // If updating sales fails, we should rollback the payout
      await supabase
        .from('consignment_payouts')
        .delete()
        .eq('id', payout.id)
      
      throw new Error('Failed to update sales payout status')
    }

    return NextResponse.json({ payout }, { status: 201 })

  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
