import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import { Consignor, CreateConsignorData } from '@/lib/types/consignor'

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
    const status = searchParams.get('status') || 'all'
    const archived = searchParams.get('archived') === 'true'
    const search = searchParams.get('search') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit

    let query = supabase
      .from('consignor_dashboard_stats')
      .select('*')
      .eq('user_id', user.id)

    // Filter by archived status (default to showing only non-archived)
    if (archived) {
      query = query.eq('isarchived', true)
    } else {
      query = query.eq('isarchived', false)
    }

    // Apply filters
    if (status !== 'all') {
      query = query.eq('status', status)
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
    }

    // Get total count
    const { count } = await query

    // Get paginated results
    const { data: consignors, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching consignors:', error)
      
      // If the view doesn't exist, fall back to the base table
      if (error.message.includes('does not exist') || error.code === '42P01') {
        console.log('Falling back to base consignors table...')
        
        let fallbackQuery = supabase
          .from('consignors')
          .select('*')
          .eq('user_id', user.id)

        // Filter by archived status in fallback query too
        if (archived) {
          fallbackQuery = fallbackQuery.eq('isarchived', true)
        } else {
          fallbackQuery = fallbackQuery.eq('isarchived', false)
        }

        if (status !== 'all') {
          fallbackQuery = fallbackQuery.eq('status', status)
        }

        if (search) {
          fallbackQuery = fallbackQuery.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
        }

        const { data: fallbackConsignors, error: fallbackError } = await fallbackQuery
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        if (fallbackError) {
          console.error('Fallback query also failed:', fallbackError)
          return NextResponse.json({ 
            error: `Database tables not found. Please run the consignor schema first. Error: ${fallbackError.message}` 
          }, { status: 500 })
        }

        return NextResponse.json({
          consignors: fallbackConsignors || [],
          total: fallbackConsignors?.length || 0,
          page,
          limit,
          totalPages: Math.ceil((fallbackConsignors?.length || 0) / limit),
          message: 'Using simplified data - please run database schema for full stats'
        })
      }
      
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      consignors: consignors || [],
      total: count || 0,
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

    const body: CreateConsignorData = await request.json()

    // Validate required fields
    if (!body.name || !body.commission_rate) {
      return NextResponse.json({ 
        error: 'Name and commission rate are required' 
      }, { status: 400 })
    }

    // Validate commission rate
    if (body.commission_rate < 0 || body.commission_rate > 100) {
      return NextResponse.json({ 
        error: 'Commission rate must be between 0 and 100' 
      }, { status: 400 })
    }

    const consignorData = {
      ...body,
      user_id: user.id,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: consignor, error } = await supabase
      .from('consignors')
      .insert([consignorData])
      .select()
      .single()

    if (error) {
      console.error('Error creating consignor:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ consignor }, { status: 201 })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
