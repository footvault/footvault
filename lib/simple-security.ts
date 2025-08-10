import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function validateAuth(req: NextRequest): Promise<{
  valid: boolean
  user: any | null
  error?: string
}> {
  try {
    const authHeader = req.headers.get('Authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { valid: false, user: null, error: 'Missing authorization header' }
    }

    const token = authHeader.substring(7)
    
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
      return { valid: false, user: null, error: 'Invalid token' }
    }

    return { valid: true, user }
  } catch (error) {
    return { valid: false, user: null, error: 'Authentication error' }
  }
}

export function validateInput(input: string, maxLength: number = 1000): string {
  return input
    .replace(/[<>\"']/g, '') // Remove XSS characters
    .trim()
    .slice(0, maxLength)
}

export function getSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  }
}
