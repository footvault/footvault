"use client"

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default function AuthCodeErrorPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [errorDetails, setErrorDetails] = useState<{
    error?: string
    error_code?: string
    error_description?: string
  }>({})

  useEffect(() => {
    const error = searchParams.get('error')
    const error_code = searchParams.get('error_code')
    const error_description = searchParams.get('error_description')

    setErrorDetails({
      error: error || undefined,
      error_code: error_code || undefined,
      error_description: error_description || undefined
    })
  }, [searchParams])

  const getErrorMessage = () => {
    if (errorDetails.error_description) {
      const decoded = decodeURIComponent(errorDetails.error_description.replace(/\+/g, ' '))
      
      if (decoded.includes('Database error saving new user')) {
        return 'There was an issue creating your account. This might be due to database permissions or configuration.'
      }
      
      return decoded
    }
    
    return 'An authentication error occurred. Please try again.'
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>
          <CardTitle className="text-2xl text-red-600">Authentication Error</CardTitle>
          <CardDescription>
            We encountered an issue during the sign-in process
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <p className="text-sm text-red-800">
              {getErrorMessage()}
            </p>
            
            {errorDetails.error_code && (
              <p className="text-xs text-red-600 mt-2">
                Error Code: {errorDetails.error_code}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Button 
              onClick={() => router.push('/login')} 
              className="w-full"
            >
              Try Again
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => router.push('/')} 
              className="w-full"
            >
              Go Home
            </Button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              If this problem persists, please{' '}
              <Link href="/contact" className="text-blue-600 hover:underline">
                contact support
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
