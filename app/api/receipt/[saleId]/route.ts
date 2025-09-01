import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(request: Request, { params }: { params: { saleId: string } }) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ success: false, error: 'No authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    })

    // Get user from token for RLS
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      console.error('Authentication error:', userError)
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }

    const { saleId } = params

    // Fetch sale data with user info
    const { data: saleData, error: saleError } = await supabase
      .from('sales')
      .select(`
        *,
        users!inner(username, receipt_address, receipt_more_info, receipt_header_type, receipt_logo_url),
        sale_items!inner(
          *,
          variants!inner(
            size,
            size_label,
            products!inner(name, brand)
          )
        )
      `)
      .eq('id', saleId)
      .eq('user_id', user.id)
      .single()

    if (saleError) {
      console.error('Sale fetch error:', saleError)
      return NextResponse.json({ success: false, error: 'Sale not found' }, { status: 404 })
    }

    // Format the data for the receipt
    const receiptData = {
      saleId: saleData.id,
      userInfo: {
        username: saleData.users.username,
        receiptAddress: saleData.users.receipt_address,
        receiptMoreInfo: saleData.users.receipt_more_info,
        receiptHeaderType: saleData.users.receipt_header_type || 'username',
        receiptLogoUrl: saleData.users.receipt_logo_url,
      },
      saleInfo: {
        invoiceNumber: saleData.sales_no || saleData.id.slice(-6),
        date: new Date(saleData.sale_date).toLocaleDateString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric'
        }),
        time: new Date(saleData.created_at).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }),
        items: saleData.sale_items.map((item: any) => ({
          name: item.variants.products.name,
          size: item.variants.size && item.variants.size_label 
            ? `${item.variants.size} ${item.variants.size_label}` 
            : item.variants.size_label || item.variants.size || 'N/A',
          price: item.sold_price,
          quantity: item.quantity || 1
        })),
        subtotal: saleData.total_amount + (saleData.total_discount || 0) - (saleData.additional_charge || 0),
        discount: saleData.total_discount || 0,
        additionalCharge: saleData.additional_charge || 0,
        total: saleData.total_amount,
        paymentReceived: saleData.payment_received || saleData.total_amount,
        changeAmount: saleData.change_amount || 0,
        paymentType: saleData.payment_type?.name || 'Cash'
      }
    }

    return NextResponse.json({ success: true, data: receiptData })
  } catch (error) {
    console.error('Receipt API error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
