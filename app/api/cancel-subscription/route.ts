import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

function getCreemApiBaseUrl(apiKey: string): string {
  return apiKey.startsWith('creem_test_')
    ? 'https://test-api.creem.io/v1'
    : 'https://api.creem.io/v1'
}

export async function POST(req: NextRequest) {
  try {
    const { planType } = await req.json()
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)
    
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser()
        
    if (userError || !user) {
      return NextResponse.json({ success: false, error: 'User not authenticated' }, { status: 401 })
    }
        
    const userEmail = user.email
    

    if (!process.env.CREEM_API_KEY!) {
      return NextResponse.json({ success: false, error: 'API key not configured' }, { status: 500 })
    }

    // Get user's subscription_id from database first
    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('plan, next_billing_date, subscription_id, creem_customer_id')
      .eq('email', userEmail)
      .single()

    if (userDataError || !userData) {
      return NextResponse.json({ success: false, error: 'User data not found' }, { status: 404 })
    }

    let subscriptionId = userData.subscription_id
    const apiBaseUrl = getCreemApiBaseUrl(process.env.CREEM_API_KEY!)

    // If there is no stored subscription id, cancellation cannot be performed reliably.
    if (!subscriptionId) {
      return NextResponse.json(
        {
          success: false,
          error: 'No stored subscription ID was found for this account. Complete one successful billing sync first, then try canceling again.',
        },
        { status: 404 }
      )
    }

    const response = await fetch(`${apiBaseUrl}/subscriptions/${subscriptionId}/cancel`, {
      method: 'POST',
      headers: {
       "Content-Type": "application/json",
        "x-api-key": process.env.CREEM_API_KEY!,
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Creem API error:', errorText)
      return NextResponse.json({ success: false, error: 'Failed to cancel subscription' }, { status: 500 })
    }

    const subscriptionEndsAt = userData.next_billing_date || null

    const { error: updateError } = await supabase
      .from('users')
      .update({ 
         subscription_status: 'scheduled_cancel',
        subscription_ends_at: subscriptionEndsAt,
      })
      .eq('email', userEmail)
          
    if (updateError) {
      console.error('Database update error:', updateError)
      return NextResponse.json({ success: false, error: 'Failed to update user plan' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: subscriptionEndsAt
        ? `Your ${userData.plan || 'paid'} plan will stay active until ${subscriptionEndsAt}.`
        : 'Your cancellation was scheduled successfully.',
    })
  } catch (error: any) {
    console.error('Cancel subscription error:', error)
    return NextResponse.json({ success: false, error: error.message || 'Unknown error' }, { status: 500 })
  }
}
