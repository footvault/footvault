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
    const payoutStatus = searchParams.get('payout_status') || 'all'
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    let query = supabase
      .from('consignment_sales')
      .select(`
        *,
        consignor:consignors(id, name, commission_rate),
        variant:variants(id, size, size_label, product:products(id, name, brand, sku))
      `)
      .eq('user_id', user.id)

    // Apply filters
    if (consignorId) {
      query = query.eq('consignor_id', parseInt(consignorId))
    }

    if (payoutStatus !== 'all') {
      query = query.eq('payout_status', payoutStatus)
    }

    if (dateFrom) {
      query = query.gte('created_at', dateFrom)
    }

    if (dateTo) {
      query = query.lte('created_at', dateTo)
    }

    // Get total count
    const { count } = await query

    // Get paginated results
    const { data: sales, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching consignment sales:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Calculate totals
    const totalAmount = sales?.reduce((sum, sale) => sum + sale.sale_price, 0) || 0
    const totalPayout = sales?.reduce((sum, sale) => sum + sale.consignor_payout, 0) || 0
    const totalCommission = sales?.reduce((sum, sale) => sum + sale.store_commission, 0) || 0

    return NextResponse.json({
      sales: sales || [],
      total: count || 0,
      totalAmount,
      totalPayout,
      totalCommission,
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
    const { sale_id, consignor_id, product_id, variant_id, sale_price, commission_rate } = body

    // Calculate commission split
    const commission_amount = Math.round(sale_price * (commission_rate / 100) * 100) / 100
    const consignor_payout = sale_price - commission_amount

    const saleData = {
      sale_id,
      consignor_id,
      product_id,
      variant_id,
      sale_price,
      commission_rate,
      commission_amount,
      consignor_payout,
      payout_status: 'pending',
      user_id: user.id,
      created_at: new Date().toISOString()
    }

    const { data: consignmentSale, error } = await supabase
      .from('consignment_sales')
      .insert([saleData])
      .select(`
        *,
        consignor:consignors(id, name, commission_rate),
        product:products(id, name, brand, sku),
        variant:variants(id, size, size_label)
      `)
      .single()

    if (error) {
      console.error('Error creating consignment sale:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ sale: consignmentSale }, { status: 201 })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
