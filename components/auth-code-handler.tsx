'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export function AuthCodeHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  useEffect(() => {
    // If there's an auth code in the URL, redirect to callback
    const code = searchParams.get('code')
    if (code) {
      console.log('Auth code detected on root page, redirecting to callback...')
      const next = searchParams.get('next') || '/inventory'
      const state = searchParams.get('state')
      const error = searchParams.get('error')
      const errorDescription = searchParams.get('error_description')
      
      // Build the callback URL with all parameters
      const params = new URLSearchParams()
      params.set('code', code)
      params.set('next', next)
      
      if (state) params.set('state', state)
      if (error) params.set('error', error)
      if (errorDescription) params.set('error_description', errorDescription)
      
      const callbackUrl = `/auth/callback?${params.toString()}`
      
      console.log('Redirecting to:', callbackUrl)
      router.replace(callbackUrl)
    }
  }, [router, searchParams])

  // This component doesn't render anything
  return null
}
