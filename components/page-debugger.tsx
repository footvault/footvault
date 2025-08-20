'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export function PageDebugger() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  useEffect(() => {
    console.log('=== PAGE LOAD DEBUG ===')
    console.log('Pathname:', pathname)
    console.log('Search params:', Object.fromEntries(searchParams.entries()))
    console.log('Full URL:', window.location.href)
    console.log('User agent:', navigator.userAgent)
    console.log('Timestamp:', new Date().toISOString())
    
    // Check for any auth-related cookies
    const cookies = document.cookie.split(';').map(c => c.trim())
    const authCookies = cookies.filter(c => 
      c.includes('auth') || 
      c.includes('supabase') || 
      c.includes('session') ||
      c.includes('token')
    )
    
    console.log('Auth-related cookies found:', authCookies.length)
    authCookies.forEach(cookie => {
      const [name] = cookie.split('=')
      console.log(`Cookie: ${name}`)
    })
    
    // Check localStorage for any auth data
    try {
      const localStorageKeys = Object.keys(localStorage).filter(key =>
        key.includes('auth') || 
        key.includes('supabase') || 
        key.includes('session')
      )
      console.log('Auth-related localStorage keys:', localStorageKeys)
    } catch (e) {
      console.log('Cannot access localStorage:', e instanceof Error ? e.message : String(e))
    }
    
    console.log('=== END PAGE LOAD DEBUG ===')
  }, [pathname, searchParams])
  
  return null
}
