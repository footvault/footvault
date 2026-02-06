import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get URL parameters
    const { searchParams } = new URL(request.url)
    const archived = searchParams.get('archived') === 'true'

    // Get consignor stats with calculated fields
    let query = supabase
      .from('consignors')
      .select(`
        *,
        consignment_sales(
          sale_price,
          consignor_payout,
          store_commission,
          payout_status,
          created_at
        ),
        variants(
          id,
          status,
          owner_type
        )
      `)
      .eq('user_id', user.id)

    // Filter by archived status
    if (archived) {
      query = query.eq('isarchived', true)
    } else {
      query = query.eq('isarchived', false)
    }

    const { data: consignors, error: consignorsError } = await query
      .range(0, 4999) // Support up to 5000 consignors
      .order('created_at', { ascending: false })

    if (consignorsError) {
      console.error('Error fetching consignors:', consignorsError)
      return NextResponse.json({ error: consignorsError.message }, { status: 500 })
    }

    // Calculate stats for each consignor
    const consignorsWithStats = (consignors || []).map((consignor: any) => {
      const sales = (consignor.consignment_sales || []) as any[]
      const variants = (consignor.variants || []) as any[]

      // Filter variants that belong to this consignor
      const consignedVariants = variants.filter((v: any) => v.owner_type === 'consignor')
      
      const totalSales = sales.reduce((sum: number, sale: any) => sum + Number(sale.sale_price), 0)
      const totalPayout = sales.reduce((sum: number, sale: any) => sum + Number(sale.consignor_payout), 0)
      const pendingPayout = sales
        .filter((sale: any) => sale.payout_status === 'pending')
        .reduce((sum: number, sale: any) => sum + Number(sale.consignor_payout), 0)
      const paidPayout = sales
        .filter((sale: any) => sale.payout_status === 'paid')
        .reduce((sum: number, sale: any) => sum + Number(sale.consignor_payout), 0)
      
      const availableItems = consignedVariants.filter((v: any) => v.status === 'Available').length
      const soldItems = sales.length

      return {
        ...consignor,
        total_sales_amount: totalSales,
        total_payout: totalPayout,
        pending_payout: pendingPayout,
        paid_payout: paidPayout,
        total_variants: consignedVariants.length,
        available_variants: availableItems,
        sold_variants: soldItems,
        total_products: consignedVariants.length, // For backwards compatibility
        // Remove the raw relations to avoid exposing too much data
        consignment_sales: undefined,
        variants: undefined
      }
    })

    // Calculate summary stats
    const totalConsignors = consignorsWithStats.length
    const activeConsignors = consignorsWithStats.filter(c => c.status === 'active').length
    const totalSalesAmount = consignorsWithStats.reduce((sum, c) => sum + (c.total_sales_amount || 0), 0)
    const totalPendingPayouts = consignorsWithStats.reduce((sum, c) => sum + (c.pending_payout || 0), 0)
    const totalPaidPayouts = consignorsWithStats.reduce((sum, c) => sum + (c.paid_payout || 0), 0)
    const totalVariants = consignorsWithStats.reduce((sum, c) => sum + (c.total_variants || 0), 0)
    const totalAvailableVariants = consignorsWithStats.reduce((sum, c) => sum + (c.available_variants || 0), 0)
    const totalSoldVariants = consignorsWithStats.reduce((sum, c) => sum + (c.sold_variants || 0), 0)

    return NextResponse.json({
      consignors: consignorsWithStats,
      summary: {
        total_consignors: totalConsignors,
        active_consignors: activeConsignors,
        total_sales_amount: totalSalesAmount,
        total_pending_payouts: totalPendingPayouts,
        total_paid_payouts: totalPaidPayouts,
        total_variants: totalVariants,
        available_variants: totalAvailableVariants,
        sold_variants: totalSoldVariants
      }
    })
  } catch (error) {
    console.error('Error in consignors stats API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
