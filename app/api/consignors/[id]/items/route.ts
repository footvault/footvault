import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'

const supabaseUrl: string = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey: string = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      console.error('User authentication error:', userError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const consignorId = params.id
    console.log('Fetching items for consignor ID:', consignorId, 'User ID:', user.id)

    // Verify consignor belongs to user
    const { data: consignor, error: consignorError } = await supabase
      .from('consignors')
      .select('id, name')
      .eq('id', consignorId)
      .eq('user_id', user.id)
      .single()

    if (consignorError || !consignor) {
      console.error('Consignor not found:', consignorError, 'ID:', consignorId)
      return NextResponse.json({ error: 'Consignor not found' }, { status: 404 })
    }

    console.log('Found consignor:', consignor)

    // Get all variants/items for this consignor with product details
    const { data: items, error: itemsError } = await supabase
      .from('variants')
      .select(`
        id,
        variant_sku,
        size,
        status,
        location,
        created_at,
        products (
          id,
          name,
          brand,
          sku,
          category,
          sale_price,
          image
        )
      `)
      .eq('consignor_id', consignorId)
      .eq('owner_type', 'consignor')
      .order('created_at', { ascending: false })

    if (itemsError) {
      console.error('Error fetching consignor items:', itemsError)
      return NextResponse.json({ error: 'Error fetching items' }, { status: 500 })
    }

    console.log('Found', items?.length || 0, 'items for consignor', consignorId)

    // Calculate summary stats
    const totalItems = items?.length || 0
    const availableItems = items?.filter(item => item.status?.toLowerCase() === 'available').length || 0
    const totalValue = items?.reduce((sum, item) => {
      const product = Array.isArray(item.products) ? item.products[0] : item.products
      return sum + (product?.sale_price || 0)
    }, 0) || 0
    const availableValue = items?.filter(item => item.status?.toLowerCase() === 'available')
      .reduce((sum, item) => {
        const product = Array.isArray(item.products) ? item.products[0] : item.products
        return sum + (product?.sale_price || 0)
      }, 0) || 0

    // Group by category for additional insights
    const categoryBreakdown = items?.reduce((acc: Record<string, number>, item) => {
      const product = Array.isArray(item.products) ? item.products[0] : item.products
      const category = product?.category || 'Uncategorized'
      acc[category] = (acc[category] || 0) + 1
      return acc
    }, {}) || {}

    return NextResponse.json({
      consignor: {
        id: consignor.id,
        name: consignor.name
      },
      items: items || [],
      summary: {
        total_items: totalItems,
        available_items: availableItems,
        total_value: totalValue,
        available_value: availableValue,
        category_breakdown: categoryBreakdown
      }
    })

  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
