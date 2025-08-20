'use client'

import { useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export function AuthCodeHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const hasRedirected = useRef(false)
  
  useEffect(() => {
    console.log('=== AUTH CODE HANDLER DEBUG ===')
    console.log('Current URL:', window.location.href)
    console.log('Search params:', Object.fromEntries(searchParams.entries()))
    console.log('Has redirected already:', hasRedirected.current)
    
    // Prevent multiple redirects
    if (hasRedirected.current) {
      console.log('Already redirected, skipping...')
      return
    }
    
    // If there's an auth code in the URL, redirect to callback
    const code = searchParams.get('code')
    const error = searchParams.get('error')
    
    console.log('Code found:', !!code)
    console.log('Error found:', !!error)
    
    if (code) {
      console.log('🔄 Auth code detected on root page, redirecting to callback...')
      hasRedirected.current = true
      
      const next = searchParams.get('next') || '/inventory'
      const state = searchParams.get('state')
      const errorDescription = searchParams.get('error_description')
      
      console.log('Redirect parameters:', { code: code.substring(0, 8) + '...', next, state: !!state, error, errorDescription })
      
      // Build the callback URL with all parameters
      const params = new URLSearchParams()
      params.set('code', code)
      params.set('next', next)
      
      if (state) params.set('state', state)
      if (error) params.set('error', error)
      if (errorDescription) params.set('error_description', errorDescription)
      
      const callbackUrl = `/auth/callback?${params.toString()}`
      
      console.log('🎯 Redirecting to callback URL:', callbackUrl)
      
      // Use replace to avoid back button issues
      router.replace(callbackUrl)
    } else if (error) {
      console.log('❌ OAuth error detected:', error)
      console.log('Error description:', searchParams.get('error_description'))
    } else {
      console.log('✅ No auth code or error found, normal page load')
    }
    
    console.log('=== END AUTH CODE HANDLER ===')
  }, [router, searchParams])

  // This component doesn't render anything
  return null
}
