import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'

const supabaseUrl: string = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey: string = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const consignorId = params.id
    const { amount, method, date, notes } = await request.json()

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid payout amount' }, { status: 400 })
    }

    // Verify consignor belongs to user
    const { data: consignor, error: consignorError } = await supabase
      .from('consignors')
      .select('*')
      .eq('id', consignorId)
      .eq('user_id', user.id)
      .single()

    if (consignorError || !consignor) {
      return NextResponse.json({ error: 'Consignor not found' }, { status: 404 })
    }

    // Save custom payment method if it's new and not a standard one
    const standardMethods = ['PayPal', 'Bank Transfer', 'Venmo', 'Zelle', 'Cash', 'Check', 'Wire Transfer']
    if (method && !standardMethods.includes(method)) {
      // Check if this custom method already exists
      const { data: existingMethod } = await supabase
        .from('custom_payment_methods')
        .select('id')
        .eq('user_id', user.id)
        .eq('method_name', method)
        .single()

      if (!existingMethod) {
        // Save the new custom payment method
        await supabase
          .from('custom_payment_methods')
          .insert({
            user_id: user.id,
            method_name: method,
            description: `Custom payment method: ${method}`
          })
      }
    }

    // Get pending sales for this consignor to mark as paid
    const { data: pendingSales, error: salesError } = await supabase
      .from('consignment_sales')
      .select('*')
      .eq('consignor_id', consignorId)
      .eq('payout_status', 'pending')
      .eq('user_id', user.id)

    if (salesError) {
      console.error('Error fetching pending sales:', salesError)
      return NextResponse.json({ error: 'Error fetching pending sales' }, { status: 500 })
    }

    if (!pendingSales || pendingSales.length === 0) {
      return NextResponse.json({ error: 'No pending payouts found for this consignor' }, { status: 400 })
    }

    // Calculate total pending amount
    const totalPending = pendingSales.reduce((sum, sale) => sum + Number(sale.consignor_payout), 0)

    if (amount > totalPending) {
      return NextResponse.json({ 
        error: `Payout amount ($${amount}) exceeds pending total ($${totalPending.toFixed(2)})` 
      }, { status: 400 })
    }

    // Create payout transaction record
    const { data: payoutTransaction, error: payoutError } = await supabase
      .from('payout_transactions')
      .insert({
        consignor_id: consignorId,
        user_id: user.id,
        total_amount: amount,
        payment_method: method,
        payout_date: date,
        transaction_reference: notes ? `Notes: ${notes}` : null,
        notes: notes || null,
        status: 'completed'
      })
      .select()
      .single()

    if (payoutError || !payoutTransaction) {
      console.error('Error creating payout transaction:', payoutError)
      return NextResponse.json({ error: 'Failed to create payout transaction' }, { status: 500 })
    }

    // Update existing pending sales as paid and link them to the payout transaction
    let remainingAmount = amount
    const updatedSales = []
    const payoutItems = []

    for (const sale of pendingSales) {
      if (remainingAmount <= 0) break

      const saleAmount = Number(sale.consignor_payout)
      
      if (remainingAmount >= saleAmount) {
        // Pay this sale in full
        const { error: updateError } = await supabase
          .from('consignment_sales')
          .update({
            payout_status: 'paid',
            payout_date: date,
            payout_method: method,
            notes: notes || null
          })
          .eq('id', sale.id)
          .eq('user_id', user.id)

        if (updateError) {
          console.error('Error updating sale:', updateError)
          continue
        }

        // Create payout transaction item
        payoutItems.push({
          payout_transaction_id: payoutTransaction.id,
          consignment_sale_id: sale.id,
          amount: saleAmount
        })

        updatedSales.push(sale.id)
        remainingAmount -= saleAmount
      }
    }

    // Insert payout transaction items
    if (payoutItems.length > 0) {
      const { error: itemsError } = await supabase
        .from('payout_transaction_items')
        .insert(payoutItems)

      if (itemsError) {
        console.error('Error creating payout items:', itemsError)
        // This is not critical, so we continue
      }
    }

    if (updatedSales.length === 0) {
      return NextResponse.json({ error: 'No sales were updated' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Payout processed successfully',
      payout_transaction_id: payoutTransaction.id,
      processed_amount: amount - remainingAmount,
      updated_sales: updatedSales.length,
      remaining_pending: remainingAmount > 0 ? remainingAmount : 0
    }, { status: 200 })

  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
