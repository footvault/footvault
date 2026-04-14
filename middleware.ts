import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, rateLimits } from '@/lib/simple-rate-limit'
import { getSecurityHeaders } from '@/lib/simple-security'
import { updateSession } from '@/lib/supabase/middleware'

function getCanonicalHost(host: string | null): string | null {
  if (!host) return null

  const normalizedHost = host.toLowerCase()
  if (normalizedHost === 'footvault.dev') {
    return 'www.footvault.dev'
  }

  return null
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const canonicalHost = getCanonicalHost(request.headers.get('host'))
  
  const securityHeaders = getSecurityHeaders()

  if (canonicalHost) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.host = canonicalHost
    redirectUrl.protocol = 'https:'

    const redirectResponse = NextResponse.redirect(redirectUrl, 308)
    Object.entries(securityHeaders).forEach(([key, value]) => {
      redirectResponse.headers.set(key, value)
    })
    return redirectResponse
  }

  // Rate limit product search API (very strict due to external API costs)
  if (pathname === '/api/search-kicks-dev') {
    const searchRateLimit = rateLimit(rateLimits.productSearch)
    const rateLimitResponse = await searchRateLimit(request)
    
    if (rateLimitResponse) {
      Object.entries(securityHeaders).forEach(([key, value]) => {
        rateLimitResponse.headers.set(key, value)
      })
      return rateLimitResponse
    }
  }
  
  // Rate limit authentication endpoints
  if (pathname.startsWith('/api/auth') || pathname.includes('login') || pathname.includes('signup')) {
    const authRateLimit = rateLimit(rateLimits.auth)
    const rateLimitResponse = await authRateLimit(request)
    
    if (rateLimitResponse) {
      Object.entries(securityHeaders).forEach(([key, value]) => {
        rateLimitResponse.headers.set(key, value)
      })
      return rateLimitResponse
    }
  }
  
  // Rate limit dashboard/stats endpoints with more lenient limits
  if (pathname === '/api/inventory-value' || 
      pathname === '/api/variant-limits' || 
      pathname === '/api/user-plan' ||
      pathname.includes('stats')) {
    const dashboardRateLimit = rateLimit(rateLimits.dashboard)
    const rateLimitResponse = await dashboardRateLimit(request)
    
    if (rateLimitResponse) {
      Object.entries(securityHeaders).forEach(([key, value]) => {
        rateLimitResponse.headers.set(key, value)
      })
      return rateLimitResponse
    }
  }
  
  // Rate limit other API endpoints
  else if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth')) {
    const apiRateLimit = rateLimit(rateLimits.api)
    const rateLimitResponse = await apiRateLimit(request)
    
    if (rateLimitResponse) {
      Object.entries(securityHeaders).forEach(([key, value]) => {
        rateLimitResponse.headers.set(key, value)
      })
      return rateLimitResponse
    }
  }

  // Validate request size for API routes
  if (pathname.startsWith('/api/')) {
    const contentLength = request.headers.get('content-length')
    const maxSize = 10 * 1024 * 1024 // 10MB
    
    if (contentLength && parseInt(contentLength) > maxSize) {
      return NextResponse.json(
        { error: 'Request too large', maxSize: '10MB' },
        { status: 413, headers: securityHeaders }
      )
    }
  }

  // Update Supabase session (refreshes auth cookies on every request)
  const response = await updateSession(request)

  // Apply security headers to the response
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  return response
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
