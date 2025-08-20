import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')
  let next = searchParams.get('next') ?? '/inventory'
  if (!next.startsWith('/')) next = '/inventory'

  // Add debugging logs
  console.log('=== AUTH CALLBACK DEBUG ===')
  console.log('Request URL:', request.url)
  console.log('Origin:', origin)
  console.log('Code:', code?.substring(0, 8) + '...')
  console.log('Next:', next)
  console.log('Headers:', Object.fromEntries(request.headers.entries()))
  console.log('========================')

  if (error) {
    console.error('OAuth error received:', error, errorDescription)
    return NextResponse.redirect(
      `${origin}/auth/auth-code-error?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(errorDescription || 'OAuth provider error')}`
    )
  }

  if (!code) {
    console.error('No authorization code received')
    return NextResponse.redirect(
      `${origin}/auth/auth-code-error?error=invalid_request&error_description=Missing+authorization+code`
    )
  }

  try {
    // 1. Create cookie-aware client (for session exchange)
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value
          },
          set(name, value, options) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name, options) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )

    // 2. Exchange code → sets session cookie
    console.log('Attempting to exchange code for session...')
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    if (exchangeError) {
      console.error('Auth exchange error:', exchangeError)
      return NextResponse.redirect(`${origin}/auth/auth-code-error?error=exchange_failed&details=${encodeURIComponent(exchangeError.message)}`)
    }

    console.log('Code exchange successful, user:', data.user?.email)

    const { user } = data
    if (user) {
      // 3. Use admin client for DB stuff
      const admin = await createAdminClient()

      // check if user exists
      const { data: existingUser } = await admin
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single()

      if (!existingUser) {
        console.log('Creating new user in database...')
        const plan = 'Free'
        const email = user.email || 'NoEmail'
        const username = user.user_metadata.full_name ?? email ?? 'NoName'
        const currency = 'USD'

        await admin.from('users').insert({
          id: user.id,
          username,
          plan,
          email,
          currency,
          timezone: 'America/New_York',
        })

        // default avatar
        const initials = email.split('@')[0].slice(0, 2).toUpperCase()
        const fallback = `https://api.dicebear.com/7.x/initials/svg?seed=${initials}`
        const avatarImage = user.user_metadata.avatar_url ?? fallback

        await admin.from('avatars').insert({
          name: 'Main',
          user_id: user.id,
          default_percentage: 100.0,
          image: avatarImage,
          type: 'Main',
        })

        // default payment type
        await admin.from('payment_types').insert({
          user_id: user.id,
          name: 'Cash',
          fee_type: 'fixed',
          fee_value: 0.0,
        })
        
        console.log('New user created successfully')
      } else {
        console.log('Existing user found')
      }
    }

    // 4. Enhanced redirect logic with debugging
    const forwardedHost = request.headers.get('x-forwarded-host')
    const forwardedProto = request.headers.get('x-forwarded-proto')
    
    let redirectUrl: string
    
    if (forwardedHost && process.env.NODE_ENV === 'production') {
      const protocol = forwardedProto || 'https'
      redirectUrl = `${protocol}://${forwardedHost}${next}`
      console.log('Using forwarded host redirect:', redirectUrl)
    } else {
      redirectUrl = `${origin}${next}`
      console.log('Using origin redirect:', redirectUrl)
    }
    
    console.log('Final redirect URL:', redirectUrl)
    return NextResponse.redirect(redirectUrl)
    
  } catch (e) {
    console.error('Unexpected error in auth callback:', e)
    return NextResponse.redirect(`${origin}/auth/auth-code-error?error=unexpected_error&details=${encodeURIComponent(String(e))}`)
  }
}