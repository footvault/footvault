import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/server'

// Environment-aware redirect helper
function getRedirectUrl(request: Request, path: string): string {
  const url = new URL(request.url)
  const { origin } = url
  
  // For production, check forwarded headers
  if (process.env.NODE_ENV === 'production') {
    const forwardedHost = request.headers.get('x-forwarded-host')
    const forwardedProto = request.headers.get('x-forwarded-proto')
    
    if (forwardedHost) {
      const protocol = forwardedProto || 'https'
      return `${protocol}://${forwardedHost}${path}`
    }
  }
  
  // Default to origin + path
  return `${origin}${path}`
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')
  let next = searchParams.get('next') ?? '/inventory'
  if (!next.startsWith('/')) next = '/inventory'

  // Add debugging logs
  console.log('=== AUTH CALLBACK DEBUG ===')
  console.log('Request URL:', request.url)
  console.log('Environment:', process.env.NODE_ENV)
  console.log('Code:', code?.substring(0, 8) + '...')
  console.log('Next:', next)
  console.log('Forwarded Host:', request.headers.get('x-forwarded-host'))
  console.log('Forwarded Proto:', request.headers.get('x-forwarded-proto'))
  console.log('========================')

  if (error) {
    console.error('OAuth error received:', error, errorDescription)
    const errorUrl = getRedirectUrl(request, `/auth/auth-code-error?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(errorDescription || 'OAuth provider error')}`)
    return NextResponse.redirect(errorUrl)
  }

  if (!code) {
    console.error('No authorization code received')
    const errorUrl = getRedirectUrl(request, '/auth/auth-code-error?error=invalid_request&error_description=Missing+authorization+code')
    return NextResponse.redirect(errorUrl)
  }

  try {
    // 1. Create cookie-aware client (for session exchange)
    const cookieStore = await cookies()
    
    console.log('Creating Supabase client with environment:', {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...',
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      nodeEnv: process.env.NODE_ENV
    })
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name) {
            const value = cookieStore.get(name)?.value
            console.log(`Cookie GET ${name}:`, value?.substring(0, 20) + '...' || 'undefined')
            return value
          },
          set(name, value, options) {
            console.log(`Cookie SET ${name}:`, value?.substring(0, 20) + '...', options)
            // Enhanced cookie options for production
            const cookieOptions = {
              ...options,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax' as const,
              httpOnly: false, // Don't force httpOnly for auth tokens
              path: '/'
            }
            cookieStore.set({ name, value, ...cookieOptions })
          },
          remove(name, options) {
            console.log(`Cookie REMOVE ${name}`)
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )

    // 2. Exchange code → sets session cookie
    console.log('Attempting to exchange code for session...')
    console.log('Code length:', code.length)
    console.log('Code starts with:', code.substring(0, 8))
    
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (exchangeError) {
      console.error('Auth exchange error details:', {
        message: exchangeError.message,
        status: exchangeError.status,
        name: exchangeError.name
      })
      
      // Check if it's a specific error type
      if (exchangeError.message?.includes('expired')) {
        return NextResponse.redirect(`${origin}/auth/auth-code-error?error=code_expired&details=${encodeURIComponent('Authorization code has expired. Please try signing in again.')}`)
      } else if (exchangeError.message?.includes('invalid')) {
        return NextResponse.redirect(`${origin}/auth/auth-code-error?error=invalid_code&details=${encodeURIComponent('Invalid authorization code. Please try signing in again.')}`)
      }
      
      return NextResponse.redirect(`${origin}/auth/auth-code-error?error=exchange_failed&details=${encodeURIComponent(exchangeError.message)}`)
    }

    console.log('Code exchange successful!')
    console.log('Session data:', {
      hasUser: !!data.user,
      userId: data.user?.id,
      userEmail: data.user?.email,
      hasSession: !!data.session,
      accessToken: data.session?.access_token?.substring(0, 20) + '...'
    })

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

    // 4. Environment-aware redirect
    const redirectUrl = getRedirectUrl(request, next)
    console.log('Final redirect URL:', redirectUrl)
    return NextResponse.redirect(redirectUrl)
    
  } catch (e) {
    console.error('Unexpected error in auth callback:', e)
    const errorUrl = getRedirectUrl(request, `/auth/auth-code-error?error=unexpected_error&details=${encodeURIComponent(String(e))}`)
    return NextResponse.redirect(errorUrl)
  }
}