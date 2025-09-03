"use client"

import React, { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { Variant } from "@/lib/types"
import { MapPin, Plus } from "lucide-react"

interface EditVariantModalProps {
  open: boolean
  variant?: Variant
  onClose: (updated: boolean) => void
}

export function EditVariantModal({ open, variant, onClose }: EditVariantModalProps) {
  const [costPrice, setCostPrice] = useState("")
  const [salePrice, setSalePrice] = useState("")
  const [status, setStatus] = useState("Available")
  const [location, setLocation] = useState("")
  const [dateSold, setDateSold] = useState("")
  const [saving, setSaving] = useState(false)
  
  // Location management state
  const [customLocations, setCustomLocations] = useState<string[]>([])
  const [showAddLocationInput, setShowAddLocationInput] = useState(false)
  const [newLocation, setNewLocation] = useState("")
  
  const supabase = createClient()

  // Fetch custom locations
  useEffect(() => {
    if (!open) return
    
    const fetchLocations = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const { data, error } = await supabase
        .from("custom_locations")
        .select("name")
        .eq("user_id", user.id)
        
      let locs = (data || []).map((row: any) => row.name)
      // Add default locations if not present
      const defaultLocations = ["Warehouse A", "Warehouse B", "Warehouse C"]
      defaultLocations.forEach((defaultLoc: string) => {
        if (!locs.includes(defaultLoc)) locs.push(defaultLoc)
      })
      setCustomLocations(locs)
    }
    
    fetchLocations()
  }, [open, supabase])

  // Update form fields when variant changes
  useEffect(() => {
    if (variant) {
      setCostPrice(variant.cost_price?.toString() || "")
      setSalePrice((variant as any).product?.sale_price?.toString() || "")
      setStatus(variant.status || "Available")
      setLocation(variant.location || "")
      setDateSold((variant as any).date_sold ? new Date((variant as any).date_sold).toISOString().split('T')[0] : "")
    }
  }, [variant])

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setShowAddLocationInput(false)
      setNewLocation("")
    }
  }, [open])

  const handleAddLocation = async () => {
    if (!newLocation.trim()) return
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from("custom_locations")
        .insert({ name: newLocation.trim(), user_id: user.id })

      if (!error) {
        setCustomLocations(prev => [...prev, newLocation.trim()])
        setLocation(newLocation.trim())
        setNewLocation("")
        setShowAddLocationInput(false)
      }
    } catch (error) {
      console.error('Error adding location:', error)
    }
  }

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
          location,
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
             
                <SelectItem value="PullOut">PullOut</SelectItem>
                <SelectItem value="Reserved">Reserved</SelectItem>
                <SelectItem value="PreOrder">PreOrder</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Location
            </Label>
            <div className="space-y-2">
              {showAddLocationInput ? (
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter new location name"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddLocation()}
                  />
                  <Button onClick={handleAddLocation} size="sm">
                    Add
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowAddLocationInput(false)}
                    size="sm"
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Select value={location} onValueChange={(value) => {
                  if (value === "__add_new__") {
                    setShowAddLocationInput(true)
                  } else {
                    setLocation(value)
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {customLocations.map((loc) => (
                      <SelectItem key={loc} value={loc}>
                        {loc}
                      </SelectItem>
                    ))}
                    <SelectItem value="__add_new__" className="border-t">
                      <div className="flex items-center gap-2 text-blue-600">
                        <Plus className="h-4 w-4" />
                        Add New Location
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
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
