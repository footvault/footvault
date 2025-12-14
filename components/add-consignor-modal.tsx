"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
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
import { CreateConsignorData } from '@/lib/types/consignor'
import { Edit2, Trash2, X, Check } from 'lucide-react'

// Custom payment method interface
interface CustomPaymentMethod {
  id: number
  method_name: string
  description?: string
}

// Predefined payment methods
const PAYMENT_METHODS = [
  'PayPal',
  'Bank Transfer', 
  'Cash',
  'Custom' // This will allow typing custom method
]

interface AddConsignorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConsignorAdded: () => void
}

export function AddConsignorModal({ open, onOpenChange, onConsignorAdded }: AddConsignorModalProps) {
  const [formData, setFormData] = useState<CreateConsignorData>({
    name: '',
    email: '',
    phone: '',
    commission_rate: 20,
    payment_method: 'PayPal',
    notes: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [portalPassword, setPortalPassword] = useState('')
  const [enablePortal, setEnablePortal] = useState(false)
  const [customPaymentMethods, setCustomPaymentMethods] = useState<CustomPaymentMethod[]>([])
  const [isLoadingMethods, setIsLoadingMethods] = useState(false)
  const [editingMethodId, setEditingMethodId] = useState<number | null>(null)
  const [editingMethodName, setEditingMethodName] = useState('')
  const [editingMethod, setEditingMethod] = useState<CustomPaymentMethod | null>(null)
  const [customMethodName, setCustomMethodName] = useState('')
  const [customMethodDescription, setCustomMethodDescription] = useState('')
  const [showCustomMethodInput, setShowCustomMethodInput] = useState(false)

  const supabase = createClient()

  // Combine predefined and custom payment methods
  const allPaymentMethods = [
    ...PAYMENT_METHODS.filter(method => method !== 'Custom'),
    ...customPaymentMethods.map(custom => custom.method_name),
    'Custom'
  ]

  // Fetch custom payment methods when modal opens
  useEffect(() => {
    if (open) {
      fetchCustomPaymentMethods()
    }
  }, [open])

  // Reset custom method input states when modal closes
  useEffect(() => {
    if (!open) {
      setEditingMethod(null)
      setCustomMethodName('')
      setCustomMethodDescription('')
      setShowCustomMethodInput(false)
    }
  }, [open])

  const fetchCustomPaymentMethods = async () => {
    setIsLoadingMethods(true)
    try {
      const response = await fetch('/api/custom-payment-methods')
      if (response.ok) {
        const data = await response.json()
        setCustomPaymentMethods(data.methods || [])
      } else {
        console.error('Failed to fetch custom payment methods')
      }
    } catch (error) {
      console.error('Error fetching custom payment methods:', error)
    } finally {
      setIsLoadingMethods(false)
    }
  }

  const saveCustomPaymentMethod = async (methodName: string) => {
    try {
      const response = await fetch('/api/custom-payment-methods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ method_name: methodName }),
      })

      if (response.ok) {
        const data = await response.json()
        setCustomPaymentMethods(prev => [...prev, data.method])
        return true
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.error || 'Failed to save custom payment method',
          variant: "destructive",
        })
        return false
      }
    } catch (error) {
      console.error('Error saving custom payment method:', error)
      toast({
        title: "Error",
        description: 'Failed to save custom payment method',
        variant: "destructive",
      })
      return false
    }
  }

  const updateCustomPaymentMethod = async (id: number, newName: string) => {
    try {
      const response = await fetch(`/api/custom-payment-methods/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ method_name: newName }),
      })

      if (response.ok) {
        const data = await response.json()
        setCustomPaymentMethods(prev => 
          prev.map(method => method.id === id ? data.method : method)
        )
        return true
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.error || 'Failed to update custom payment method',
          variant: "destructive",
        })
        return false
      }
    } catch (error) {
      console.error('Error updating custom payment method:', error)
      toast({
        title: "Error",
        description: 'Failed to update custom payment method',
        variant: "destructive",
      })
      return false
    }
  }

  const deleteCustomPaymentMethod = async (id: number) => {
    try {
      const response = await fetch(`/api/custom-payment-methods/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setCustomPaymentMethods(prev => prev.filter(method => method.id !== id))
        toast({
          title: "Success",
          description: 'Custom payment method deleted',
        })
        return true
      } else {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.error || 'Failed to delete custom payment method',
          variant: "destructive",
        })
        return false
      }
    } catch (error) {
      console.error('Error deleting custom payment method:', error)
      toast({
        title: "Error",
        description: 'Failed to delete custom payment method',
        variant: "destructive",
      })
      return false
    }
  }

  const handleCancelCustomMethod = () => {
    setShowCustomMethodInput(false)
    setEditingMethod(null)
    setCustomMethodName('')
    setCustomMethodDescription('')
  }

  const handleSaveNewCustomMethod = async () => {
    if (!customMethodName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a custom payment method name.",
        variant: "destructive",
      })
      return
    }

    if (editingMethod) {
      // Update existing method
      const saved = await updateCustomPaymentMethod(editingMethod.id, customMethodName.trim())
      if (saved) {
        setShowCustomMethodInput(false)
        setEditingMethod(null)
        setCustomMethodName('')
        setCustomMethodDescription('')
        handleInputChange('payment_method', customMethodName.trim())
        toast({
          title: "Success",
          description: 'Payment method updated and selected',
        })
      }
    } else {
      // Create new method
      const saved = await saveCustomPaymentMethod(customMethodName.trim())
      if (saved) {
        setShowCustomMethodInput(false)
        setCustomMethodName('')
        setCustomMethodDescription('')
        handleInputChange('payment_method', customMethodName.trim())
        toast({
          title: "Success",
          description: 'Custom payment method saved and selected',
        })
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Prevent submission if currently creating/editing a custom method
    if (showCustomMethodInput) {
      toast({
        title: "Complete Custom Method",
        description: "Please save or cancel the custom payment method before creating the consignor.",
        variant: "destructive",
      })
      return
    }
    
    // Use the form data payment method
    const finalPaymentMethod = formData.payment_method
    
    if (!formData.name || formData.commission_rate < 0 || formData.commission_rate > 100) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields and ensure commission rate is between 0-100%.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('No authentication token')
      }

      const submitData = {
        ...formData,
        payment_method: finalPaymentMethod,
        portal_password: enablePortal ? portalPassword : undefined
      }

      const response = await fetch('/api/consignors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(submitData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create consignor')
      }

      toast({
        title: "Success",
        description: "Consignor added successfully!",
      })

      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        commission_rate: 20,
        payment_method: 'PayPal',
        notes: '',
      })
      setPortalPassword('')
      setEnablePortal(false)
      setEditingMethod(null)
      setCustomMethodName('')
      setCustomMethodDescription('')
      setShowCustomMethodInput(false)

      onConsignorAdded()
      onOpenChange(false)

    } catch (error: any) {
      console.error('Error creating consignor:', error)
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: keyof CreateConsignorData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handlePaymentMethodChange = (value: string) => {
    if (value === '__add_custom__') {
      setEditingMethod(null)
      setCustomMethodName('')
      setCustomMethodDescription('')
      setShowCustomMethodInput(true)
    } else {
      handleInputChange('payment_method', value as any)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Consignor</DialogTitle>
          <DialogDescription>
            Add a new consignment partner to your system. Fill in their details and set commission rates.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Consignor Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter consignor name"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="commission_rate">Commission Rate (%) *</Label>
                <Input
                  id="commission_rate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.commission_rate}
                  onChange={(e) => handleInputChange('commission_rate', parseFloat(e.target.value) || 0)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  The percentage your store keeps (only used for percentage_split method)
                </p>
              </div>
            </div>

            {/* Payout Method Section */}
            <div className="space-y-2">
              <Label htmlFor="payout_method">Payout Method *</Label>
              <Select 
                value={formData.payout_method || 'percentage_split'} 
                onValueChange={(value) => handleInputChange('payout_method', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payout method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage_split">Percentage Split (Traditional)</SelectItem>
                  <SelectItem value="cost_price">Cost Price Only</SelectItem>
                  <SelectItem value="cost_plus_fixed">Cost + Fixed Markup</SelectItem>
                  <SelectItem value="cost_plus_percentage">Cost + Percentage Markup</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {formData.payout_method === 'percentage_split' && 'Consignor gets sale price minus commission (e.g., $100 sale - 20% = $80 to consignor)'}
                {formData.payout_method === 'cost_price' && 'Consignor gets only their cost price, store keeps all profit'}
                {formData.payout_method === 'cost_plus_fixed' && 'Consignor gets cost + fixed dollar amount (set below)'}
                {formData.payout_method === 'cost_plus_percentage' && 'Consignor gets cost + markup percentage (set below)'}
              </p>
            </div>

            {/* Fixed Markup Field (only for cost_plus_fixed) */}
            {formData.payout_method === 'cost_plus_fixed' && (
              <div className="space-y-2">
                <Label htmlFor="fixed_markup">Fixed Markup Amount ($) *</Label>
                <Input
                  id="fixed_markup"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.fixed_markup || 0}
                  onChange={(e) => handleInputChange('fixed_markup', parseFloat(e.target.value) || 0)}
                  placeholder="e.g., 50"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Consignor gets cost price + this fixed amount (e.g., $100 cost + $50 = $150 to consignor)
                </p>
              </div>
            )}

            {/* Markup Percentage Field (only for cost_plus_percentage) */}
            {formData.payout_method === 'cost_plus_percentage' && (
              <div className="space-y-2">
                <Label htmlFor="markup_percentage">Markup Percentage (%) *</Label>
                <Input
                  id="markup_percentage"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.markup_percentage || 0}
                  onChange={(e) => handleInputChange('markup_percentage', parseFloat(e.target.value) || 0)}
                  placeholder="e.g., 40"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Consignor gets cost price + this percentage (e.g., $100 cost + 40% = $140 to consignor)
                </p>
              </div>
            )}


            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="Enter email address"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="Enter phone number"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_method">Payment Method</Label>
              <Select 
                value={formData.payment_method} 
                onValueChange={handlePaymentMethodChange}
                disabled={isLoadingMethods}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingMethods ? "Loading methods..." : "Select payment method"} />
                </SelectTrigger>
                <SelectContent>
                  {/* Predefined methods */}
                  {PAYMENT_METHODS.filter(method => method !== 'Custom').map(method => (
                    <SelectItem key={method} value={method}>
                      {method}
                    </SelectItem>
                  ))}
                  
                  {/* Custom methods from database */}
                  {customPaymentMethods.length > 0 && (
                    <>
                      {customPaymentMethods.map(custom => (
                        <div key={custom.id} className="relative group">
                          <SelectItem value={custom.method_name} className="pr-16">
                            {custom.method_name}
                            {custom.description && (
                              <span className="text-xs text-muted-foreground"> - {custom.description}</span>
                            )}
                          </SelectItem>
                          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 mr-1 hover:bg-blue-100"
                              onClick={(e) => {
                                e.stopPropagation()
                                setEditingMethod(custom)
                                setCustomMethodName(custom.method_name)
                                setCustomMethodDescription(custom.description || '')
                                setShowCustomMethodInput(true)
                              }}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-100"
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteCustomPaymentMethod(custom.id)
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                  
                  {/* Add new custom option */}
                  <SelectItem value="__add_custom__">
                    + Add New Custom Method
                  </SelectItem>
                </SelectContent>
              </Select>

              {showCustomMethodInput && (
                <div className="space-y-3 p-3 border rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">
                      {editingMethod ? 'Edit Payment Method' : 'Add Custom Payment Method'}
                    </h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelCustomMethod}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="customMethodName">Method Name *</Label>
                    <Input
                      id="customMethodName"
                      value={customMethodName}
                      onChange={(e) => setCustomMethodName(e.target.value)}
                      placeholder="e.g., Crypto, Wire Transfer, etc."
                      maxLength={50}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="customMethodDescription">Description (optional)</Label>
                    <Input
                      id="customMethodDescription"
                      value={customMethodDescription}
                      onChange={(e) => setCustomMethodDescription(e.target.value)}
                      placeholder="Additional details about this payment method"
                      maxLength={200}
                    />
                  </div>
                  
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelCustomMethod}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveNewCustomMethod}
                      disabled={!customMethodName.trim()}
                    >
                      <Check className="h-3 w-3 mr-1" />
                      {editingMethod ? 'Update' : 'Save'}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Any additional notes about this consignor..."
                rows={3}
              />
            </div>

            <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="enable-portal"
                  checked={enablePortal}
                  onCheckedChange={(checked) => setEnablePortal(checked === true)}
                />
                <Label 
                  htmlFor="enable-portal" 
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Enable Public Portal Access
                </Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Allow this consignor to view their sales and inventory online with a secure password
              </p>
              
              {enablePortal && (
                <div className="space-y-2">
                  <Label htmlFor="portal-password">Portal Password</Label>
                  <Input
                    id="portal-password"
                    type="password"
                    value={portalPassword}
                    onChange={(e) => setPortalPassword(e.target.value)}
                    placeholder="Create a secure password for portal access"
                    required={enablePortal}
                  />
                  <p className="text-xs text-muted-foreground">
                    The consignor will use this password to access their public portal
                  </p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Consignor'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
