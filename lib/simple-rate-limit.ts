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
    // Skip rate limiting in development if bypass is enabled OR if NODE_ENV is development
    if (process.env.NODE_ENV === 'development' || process.env.BYPASS_RATE_LIMIT === 'true') {
      console.log('🚀 Rate limiting bypassed for development');
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

// Rate limit configurations - Extremely lenient for development/testing
export const rateLimits = {
  // Product search - very permissive for testing
  productSearch: {
    windowMs: 500, // 0.5 seconds
    maxRequests: 50, // 50 requests per 0.5 seconds (100 per second!)
    message: 'Product search rate limited. Please wait a moment.'
  },
  
  // General API endpoints - extremely high limit
  api: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 2000, // 2000 requests per minute
    message: 'Too many API requests. Please wait a moment.'
  },
  
  // Dashboard/Stats endpoints - virtually unlimited for frequent updates
  dashboard: {
    windowMs: 5 * 1000, // 5 seconds
    maxRequests: 500, // 500 requests per 5 seconds
    message: 'Dashboard update rate limited. Please wait a moment.'
  },
  
  // Authentication endpoints - very lenient
  auth: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 100, // 100 attempts per 5 minutes
    message: 'Too many authentication attempts. Please wait 5 minutes.'
  }
}
