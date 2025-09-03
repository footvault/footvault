import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
  try {
    const { consignorId, password } = await request.json()

    if (!consignorId || !password) {
      return NextResponse.json({ error: 'Consignor ID and password are required' }, { status: 400 })
    }

    // Use service role key for direct database access
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get consignor with password
    const { data: consignor, error: consignorError } = await supabase
      .from('consignors')
      .select('*')
      .eq('id', consignorId)
      .single()

    if (consignorError || !consignor) {
      return NextResponse.json({ error: 'Consignor not found' }, { status: 404 })
    }

    // Check if consignor has a portal password set
    if (!consignor.portal_password) {
      return NextResponse.json({ error: 'Portal access not configured for this consignor' }, { status: 403 })
    }

    // Verify password (plain text comparison)
    const isValidPassword = password === consignor.portal_password
    if (!isValidPassword) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }

    // Get parent user's currency settings
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('currency')
      .eq('id', consignor.user_id)
      .single()

    if (userError) {
      console.error('Error fetching user currency:', userError)
    }

    const userCurrency = userData?.currency || 'USD' // Default to USD if not found

    // Get consignor stats
    const { data: sales, error: salesError } = await supabase
      .from('consignment_sales')
      .select(`
        *,
        variants(
          id,
          size,
          variant_sku,
          products(
            name,
            brand,
            image
          )
        )
      `)
      .eq('consignor_id', consignorId)
      .order('created_at', { ascending: false })

    if (salesError) {
      console.error('Error fetching sales:', salesError)
      return NextResponse.json({ error: 'Error fetching sales data' }, { status: 500 })
    }

    // Get current inventory
    const { data: currentInventory, error: inventoryError } = await supabase
      .from('variants')
      .select(`
        id,
        size,
        variant_sku,
        status,
        location,
        created_at,
        products(
          name,
          brand,
          image,
          sale_price
        )
      `)
      .eq('consignor_id', consignorId)
      .eq('owner_type', 'consignor')
      .order('created_at', { ascending: false })

    if (inventoryError) {
      console.error('Error fetching inventory:', inventoryError)
      return NextResponse.json({ error: 'Error fetching inventory data' }, { status: 500 })
    }

    // Calculate stats
    const totalSales = sales?.reduce((sum, sale) => sum + Number(sale.sale_price), 0) || 0
    const totalEarnings = sales?.reduce((sum, sale) => sum + Number(sale.consignor_payout), 0) || 0
    const pendingPayout = sales?.filter(sale => sale.payout_status === 'pending')
      .reduce((sum, sale) => sum + Number(sale.consignor_payout), 0) || 0
    const paidPayout = sales?.filter(sale => sale.payout_status === 'paid')
      .reduce((sum, sale) => sum + Number(sale.consignor_payout), 0) || 0

    const availableItems = currentInventory?.filter(item => item.status === 'Available').length || 0
    const soldItems = sales?.length || 0

    // Get payout history grouped by date using the new payout transactions system
    const { data: payoutGroups, error: payoutError } = await supabase
      .rpc('get_consignor_payout_groups', { consignor_id_param: parseInt(consignorId) })

    if (payoutError) {
      console.error('Error fetching payout groups:', payoutError)
    }

    return NextResponse.json({
      consignor: {
        id: consignor.id,
        name: consignor.name,
        email: consignor.email,
        commission_rate: consignor.commission_rate,
        payment_method: consignor.payment_method
      },
      currency: userCurrency, // Include the parent user's currency
      stats: {
        total_sales: totalSales,
        total_earnings: totalEarnings,
        pending_payout: pendingPayout,
        paid_payout: paidPayout,
        available_items: availableItems,
        sold_items: soldItems,
        total_items: (currentInventory?.length || 0) + soldItems
      },
      sales: sales || [],
      current_inventory: currentInventory || [],
      payout_groups: payoutGroups || []
    })
  } catch (error) {
    console.error('Error in public consignor portal:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
