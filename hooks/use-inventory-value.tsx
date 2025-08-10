'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface UseInventoryValueReturn {
  totalValue: number
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useInventoryValue(): UseInventoryValueReturn {
  const [totalValue, setTotalValue] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchInventoryValue = async () => {
    try {
      setLoading(true)
      setError(null)

      const supabase = createClient()
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError || !session?.access_token) {
        setError('Authentication required')
        setTotalValue(0)
        return
      }

      const res = await fetch('/api/inventory-value', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (!res.ok) {
        if (res.status === 429) {
          setError('Rate limit exceeded. Please wait a moment.')
          return
        }
        throw new Error(`HTTP error! status: ${res.status}`)
      }

      const json = await res.json()
      
      if (typeof json.totalCost === 'number') {
        setTotalValue(json.totalCost)
      } else {
        setTotalValue(0)
      }
    } catch (err) {
      console.error('Error fetching inventory value:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch inventory value')
      setTotalValue(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInventoryValue()
  }, [])

  return {
    totalValue,
    loading,
    error,
    refetch: fetchInventoryValue,
  }
}
