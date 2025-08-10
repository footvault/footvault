import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, rateLimits } from '@/lib/simple-rate-limit'
import { getSecurityHeaders } from '@/lib/simple-security'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Apply security headers to all responses
  const response = NextResponse.next()
  const securityHeaders = getSecurityHeaders()
  
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  // Rate limit product search API (very strict due to external API costs)
  if (pathname === '/api/search-kicks-dev') {
    const searchRateLimit = rateLimit(rateLimits.productSearch)
    const rateLimitResponse = await searchRateLimit(request)
    
    if (rateLimitResponse) {
      // Add security headers to rate limit response
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

  return response
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
