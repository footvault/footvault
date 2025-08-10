import { NextRequest, NextResponse } from 'next/server'

// Simple in-memory rate limiting store
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  message?: string
}

export function rateLimit(config: RateLimitConfig) {
  return async (req: NextRequest): Promise<NextResponse | null> => {
    // Skip rate limiting in development if bypass is enabled
    if (process.env.NODE_ENV === 'development' && process.env.BYPASS_RATE_LIMIT === 'true') {
      return null
    }

    const ip = getClientIP(req)
    const now = Date.now()
    
    // Clean expired entries
    for (const [key, value] of rateLimitStore.entries()) {
      if (value.resetTime < now) {
        rateLimitStore.delete(key)
      }
    }

    const current = rateLimitStore.get(ip)
    
    if (!current) {
      // First request
      rateLimitStore.set(ip, {
        count: 1,
        resetTime: now + config.windowMs
      })
      return null
    }

    if (current.resetTime < now) {
      // Window expired, reset
      rateLimitStore.set(ip, {
        count: 1,
        resetTime: now + config.windowMs
      })
      return null
    }

    if (current.count >= config.maxRequests) {
      // Rate limit exceeded
      const resetIn = Math.ceil((current.resetTime - now) / 1000)
      
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: config.message || `Too many requests. Please wait ${resetIn} seconds.`,
          retryAfter: resetIn
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': Math.ceil(current.resetTime / 1000).toString(),
            'Retry-After': resetIn.toString()
          }
        }
      )
    }

    // Increment counter
    current.count++
    return null
  }
}

function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  const realIP = req.headers.get('x-real-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  return realIP || 'unknown'
}

// Rate limit configurations - Very lenient for development/testing
export const rateLimits = {
  // Product search - very permissive
  productSearch: {
    windowMs: 1000, // 1 second
    maxRequests: 10, // 10 requests per second
    message: 'Product search rate limited. Please wait 1 second between searches.'
  },
  
  // General API endpoints - very high limit
  api: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 500, // 500 requests per minute
    message: 'Too many API requests. Please wait a moment.'
  },
  
  // Dashboard/Stats endpoints - extremely permissive for frequent updates
  dashboard: {
    windowMs: 10 * 1000, // 10 seconds
    maxRequests: 100, // 100 requests per 10 seconds
    message: 'Dashboard update rate limited. Please wait a moment.'
  },
  
  // Authentication endpoints - more lenient
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 50, // 20 attempts per 15 minutes
    message: 'Too many authentication attempts. Please wait 15 minutes.'
  }
}
