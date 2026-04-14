import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const provider = searchParams.get('provider') || 'google'
  let next = searchParams.get('next') ?? '/inventory'

  if (!next.startsWith('/')) {
    next = '/inventory'
  }

  if (provider !== 'google') {
    const errorUrl = new URL('/auth/auth-code-error', getSiteUrl(request))
    errorUrl.searchParams.set('error', 'unsupported_provider')
    errorUrl.searchParams.set('details', 'Only Google sign-in is currently supported.')
    return NextResponse.redirect(errorUrl)
  }

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

  const redirectTo = `${getSiteUrl(request)}/auth/callback?next=${encodeURIComponent(next)}`
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: {
        prompt: 'select_account',
      },
    },
  })

  if (error || !data.url) {
    const errorUrl = new URL('/auth/auth-code-error', getSiteUrl(request))
    errorUrl.searchParams.set('error', 'oauth_start_failed')
    errorUrl.searchParams.set('details', error?.message || 'Unable to start Google sign-in.')
    return NextResponse.redirect(errorUrl)
  }

  return NextResponse.redirect(data.url)
}