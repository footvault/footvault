import { NextRequest, NextResponse } from 'next/server'
import { validateAuthToken, validateContentType, validateRequestSize, getSecurityHeaders } from '@/lib/security'
import { rateLimit, RateLimitOptions } from '@/lib/rate-limit'

interface SecureAPIOptions {
  requireAuth?: boolean
  allowedMethods?: string[]
  maxRequestSize?: number
  allowedContentTypes?: string[]
  rateLimit?: {
    windowMs: number
    maxRequests: number
  }
  validation?: (data: any) => { valid: boolean; errors: string[] }
}

type APIHandler = (
  req: NextRequest,
  context: { params?: any; user?: any }
) => Promise<NextResponse> | NextResponse

export function secureAPI(handler: APIHandler, options: SecureAPIOptions = {}) {
  const {
    requireAuth = true,
    allowedMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    maxRequestSize = 10 * 1024 * 1024, // 10MB
    allowedContentTypes = ['application/json', 'multipart/form-data'],
    rateLimit: rateLimitConfig,
    validation
  } = options

  return async (req: NextRequest, context?: { params?: any }) => {
    const securityHeaders = getSecurityHeaders()

    try {
      // Method validation
      if (!allowedMethods.includes(req.method)) {
        return NextResponse.json(
          { error: 'Method not allowed' },
          { status: 405, headers: { ...securityHeaders, Allow: allowedMethods.join(', ') } }
        )
      }

      // Rate limiting
      if (rateLimitConfig) {
        const rateLimitCheck = rateLimit({
          windowMs: rateLimitConfig.windowMs,
          maxRequests: rateLimitConfig.maxRequests,
          keyGenerator: requireAuth 
            ? (req) => req.headers.get('Authorization')?.substring(7) || 'anonymous'
            : undefined
        })
        
        const rateLimitResponse = await rateLimitCheck(req)
        if (rateLimitResponse) {
          Object.entries(securityHeaders).forEach(([key, value]) => {
            rateLimitResponse.headers.set(key, value)
          })
          return rateLimitResponse
        }
      }

      // Request size validation
      if (!validateRequestSize(req, maxRequestSize)) {
        return NextResponse.json(
          { error: 'Request too large', maxSize: `${maxRequestSize / (1024 * 1024)}MB` },
          { status: 413, headers: securityHeaders }
        )
      }

      // Content type validation for non-GET requests
      if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        if (!validateContentType(req, allowedContentTypes)) {
          return NextResponse.json(
            { error: 'Invalid content type', allowed: allowedContentTypes },
            { status: 415, headers: securityHeaders }
          )
        }
      }

      let user = null

      // Authentication
      if (requireAuth) {
        const authResult = await validateAuthToken(req)
        if (!authResult.valid) {
          return NextResponse.json(
            { error: 'Unauthorized', message: authResult.error },
            { status: 401, headers: securityHeaders }
          )
        }
        user = authResult.user
      }

      // Input validation
      if (validation && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
        try {
          const body = await req.json()
          const validationResult = validation(body)
          
          if (!validationResult.valid) {
            return NextResponse.json(
              { error: 'Validation failed', errors: validationResult.errors },
              { status: 400, headers: securityHeaders }
            )
          }
        } catch (error) {
          return NextResponse.json(
            { error: 'Invalid JSON' },
            { status: 400, headers: securityHeaders }
          )
        }
      }

      // Call the actual handler
      const response = await handler(req, { params: context?.params, user })

      // Add security headers to the response
      Object.entries(securityHeaders).forEach(([key, value]) => {
        response.headers.set(key, value)
      })

      return response

    } catch (error) {
      console.error('API Security Error:', error)
      
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500, headers: securityHeaders }
      )
    }
  }
}

// Predefined secure API configurations
export const secureConfigs = {
  // For public APIs that don't require authentication
  public: {
    requireAuth: false,
    allowedMethods: ['GET'],
    rateLimit: { windowMs: 60 * 1000, maxRequests: 100 }
  },

  // For authenticated user APIs
  authenticated: {
    requireAuth: true,
    allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    rateLimit: { windowMs: 60 * 1000, maxRequests: 60 }
  },

  // For search APIs
  search: {
    requireAuth: true,
    allowedMethods: ['GET', 'POST'],
    rateLimit: { windowMs: 60 * 1000, maxRequests: 30 }
  },

  // For upload APIs
  upload: {
    requireAuth: true,
    allowedMethods: ['POST'],
    maxRequestSize: 50 * 1024 * 1024, // 50MB
    allowedContentTypes: ['multipart/form-data'],
    rateLimit: { windowMs: 60 * 1000, maxRequests: 5 }
  },

  // For sensitive operations
  sensitive: {
    requireAuth: true,
    allowedMethods: ['POST', 'PUT', 'DELETE'],
    rateLimit: { windowMs: 15 * 60 * 1000, maxRequests: 10 } // 10 requests per 15 minutes
  }
}

// Helper to create method-specific handlers
export function createMethodHandler(handlers: Record<string, APIHandler>, options: SecureAPIOptions = {}) {
  return secureAPI(async (req, context) => {
    const method = req.method
    const handler = handlers[method]
    
    if (!handler) {
      return NextResponse.json(
        { error: `Method ${method} not implemented` },
        { status: 501 }
      )
    }
    
    return handler(req, context)
  }, options)
}
