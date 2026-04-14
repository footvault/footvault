import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/server'

// Environment-aware redirect helper
function normalizeSiteUrl(origin: string): string {
  return origin.replace('https://footvault.dev', 'https://www.footvault.dev')
}

function getSiteUrl(request: Request): string {
  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto')

  if (forwardedHost) {
    return normalizeSiteUrl(`${forwardedProto || 'https'}://${forwardedHost}`)
  }

  return normalizeSiteUrl(new URL(request.url).origin)
}

function getRedirectUrl(request: Request, path: string): string {
  return `${getSiteUrl(request)}${path}`
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')
  let next = searchParams.get('next') ?? '/inventory'
  if (!next.startsWith('/')) next = '/inventory'

  if (error) {
    console.error('OAuth error received:', error, errorDescription)
    const errorUrl = getRedirectUrl(request, `/auth/auth-code-error?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(errorDescription || 'OAuth provider error')}`)
    return NextResponse.redirect(errorUrl)
  }

  try {
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    let user = null

    if (code) {
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (exchangeError) {
        console.error('Auth exchange error details:', {
          message: exchangeError.message,
          status: exchangeError.status,
          name: exchangeError.name,
        })

        if (exchangeError.message?.includes('expired')) {
          const errorUrl = getRedirectUrl(request, `/auth/auth-code-error?error=code_expired&details=${encodeURIComponent('Your sign-in link expired. Please try again.')}`)
          return NextResponse.redirect(errorUrl)
        }

        if (exchangeError.message?.includes('invalid')) {
          const errorUrl = getRedirectUrl(request, `/auth/auth-code-error?error=invalid_code&details=${encodeURIComponent('This sign-in link is no longer valid. Please try again.')}`)
          return NextResponse.redirect(errorUrl)
        }

        if (exchangeError.message?.includes('PKCE code verifier not found')) {
          const errorUrl = getRedirectUrl(request, `/auth/auth-code-error?error=pkce_verifier_missing&details=${encodeURIComponent('Your login session expired before Google finished signing you in. Please start again from this tab and keep the flow in the same browser.')}`)
          return NextResponse.redirect(errorUrl)
        }

        const errorUrl = getRedirectUrl(request, `/auth/auth-code-error?error=exchange_failed&details=${encodeURIComponent(exchangeError.message)}`)
        return NextResponse.redirect(errorUrl)
      }

      user = data.user
    } else if (tokenHash && type) {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type,
      })

      if (verifyError) {
        console.error('OTP verification error:', verifyError)
        const errorUrl = getRedirectUrl(request, `/auth/auth-code-error?error=otp_verification_failed&details=${encodeURIComponent(verifyError.message)}`)
        return NextResponse.redirect(errorUrl)
      }

      user = data.user
    } else {
      const errorUrl = getRedirectUrl(request, '/auth/auth-code-error?error=invalid_request&details=Missing+authentication+response')
      return NextResponse.redirect(errorUrl)
    }

    if (user) {
      const admin = await createAdminClient()

      const { data: existingUser } = await admin
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single()

      if (!existingUser) {
        const plan = 'Free'
        const email = user.email || 'NoEmail'
        const username = user.user_metadata.full_name ?? email ?? 'NoName'
        const currency = 'USD'

        const { error: userError } = await admin.from('users').insert({
          id: user.id,
          username,
          plan,
          email,
          currency,
          timezone: 'America/New_York',
        })

        if (userError) {
          console.error('Error creating user record:', userError)
        }

        // default avatar
        const initials = email.split('@')[0].slice(0, 2).toUpperCase()
        const fallback = `https://api.dicebear.com/7.x/initials/svg?seed=${initials}`
        const avatarImage = user.user_metadata.avatar_url ?? fallback

        const { error: avatarError } = await admin.from('avatars').insert({
          name: 'Main',
          user_id: user.id,
          default_percentage: 100.0,
          image: avatarImage,
          type: 'Main',
        })

        if (avatarError) {
          console.error('Error creating avatar record:', avatarError)
        }

        // default payment type
        const { error: paymentError } = await admin.from('payment_types').insert({
          user_id: user.id,
          name: 'Cash',
          fee_type: 'fixed',
          fee_value: 0.0,
        })

        if (paymentError) {
          console.error('Error creating payment type record:', paymentError)
        }
      }
    }

    const redirectUrl = getRedirectUrl(request, next)
    return NextResponse.redirect(redirectUrl)
  } catch (e) {
    console.error('Unexpected error in auth callback:', e)
    const errorUrl = getRedirectUrl(request, `/auth/auth-code-error?error=unexpected_error&details=${encodeURIComponent(String(e))}`)
    return NextResponse.redirect(errorUrl)
  }
}