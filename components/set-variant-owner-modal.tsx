"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Loader2, User, Building2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import { Consignor } from "@/lib/types/consignor"

interface Variant {
  id: string
  variant_sku: string
  size: string
  owner_type?: 'store' | 'consignor'
  consignor_id?: string
}

interface SetVariantOwnerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  variant: Variant | null
  onSuccess: () => void
}

export function SetVariantOwnerModal({ 
  open, 
  onOpenChange, 
  variant, 
  onSuccess 
}: SetVariantOwnerModalProps) {
  const [loading, setLoading] = useState(false)
  const [consignors, setConsignors] = useState<Consignor[]>([])
  const [loadingConsignors, setLoadingConsignors] = useState(false)
  const [ownerType, setOwnerType] = useState<'store' | 'consignor'>('store')
  const [consignorId, setConsignorId] = useState<string>('')

  const supabase = createClient()

  // Load consignors when modal opens
  useEffect(() => {
    if (open) {
      fetchConsignors()
      // Set initial values if variant has owner info
      if (variant) {
        setOwnerType(variant.owner_type || 'store')
        setConsignorId(variant.consignor_id || '')
      }
    }
  }, [open, variant])

  const fetchConsignors = async () => {
    setLoadingConsignors(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch('/api/consignors', {
        headers: {
          Authorization: `Bearer ${session?.access_token || ''}`
        }
      })
      const result = await response.json()
      if (result.success) {
        // Only show active consignors
        setConsignors(result.data.filter((c: Consignor) => c.status === 'active'))
      }
    } catch (error) {
      console.error('Error fetching consignors:', error)
    } finally {
      setLoadingConsignors(false)
    }
  }

  const handleSave = async () => {
    if (!variant) return

    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      const updateData: any = {
        owner_type: ownerType
      }
      
      if (ownerType === 'consignor') {
        if (!consignorId) {
          toast({
            title: "Error",
            description: "Please select a consignor",
            variant: "destructive",
          })
          setLoading(false)
          return
        }
        updateData.consignor_id = consignorId
      } else {
        updateData.consignor_id = null
      }

      const { error } = await supabase
        .from('variants')
        .update(updateData)
        .eq('id', variant.id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Variant owner updated successfully",
      })

      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      console.error('Error updating variant owner:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to update variant owner",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Set Variant Owner</DialogTitle>
          <DialogDescription>
            Set who owns this variant - your store or a consignor.
            {variant && (
              <div className="mt-2 text-sm text-muted-foreground">
                <strong>{variant.variant_sku}</strong> - Size {variant.size}
              </div>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="owner-type">Owner Type</Label>
            <Select value={ownerType} onValueChange={(value: 'store' | 'consignor') => setOwnerType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select owner type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="store">
                  <div className="flex items-center">
                    <Building2 className="mr-2 h-4 w-4" />
                    Store Owned
                  </div>
                </SelectItem>
                <SelectItem value="consignor">
                  <div className="flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    Consignor Owned
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {ownerType === 'consignor' && (
            <div className="space-y-2">
              <Label htmlFor="consignor">Consignor</Label>
              {loadingConsignors ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="ml-2">Loading consignors...</span>
                </div>
              ) : (
                <Select value={consignorId} onValueChange={setConsignorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a consignor" />
                  </SelectTrigger>
                  <SelectContent>
                    {consignors.map((consignor) => (
                      <SelectItem key={consignor.id} value={consignor.id.toString()}>
                        <div className="flex flex-col">
                          <span className="font-medium">{consignor.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {consignor.commission_rate}% commission • {consignor.payment_method}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {consignors.length === 0 && !loadingConsignors && (
                <p className="text-sm text-muted-foreground">
                  No active consignors found. Add a consignor first.
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Owner
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
