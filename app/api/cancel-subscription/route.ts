import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

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
      .select('subscription_id, creem_customer_id')
      .eq('email', userEmail)
      .single()

    if (userDataError || !userData) {
      return NextResponse.json({ success: false, error: 'User data not found' }, { status: 404 })
    }

    let subscriptionId = userData.subscription_id

    // If no subscription_id in DB, try to fetch from Creem.io API
    if (!subscriptionId) {
      // @ts-ignore
      const getSubscriptionsResponse = await fetch(`https://test-api.creem.io/v1/subscriptions?customer_email=${encodeURIComponent(userEmail)}`, {
        method: 'GET',
        headers: {
          "Content-Type": "application/json",
        "x-api-key": process.env.CREEM_API_KEY!,
        }
      })

      if (!getSubscriptionsResponse.ok) {
        const errorText = await getSubscriptionsResponse.text()
        console.error('Failed to fetch subscriptions:', errorText)
        return NextResponse.json({ success: false, error: 'Failed to fetch user subscriptions' }, { status: 500 })
      }

      const subscriptionsData = await getSubscriptionsResponse.json()
      const activeSubscription = subscriptionsData.data?.find((sub: any) => sub.status === 'active')

      if (!activeSubscription) {
        return NextResponse.json({ success: false, error: 'No active subscription found' }, { status: 404 })
      }

      subscriptionId = activeSubscription.id

      // Update the subscription_id in the database for future use
      await supabase
        .from('users')
        .update({ subscription_id: subscriptionId })
        .eq('email', userEmail)
    }

    // ✅ Use the official method to cancel subscription
    const response = await fetch(`https://test-api.creem.io/v1/subscriptions/${subscriptionId}/cancel`, {
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

    // Update user's plan in your DB to 'Free'
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        plan: 'Free',
        subscription_id: null,
        next_billing_date: null
      })
      .eq('email', userEmail)
          
    if (updateError) {
      console.error('Database update error:', updateError)
      return NextResponse.json({ success: false, error: 'Failed to update user plan' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Cancel subscription error:', error)
    return NextResponse.json({ success: false, error: error.message || 'Unknown error' }, { status: 500 })
  }
}
