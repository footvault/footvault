"use client"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  Edit3, 
  Check, 
  X, 
  Trash2, 
  Settings, 
  Package, 
  MapPin,
  Loader2,
  ShoppingBag,
  Minus,
  Plus
} from "lucide-react"

interface Variant {
  id: string
  size: string
  status: string
  location: string
  serialNumber: string // Add serialNumber
}

interface SizeModalProps {
  shoe: {
    name: string
    variants: Variant[]
  }
  open: boolean
  onOpenChange: (open: boolean) => void
  refreshData: () => Promise<void>
}

export function SizeModal({ shoe, open, onOpenChange, refreshData }: SizeModalProps) {
  const [editingVariant, setEditingVariant] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Variant | null>(null)
  const [selectedVariants, setSelectedVariants] = useState<string[]>([])
  const [collapsedSizes, setCollapsedSizes] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [showAddVariantModal, setShowAddVariantModal] = useState(false)
  const [serialError, setSerialError] = useState<string | null>(null)
  
  // Custom location state
  const [customLocations, setCustomLocations] = useState<string[]>([])
  const [showLocationSelect, setShowLocationSelect] = useState<string | null>(null)
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
        setEditValues(prev => prev ? { ...prev, location: newLocation.trim() } : null)
        setNewLocation("")
        setShowAddLocationInput(false)
        setShowLocationSelect(null)
      }
    } catch (error) {
      console.error('Error adding location:', error)
    }
  }

  if (!shoe) return null

  const handleEdit = (variantId: string, variantData: Variant) => {
    setEditingVariant(variantId)
    setEditValues(variantData)
  }

  const handleSave = async () => {
    if (!editValues) return
    if (serialError) return // Prevent save if serial is not unique
    setIsSaving(true)
    try {
      // Get the auth token for the API call
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        console.error("No auth session")
        return
      }

      // Call the update-variant API endpoint
      const response = await fetch('/api/update-variant', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          variantId: editValues.id,
          status: editValues.status,
          location: editValues.location
        })
      })

      const result = await response.json()
      
      if (!response.ok || !result.success) {
        console.error("Failed to update variant:", result.error)
        // You can add a toast notification here for error feedback
      } else {
        await refreshData() // Re-fetch data to reflect changes
      }
    } catch (error) {
      console.error("Error updating variant:", error)
    } finally {
      setEditingVariant(null)
      setEditValues(null)
      setIsSaving(false)
      setShowLocationSelect(null)
      setShowAddLocationInput(false)
      setNewLocation("")
    }
  }

  const handleCancel = () => {
    setEditingVariant(null)
    setEditValues(null)
  }

  const handleSelectVariant = (variantId: string, checked: boolean) => {
    setSelectedVariants(prev =>
      checked
        ? [...prev, variantId]
        : prev.filter(id => id !== variantId)
    )
  }

  const toggleSizeCollapse = (size: string) => {
    setCollapsedSizes(prev =>
      prev.includes(size)
        ? prev.filter(s => s !== size)
        : [...prev, size]
    )
  }

  const handleStatusChange = (value: string) => {
    setEditValues(prev => prev ? { ...prev, status: value } : null)
  }

  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditValues(prev => prev ? { ...prev, location: e.target.value } : null)
  }

  const handleSerialChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSerial = e.target.value
    setEditValues(prev => prev ? { ...prev, serialNumber: newSerial } : null)
    setSerialError(null)
    if (newSerial.trim()) {
      try {
        const res = await fetch(`/api/check-serial-number`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ serialNumber: newSerial }),
        })
        const data = await res.json()
        if (!data.isUnique) {
          setSerialError("Serial number already exists.")
        } else {
          setSerialError(null)
        }
      } catch (err) {
        setSerialError("Error checking serial number.")
      }
    } else {
      setSerialError("Serial number is required.")
    }
  }

  const handleSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditValues(prev => prev ? { ...prev, size: e.target.value } : null)
  }

  const getStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case 'available':
      case 'in stock':
        return 'bg-black text-white'
      case 'in display':
        return 'bg-gray-800 text-white'
      case 'low stock':
        return 'bg-gray-600 text-white'
      case 'out of stock':
        return 'bg-gray-300 text-black'
      default:
        return 'bg-gray-400 text-black'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'available':
      case 'in stock':
        return <Plus className="h-3 w-3" />
      case 'in display':
        return <ShoppingBag className="h-3 w-3" />
      case 'out of stock':
        return <Minus className="h-3 w-3" />
      default:
        return <Package className="h-3 w-3" />
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-full px-0 sm:px-6 bg-white border border-gray-200">
        <div className="px-6 sm:px-0">
          <DialogHeader className="space-y-6 pb-6">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl font-light text-black tracking-tight">
                  Size Management
                </DialogTitle>
                <p className="text-gray-500 text-sm font-normal mt-1">{shoe.name}</p>
              </div>
              <div className="w-8 h-8 border border-gray-200 rounded-sm flex items-center justify-center">
                <Settings className="h-4 w-4 text-gray-600" />
              </div>
            </div>
          </DialogHeader>
        </div>
        
        <Separator className="bg-gray-100" />
        
        <div className="px-6 sm:px-0">
          <div className="border border-gray-100 bg-white">
            <div className="overflow-x-auto">
              <Table className="min-w-[600px] sm:min-w-0">
                <TableHeader>
                  <TableRow className="bg-gray-50 border-b border-gray-100 hover:bg-gray-50">
                    <TableHead className="w-12 pl-6 font-medium text-gray-900">
                      <Checkbox className="border-gray-300" />
                    </TableHead>
                    <TableHead className="font-medium text-gray-900 tracking-tight">Size</TableHead>
                    <TableHead className="font-medium text-gray-900 tracking-tight">Status</TableHead>
                    <TableHead className="hidden xs:table-cell font-medium text-gray-900 tracking-tight">Location</TableHead>
                    <TableHead className="font-medium text-gray-900 tracking-tight">Serial #</TableHead>
                    <TableHead className="font-medium text-gray-900 tracking-tight pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shoe.variants?.map((variant: Variant, index) => (
                    <TableRow 
                      key={variant.id} 
                      className={`
                        border-b border-gray-50 hover:bg-gray-25 transition-colors
                        ${editingVariant === variant.id ? 'bg-gray-25' : ''}
                        ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25/50'}
                      `}
                    >
                      <TableCell className="pl-6">
                        <Checkbox
                          checked={selectedVariants.includes(variant.id)}
                          onCheckedChange={(checked) => handleSelectVariant(variant.id, checked as boolean)}
                          className="border-gray-300 data-[state=checked]:bg-black data-[state=checked]:border-black"
                        />
                      </TableCell>
                      <TableCell>
                        {editingVariant === variant.id ? (
                          <Input
                            value={editValues?.size || ""}
                            onChange={handleSizeChange}
                            placeholder="Enter size"
                            className="h-9 text-sm border-gray-200 bg-white"
                          />
                        ) : (
                          <div className="font-mono text-sm font-medium text-black">
                            {variant.size}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingVariant === variant.id ? (
                          <Select
                            value={editValues?.status}
                            onValueChange={handleStatusChange}
                          >
                            <SelectTrigger className="min-w-[140px] h-9 text-sm border-gray-200 bg-white">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent className="border-gray-200 bg-white">
                              <SelectItem value="Available">Available</SelectItem>
                              <SelectItem value="In Display">In Display</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge className={`${getStatusStyle(variant.status)} px-2 py-1 text-xs font-medium border-0 flex items-center gap-1 w-fit`}>
                            {getStatusIcon(variant.status)}
                            {variant.status}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden xs:table-cell">
                        {editingVariant === variant.id ? (
                          <div className="space-y-2">
                            {showLocationSelect === variant.id && showAddLocationInput ? (
                              <div className="flex gap-1">
                                <Input
                                  placeholder="New location"
                                  value={newLocation}
                                  onChange={(e) => setNewLocation(e.target.value)}
                                  onKeyPress={(e) => e.key === 'Enter' && handleAddLocation()}
                                  className="h-8 text-xs"
                                />
                                <Button onClick={handleAddLocation} size="sm" className="h-8 px-2">
                                  <Check className="h-3 w-3" />
                                </Button>
                                <Button 
                                  variant="outline" 
                                  onClick={() => {
                                    setShowAddLocationInput(false)
                                    setShowLocationSelect(null)
                                  }}
                                  size="sm" 
                                  className="h-8 px-2"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : showLocationSelect === variant.id ? (
                              <Select 
                                value={editValues?.location} 
                                onValueChange={(value) => {
                                  if (value === "__add_new__") {
                                    setShowAddLocationInput(true)
                                  } else {
                                    setEditValues(prev => prev ? { ...prev, location: value } : null)
                                    setShowLocationSelect(null)
                                  }
                                }}
                              >
                                <SelectTrigger className="h-9 text-sm border-gray-200 bg-white">
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
                                      <Plus className="h-3 w-3" />
                                      Add New Location
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <div className="flex items-center gap-1">
                                <Input
                                  value={editValues?.location}
                                  onChange={handleLocationChange}
                                  placeholder="Enter location"
                                  className="h-9 text-sm border-gray-200 bg-white"
                                />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setShowLocationSelect(variant.id)}
                                  className="h-9 px-2"
                                >
                                  <MapPin className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-600 font-mono">
                            {variant.location || '—'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600 font-mono">
                          {variant.serialNumber || '—'}
                        </span>
                      </TableCell>
                      <TableCell className="pr-6">
                        {editingVariant === variant.id ? (
                          <div className="flex gap-2">
                            <Button
                              onClick={handleSave}
                              disabled={isSaving}
                              size="sm"
                              className="px-3 py-1 text-xs bg-black hover:bg-gray-800 text-white border-0 h-8"
                            >
                              {isSaving ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Check className="h-3 w-3" />
                              )}
                            </Button>
                            <Button
                              onClick={handleCancel}
                              variant="outline"
                              size="sm"
                              className="px-3 py-1 text-xs border-gray-200 bg-white hover:bg-gray-50 text-gray-600 h-8"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            onClick={() => handleEdit(variant.id, variant)}
                            size="sm"
                            variant="ghost"
                            className="px-3 py-1 text-xs text-gray-600 hover:text-black hover:bg-gray-50 h-8"
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {selectedVariants.length > 0 && (
            <div className="mt-6 border border-gray-200 bg-gray-50">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 bg-black text-white rounded-sm flex items-center justify-center text-sm font-medium">
                      {selectedVariants.length}
                    </div>
                    <div>
                      <p className="font-medium text-black text-sm">
                        {selectedVariants.length} variant{selectedVariants.length !== 1 ? 's' : ''} selected
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-black"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Selected
                    </Button>
                    <Button 
                      size="sm"
                      className="bg-black text-white hover:bg-gray-800"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Update Status
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}