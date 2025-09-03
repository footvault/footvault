"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'
import { ConsignorDashboardStats } from '@/lib/types/consignor'
import { Loader2, DollarSign, Calendar } from 'lucide-react'
import { useCurrency } from '@/context/CurrencyContext'
import { getCurrencySymbol } from '@/lib/utils/currency'

interface ProcessPayoutModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  consignor: ConsignorDashboardStats | null
  onPayoutProcessed: () => void
}

export function ProcessPayoutModal({ 
  open, 
  onOpenChange, 
  consignor, 
  onPayoutProcessed 
}: ProcessPayoutModalProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [payoutAmount, setPayoutAmount] = useState('')
  const [payoutMethod, setPayoutMethod] = useState('')
  const [customPaymentMethod, setCustomPaymentMethod] = useState('')
  const [showCustomPayment, setShowCustomPayment] = useState(false)
  const [payoutDate, setPayoutDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [paymentMethods, setPaymentMethods] = useState<{
    standard_methods: string[]
    custom_methods: Array<{ id: number; method_name: string; description?: string }>
  }>({ standard_methods: [], custom_methods: [] })
  
  const { currency } = useCurrency()
  const currencySymbol = getCurrencySymbol(currency)
  const supabase = createClient()

  // Fetch payment methods when component mounts
  React.useEffect(() => {
    const fetchPaymentMethods = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) return

        const response = await fetch('/api/payment-methods', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        })

        if (response.ok) {
          const methods = await response.json()
          setPaymentMethods(methods)
        }
      } catch (error) {
        console.error('Error fetching payment methods:', error)
      }
    }

    if (open) {
      fetchPaymentMethods()
    }
  }, [open, supabase.auth])

  // Set default values when modal opens
  React.useEffect(() => {
    if (open && consignor) {
      setPayoutAmount(consignor.pending_payout?.toString() || '0')
      setPayoutMethod(consignor.payment_method || 'PayPal')
      setShowCustomPayment(false)
      setCustomPaymentMethod('')
      setPayoutDate(new Date().toISOString().split('T')[0])
      setNotes('')
    }
  }, [open, consignor])

  const handleProcessPayout = async () => {
    if (!consignor || !payoutAmount || parseFloat(payoutAmount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid payout amount.",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('No authentication token')
      }

      const response = await fetch(`/api/consignors/${consignor.id}/process-payout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          amount: parseFloat(payoutAmount),
          method: showCustomPayment ? customPaymentMethod : payoutMethod,
          date: payoutDate,
          notes: notes.trim() || null
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to process payout')
      }

      const result = await response.json()

      toast({
        title: "Payout Processed",
        description: `Successfully processed ${currencySymbol}${payoutAmount} payout to ${consignor.name}`,
      })

      onPayoutProcessed()
      onOpenChange(false)

    } catch (error: any) {
      console.error('Error processing payout:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to process payout",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSaveCustomMethod = async () => {
    if (!customPaymentMethod.trim()) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch('/api/payment-methods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          method_name: customPaymentMethod.trim(),
          description: `Custom payment method: ${customPaymentMethod.trim()}`
        }),
      })

      if (response.ok) {
        // Refresh payment methods
        const methodsResponse = await fetch('/api/payment-methods', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        })

        if (methodsResponse.ok) {
          const methods = await methodsResponse.json()
          setPaymentMethods(methods)
        }

        setPayoutMethod(customPaymentMethod)
        setShowCustomPayment(false)
        
        toast({
          title: "Payment Method Saved",
          description: `"${customPaymentMethod}" has been added to your payment methods.`,
        })
      }
    } catch (error) {
      console.error('Error saving custom payment method:', error)
      // Still allow using the custom method even if saving fails
      setPayoutMethod(customPaymentMethod)
      setShowCustomPayment(false)
    }
  }

  const pendingAmount = consignor?.pending_payout || 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Process Payout
          </DialogTitle>
          <DialogDescription>
            Process a payout for {consignor?.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Payout Summary */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium mb-2">Payout Summary</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Consignor:</span>
                <span className="font-medium">{consignor?.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Pending Amount:</span>
                <span className="font-medium text-orange-600">
                  {currencySymbol}{pendingAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Payment Method:</span>
                <span className="font-medium">{consignor?.payment_method || 'Not specified'}</span>
              </div>
            </div>
          </div>

          {/* Payout Details */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Payout Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                max={pendingAmount}
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground">
                Maximum: {currencySymbol}{pendingAmount.toFixed(2)}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="method">Payment Method</Label>
              <Select 
                value={showCustomPayment ? 'Custom' : payoutMethod} 
                onValueChange={(value) => {
                  if (value === 'Custom') {
                    setShowCustomPayment(true)
                    setCustomPaymentMethod('')
                  } else {
                    setShowCustomPayment(false)
                    setPayoutMethod(value)
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.standard_methods.map((method) => (
                    <SelectItem key={method} value={method}>{method}</SelectItem>
                  ))}
                  {paymentMethods.custom_methods.length > 0 && (
                    <>
                      <SelectItem value="custom-separator" disabled>--- Custom Methods ---</SelectItem>
                      {paymentMethods.custom_methods.map((method) => (
                        <SelectItem key={method.id} value={method.method_name}>
                          {method.method_name}
                        </SelectItem>
                      ))}
                    </>
                  )}
                  <SelectItem value="Custom">+ Add Custom Method</SelectItem>
                </SelectContent>
              </Select>
              
              {showCustomPayment && (
                <div className="space-y-2 mt-2">
                  <Input
                    value={customPaymentMethod}
                    onChange={(e) => setCustomPaymentMethod(e.target.value)}
                    placeholder="Enter custom payment method"
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowCustomPayment(false)
                        setCustomPaymentMethod('')
                        setPayoutMethod(consignor?.payment_method || 'PayPal')
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSaveCustomMethod}
                      disabled={!customPaymentMethod.trim()}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Payout Date</Label>
              <Input
                id="date"
                type="date"
                value={payoutDate}
                onChange={(e) => setPayoutDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Transaction ID, reference number, or other notes..."
                rows={3}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleProcessPayout} 
            disabled={isProcessing || !payoutAmount || parseFloat(payoutAmount) <= 0}
          >
            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Process Payout
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
