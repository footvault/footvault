import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')
  let next = searchParams.get('next') ?? '/inventory'
  if (!next.startsWith('/')) next = '/inventory'

  console.log('Auth callback called with:', {
    code: code ? 'present' : 'missing',
    error,
    errorDescription,
    searchParams: Object.fromEntries(searchParams)
  })

  // Handle OAuth errors from provider
  if (error) {
    console.error('OAuth provider error:', { error, errorDescription })
    return NextResponse.redirect(
      `${origin}/auth/auth-code-error?error=${error}&error_description=${encodeURIComponent(errorDescription || 'OAuth provider error')}`
    )
  }

  if (code) {
    try {
      // 1. Use cookie-aware client for code exchange (THIS IS CRITICAL)
      const cookieStore = await cookies()
      const supabase = await createClient(cookieStore)
      
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error('Auth exchange error:', error)
        return NextResponse.redirect(`${origin}/auth/auth-code-error?error=server_error&error_code=auth_exchange_failed&error_description=Failed+to+exchange+authorization+code:+${encodeURIComponent(error.message)}`)
      }

      const { session, user } = data
      console.log('User object:', user) // Debug logging

      if (user) {
        // 2. Use admin client for database operations
        const adminClient = await createAdminClient()
        
        // Check if user already exists in users table
        const { data: existingUser, error: userCheckError } = await adminClient
          .from('users')
          .select('id')
          .eq('id', user.id)
          .single()

        console.log('Existing user found:', existingUser ? 'Yes' : 'No')
        if (userCheckError) {
          console.log('User check error:', userCheckError)
        }

        // If user doesn't exist, create the full profile manually
        if (!existingUser) {
          const plan = 'Free'
          const email = user.email || 'NoEmail'
          const currency = 'USD'
          const username = user.user_metadata.full_name ?? email ?? 'NoName'

          // Create user profile
          const { error: insertUserError } = await adminClient.from('users').insert({
            id: user.id,
            username: username,
            plan: plan,
            email: email,
            currency: currency,
            timezone: 'America/New_York',
          })

          if (insertUserError) {
            console.error('Insert user error:', insertUserError)
            return NextResponse.redirect(`${origin}/auth/auth-code-error?error=server_error&error_code=user_creation_failed&error_description=Database+error+saving+new+user:+${encodeURIComponent(insertUserError.message)}`)
          }

          // Create Main avatar (only if it doesn't exist)
          const { data: existingAvatar, error: avatarCheckError } = await adminClient
            .from('avatars')
            .select('id')
            .eq('user_id', user.id)
            .eq('type', 'Main')
            .single()

          if (avatarCheckError && avatarCheckError.code !== 'PGRST116') {
            console.error('Avatar check error:', avatarCheckError)
          }

          if (!existingAvatar) {
            const avatarName = 'Main'
            const googleImage = user.user_metadata.avatar_url || null
            const fallbackInitials = email
              .split('@')[0]
              .split(/[._-]/)
              .map(part => part[0]?.toUpperCase())
              .join('')
              .slice(0, 2) || 'NN'
            const fallbackAvatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${fallbackInitials}`
            const avatarImage = googleImage ?? fallbackAvatarUrl

            const { error: insertAvatarError } = await adminClient.from('avatars').insert({
              name: avatarName,
              user_id: user.id,
              default_percentage: 100.00, // Changed from 0.00 to 100.00 for main avatar
              image: avatarImage,
              type: 'Main',
            })

            if (insertAvatarError) {
              console.error('Insert avatar error:', insertAvatarError)
              // Continue even if avatar creation fails
            }
          } else {
            console.log('Main avatar already exists for user, skipping creation')
          }

          // Create default payment type
          const { error: insertPaymentError } = await adminClient.from('payment_types').insert({
            user_id: user.id,
            name: 'Cash',
            fee_type: 'fixed',
            fee_value: 0.00
          })

          if (insertPaymentError) {
            console.error('Insert payment type error:', insertPaymentError)
            // Continue even if payment type creation fails
          }

          console.log('New user profile created successfully')
        } else {
          console.log('User already exists, skipping creation')
        }
      }

      // 3. Simplified redirect logic for production
      return NextResponse.redirect(`${origin}${next}`)
      
    } catch (unexpectedError) {
      console.error('Unexpected error in auth callback:', unexpectedError)
      return NextResponse.redirect(`${origin}/auth/auth-code-error?error=server_error&error_code=unexpected_error&error_description=An+unexpected+error+occurred+during+authentication`)
    }
  }

  // No code parameter
  return NextResponse.redirect(`${origin}/auth/auth-code-error?error=invalid_request&error_code=missing_code&error_description=Authorization+code+missing`)
}
