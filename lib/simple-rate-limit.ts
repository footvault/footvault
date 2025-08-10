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

// Rate limit configurations
export const rateLimits = {
  // Product search - relaxed for better UX
  productSearch: {
    windowMs: 1000, // 1 second
    maxRequests: 2, // 2 requests per second
    message: 'Product search rate limited. Please wait 1 second between searches.'
  },
  
  // General API endpoints - increased for dashboard calls
  api: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 120, // 120 requests per minute (2 per second)
    message: 'Too many API requests. Please wait a moment.'
  },
  
  // Dashboard/Stats endpoints - more permissive for frequent updates
  dashboard: {
    windowMs: 30 * 1000, // 30 seconds
    maxRequests: 30, // 30 requests per 30 seconds
    message: 'Dashboard update rate limited. Please wait a moment.'
  },
  
  // Authentication endpoints
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts per 15 minutes
    message: 'Too many authentication attempts. Please wait 15 minutes.'
  }
}
