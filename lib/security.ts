import { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Input validation and sanitization
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>\"']/g, '') // Remove potential XSS characters
    .trim()
    .slice(0, 1000) // Limit length
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) && email.length <= 254
}

export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }
  
  if (password.length > 128) {
    errors.push('Password must be less than 128 characters')
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number')
  }
  
  if (!/[^a-zA-Z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

// Authentication validation
export async function validateAuthToken(req: NextRequest): Promise<{
  valid: boolean
  user: any | null
  error?: string
}> {
  try {
    const authHeader = req.headers.get('Authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { valid: false, user: null, error: 'Missing or invalid authorization header' }
    }

    const token = authHeader.substring(7)
    
    // Create Supabase client for server-side authentication
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return req.cookies.get(name)?.value
          },
        },
      }
    )
    
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      return { valid: false, user: null, error: 'Invalid or expired token' }
    }

    return { valid: true, user }
  } catch (error) {
    return { valid: false, user: null, error: 'Authentication error' }
  }
}

// Request validation
export function validateContentType(req: NextRequest, expectedTypes: string[]): boolean {
  const contentType = req.headers.get('content-type')
  if (!contentType) return false
  
  return expectedTypes.some(type => contentType.includes(type))
}

export function validateRequestSize(req: NextRequest, maxSize: number = 10 * 1024 * 1024): boolean {
  const contentLength = req.headers.get('content-length')
  if (!contentLength) return true // Let it proceed if no content-length
  
  return parseInt(contentLength) <= maxSize
}

// Security headers
export function getSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https:",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; '),
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Permissions-Policy': [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'payment=()',
      'usb=()',
      'magnetometer=()',
      'accelerometer=()',
      'gyroscope=()'
    ].join(', ')
  }
}

// Data validation
export function validateProductData(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.push('Product name is required')
  }
  
  if (data.name && data.name.length > 255) {
    errors.push('Product name must be less than 255 characters')
  }
  
  if (!data.sku || typeof data.sku !== 'string' || data.sku.trim().length === 0) {
    errors.push('SKU is required')
  }
  
  if (data.sku && data.sku.length > 100) {
    errors.push('SKU must be less than 100 characters')
  }
  
  if (data.original_price !== undefined) {
    const price = parseFloat(data.original_price)
    if (isNaN(price) || price < 0 || price > 999999.99) {
      errors.push('Original price must be a valid positive number less than 999,999.99')
    }
  }
  
  if (data.sale_price !== undefined) {
    const price = parseFloat(data.sale_price)
    if (isNaN(price) || price < 0 || price > 999999.99) {
      errors.push('Sale price must be a valid positive number less than 999,999.99')
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

export function validateVariantData(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!data.size || typeof data.size !== 'string' || data.size.trim().length === 0) {
    errors.push('Size is required')
  }
  
  if (data.size && data.size.length > 20) {
    errors.push('Size must be less than 20 characters')
  }
  
  if (!data.location || typeof data.location !== 'string' || data.location.trim().length === 0) {
    errors.push('Location is required')
  }
  
  if (data.location && data.location.length > 100) {
    errors.push('Location must be less than 100 characters')
  }
  
  if (data.quantity !== undefined) {
    const qty = parseInt(data.quantity)
    if (isNaN(qty) || qty < 1 || qty > 10000) {
      errors.push('Quantity must be a valid number between 1 and 10,000')
    }
  }
  
  const validStatuses = ['Available', 'Sold', 'Reserved', 'PullOut', 'PreOrder']
  if (data.status && !validStatuses.includes(data.status)) {
    errors.push(`Status must be one of: ${validStatuses.join(', ')}`)
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

// IP-based security checks
export function isValidIP(ip: string): boolean {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip)
}

// Simple IP blocking (in production, use a proper blocklist service)
const blockedIPs = new Set<string>()

export function blockIP(ip: string): void {
  blockedIPs.add(ip)
}

export function isIPBlocked(ip: string): boolean {
  return blockedIPs.has(ip)
}

export function unblockIP(ip: string): void {
  blockedIPs.delete(ip)
}
