'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function ClientAuthRedirect() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  useEffect(() => {
    let mounted = true
    
    const checkAuth = async () => {
      console.log('=== CLIENT AUTH REDIRECT DEBUG ===')
      console.log('Starting auth check...')
      console.log('Component mounted:', mounted)
      
      // Skip auth check if we have OAuth parameters (prevent loop)
      const hasOAuthParams = searchParams.get('code') || searchParams.get('error')
      if (hasOAuthParams) {
        console.log('🚫 OAuth parameters detected, skipping auth check to prevent loops')
        return
      }
      
      try {
        const supabase = createClient(undefined)
        console.log('Supabase client created')
        
        const { data: { user }, error } = await supabase.auth.getUser()
        
        console.log('Auth check result:', {
          hasUser: !!user,
          userId: user?.id,
          userEmail: user?.email,
          error: error?.message
        })
        
        if (error) {
          console.log('❌ Auth check error:', error)
          return
        }
        
        if (user && mounted) {
          console.log('✅ User found, redirecting to inventory...')
          router.push('/inventory')
        } else if (!user) {
          console.log('ℹ️ No user found, staying on homepage')
        } else {
          console.log('⚠️ Component unmounted, skipping redirect')
        }
      } catch (error) {
        console.error('❌ Client auth check error:', error)
      }
      
      console.log('=== END CLIENT AUTH REDIRECT ===')
    }
    
    // Longer delay to let OAuth codes be handled first and prevent loops
    console.log('⏱️ Setting timeout for auth check (500ms)...')
    const timeoutId = setTimeout(checkAuth, 500)
    
    return () => {
      console.log('🧹 Cleaning up ClientAuthRedirect component')
      mounted = false
      clearTimeout(timeoutId)
    }
  }, [router, searchParams])
  
  return null
}
