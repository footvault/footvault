"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function AuthDebugPage() {
  const [authInfo, setAuthInfo] = useState<any>(null)
  const [session, setSession] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient()
        
        // Check current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          setError(`Session error: ${sessionError.message}`)
        } else {
          setSession(session)
        }

        // Check current user
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError) {
          setError(`User error: ${userError.message}`)
        } else {
          setAuthInfo({
            user,
            isAuthenticated: !!user,
            userId: user?.id,
            email: user?.email,
            provider: user?.app_metadata?.provider,
            lastSignIn: user?.last_sign_in_at
          })
        }
      } catch (err) {
        setError(`Unexpected error: ${err instanceof Error ? err.message : 'Unknown'}`)
      }
    }

    checkAuth()
  }, [])

  const testDatabaseHealth = async () => {
    try {
      const response = await fetch('/api/health/database')
      const data = await response.json()
      console.log('Database health:', data)
      alert(`Database Status: ${data.status}\nTables: users=${data.database?.tables?.users}, avatars=${data.database?.tables?.avatars}\nPolicies: ${data.database?.policies}`)
    } catch (err) {
      alert(`Database health check failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const signOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.reload()
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Debug Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-600">{error}</p>
              </div>
            )}

            <div>
              <h3 className="font-medium mb-2">Authentication Status</h3>
              <pre className="bg-gray-100 p-4 rounded-md text-sm overflow-auto">
                {JSON.stringify(authInfo, null, 2)}
              </pre>
            </div>

            <div>
              <h3 className="font-medium mb-2">Session Information</h3>
              <pre className="bg-gray-100 p-4 rounded-md text-sm overflow-auto">
                {JSON.stringify(session, null, 2)}
              </pre>
            </div>

            <div className="flex gap-4">
              <Button onClick={testDatabaseHealth}>
                Test Database Health
              </Button>
              
              {session && (
                <Button onClick={signOut} variant="outline">
                  Sign Out
                </Button>
              )}
            </div>

            <div>
              <h3 className="font-medium mb-2">Troubleshooting Steps</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                <li>Check if your Supabase Google OAuth is configured correctly</li>
                <li>Verify the redirect URL matches your Supabase project settings</li>
                <li>Ensure your database has the required tables and RLS policies</li>
                <li>Check browser console for any JavaScript errors</li>
                <li>Try clearing browser cookies and cache</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
