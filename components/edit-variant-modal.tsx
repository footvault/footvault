"use client"

import React, { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { Variant } from "@/lib/types"

interface EditVariantModalProps {
  open: boolean
  variant?: Variant
  onClose: (updated: boolean) => void
}

export function EditVariantModal({ open, variant, onClose }: EditVariantModalProps) {
  const [costPrice, setCostPrice] = useState("")
  const [salePrice, setSalePrice] = useState("")
  const [status, setStatus] = useState("Available")
  const [dateSold, setDateSold] = useState("")
  const [saving, setSaving] = useState(false)
  
  const supabase = createClient()

  // Update form fields when variant changes
  useEffect(() => {
    if (variant) {
      setCostPrice(variant.cost_price?.toString() || "")
      setSalePrice((variant as any).product?.sale_price?.toString() || "")
      setStatus(variant.status || "Available")
      setDateSold((variant as any).date_sold ? new Date((variant as any).date_sold).toISOString().split('T')[0] : "")
    }
  }, [variant])

  const handleSave = async () => {
    if (!variant) return
    
    setSaving(true)
    try {
      // Update variant
      const { error: variantError } = await supabase
        .from('variants')
        .update({
          cost_price: parseFloat(costPrice) || 0,
          status,
          date_sold: dateSold || null,
        })
        .eq('id', variant.id)

      // Update product sale price if changed
      if (salePrice && (variant as any).product_id) {
        const { error: productError } = await supabase
          .from('products')
          .update({ sale_price: parseFloat(salePrice) || 0 })
          .eq('id', (variant as any).product_id)
      }

      if (!variantError) {
        onClose(true) // Successfully updated
      } else {
        console.error('Error updating variant:', variantError)
        onClose(false)
      }
    } catch (error) {
      console.error('Error:', error)
      onClose(false)
    } finally {
      setSaving(false)
    }
  }

  if (!open || !variant) return null

  return (
    <Dialog open={open} onOpenChange={() => onClose(false)}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Variant</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Cost Price</label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
              placeholder="0.00"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Sale Price</label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Available">Available</SelectItem>
                <SelectItem value="Sold">Sold</SelectItem>
                <SelectItem value="PullOut">PullOut</SelectItem>
                <SelectItem value="Reserved">Reserved</SelectItem>
                <SelectItem value="PreOrder">PreOrder</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Date Sold</label>
            <Input
              type="date"
              value={dateSold}
              onChange={(e) => setDateSold(e.target.value)}
            />
            {!dateSold && (
              <p className="text-xs text-muted-foreground">Empty - no sale date recorded</p>
            )}
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onClose(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
