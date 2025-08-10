import { NextRequest, NextResponse } from 'next/server'

// Simple in-memory store for rate limiting
// In production, use Redis or a database
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

interface RateLimitOptions {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  keyGenerator?: (req: NextRequest) => string
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
  onLimitReached?: (req: NextRequest) => NextResponse | null
}

export type { RateLimitOptions }

export function rateLimit(options: RateLimitOptions) {
  const {
    windowMs,
    maxRequests,
    keyGenerator = (req) => getClientIP(req),
    onLimitReached
  } = options

  return async (req: NextRequest): Promise<NextResponse | null> => {
    const key = keyGenerator(req)
    const now = Date.now()
    const windowStart = now - windowMs

    // Clean expired entries
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.resetTime < now) {
        rateLimitStore.delete(k)
      }
    }

    const current = rateLimitStore.get(key)
    
    if (!current) {
      // First request
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + windowMs
      })
      return null
    }

    if (current.resetTime < now) {
      // Window expired, reset
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + windowMs
      })
      return null
    }

    if (current.count >= maxRequests) {
      // Rate limit exceeded
      const resetIn = Math.ceil((current.resetTime - now) / 1000)
      
      if (onLimitReached) {
        return onLimitReached(req)
      }

      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: `Too many requests. Please try again in ${resetIn} seconds.`,
          retryAfter: resetIn
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': Math.ceil(current.resetTime / 1000).toString(),
            'Retry-After': resetIn.toString()
          }
        }
      )
    }

    // Increment counter
    current.count++
    rateLimitStore.set(key, current)
    
    return null
  }
}

// Get client IP address
function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  const realIP = req.headers.get('x-real-ip')
  const cfIP = req.headers.get('cf-connecting-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (realIP) {
    return realIP
  }
  
  if (cfIP) {
    return cfIP
  }
  
  // Fallback to unknown if no IP found
  return 'unknown'
}

// Predefined rate limit configurations
export const rateLimitConfigs = {
  strict: { windowMs: 15 * 60 * 1000, maxRequests: 5 }, // 5 requests per 15 minutes
  moderate: { windowMs: 15 * 60 * 1000, maxRequests: 50 }, // 50 requests per 15 minutes
  relaxed: { windowMs: 15 * 60 * 1000, maxRequests: 100 }, // 100 requests per 15 minutes
  api: { windowMs: 60 * 1000, maxRequests: 60 }, // 60 requests per minute
  search: { windowMs: 60 * 1000, maxRequests: 30 }, // 30 requests per minute
  auth: { windowMs: 15 * 60 * 1000, maxRequests: 10 }, // 10 requests per 15 minutes
  upload: { windowMs: 60 * 1000, maxRequests: 5 }, // 5 requests per minute
}

// Rate limit by authenticated user
export function rateLimitByUser(options: RateLimitOptions & { getUserId: (req: NextRequest) => string | null }) {
  return rateLimit({
    ...options,
    keyGenerator: (req) => {
      const userId = options.getUserId(req)
      return userId ? `user:${userId}` : `ip:${getClientIP(req)}`
    }
  })
}
