"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { toast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import { Pencil, Trash2, Plus, Loader2, X, Check, MapPin } from "lucide-react"
import { ConfirmationModal } from "@/components/confirmation-modal"

interface Location {
  id: string
  name: string
  user_id: string
  created_at: string
  updated_at: string
}

export function LocationManagementCard() {
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [newLocationName, setNewLocationName] = useState("")
  const [isAdding, setIsAdding] = useState(false)
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; location?: Location }>({ open: false })
  
  const supabase = createClient()

  useEffect(() => {
    fetchLocations()
  }, [])

  const fetchLocations = async () => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/get-custom-locations', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      const result = await response.json()
      if (result.success) {
        // Sort by name
        const sorted = (result.data || []).sort((a: Location, b: Location) => 
          a.name.localeCompare(b.name)
        )
        setLocations(sorted)
      }
    } catch (error) {
      console.error('Error fetching locations:', error)
      toast({
        title: "Error",
        description: "Failed to load locations",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!newLocationName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a location name",
        variant: "destructive",
      })
      return
    }

    try {
      setIsAdding(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/add-custom-location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ locationName: newLocationName.trim() }),
      })

      const result = await response.json()
      if (result.success) {
        toast({
          title: "Location Added",
          description: `"${newLocationName}" has been added successfully`,
        })
        setNewLocationName("")
        await fetchLocations()
      } else {
        throw new Error(result.error)
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add location",
        variant: "destructive",
      })
    } finally {
      setIsAdding(false)
    }
  }

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a location name",
        variant: "destructive",
      })
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(`/api/custom-locations/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ name: editName.trim() }),
      })

      const result = await response.json()
      if (result.success) {
        toast({
          title: "Location Updated",
          description: "Location name has been updated. All variants using this location will automatically show the new name.",
        })
        setEditingId(null)
        setEditName("")
        await fetchLocations()
      } else {
        throw new Error(result.error)
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update location",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async () => {
    if (!deleteModal.location) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(`/api/custom-locations/${deleteModal.location.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      const result = await response.json()
      if (result.success) {
        toast({
          title: "Location Deleted",
          description: "Location has been removed successfully",
        })
        setDeleteModal({ open: false })
        await fetchLocations()
      } else {
        if (result.inUse) {
          toast({
            title: "Cannot Delete",
            description: "This location is currently in use by variants. Please reassign them first.",
            variant: "destructive",
          })
        } else {
          throw new Error(result.error)
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete location",
        variant: "destructive",
      })
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>Storage Locations</CardTitle>
              <CardDescription>
                Manage your storage locations. You can add custom locations and edit or delete them as needed.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add New Location */}
          <div className="flex gap-2">
            <Input
              placeholder="Enter new location name (e.g., Store Front, Back Room, Shelf A)"
              value={newLocationName}
              onChange={(e) => setNewLocationName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
              disabled={isAdding}
            />
            <Button onClick={handleAdd} disabled={isAdding} size="sm">
              {isAdding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </>
              )}
            </Button>
          </div>

          {/* Locations List */}
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : locations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No locations yet. Add your first location above!</p>
              <p className="text-xs mt-1">Locations help you organize and track where your inventory is stored.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground mb-2">
                {locations.length} location{locations.length !== 1 ? 's' : ''}
              </p>
              {locations.map((location) => (
                <div
                  key={location.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
                >
                  {editingId === location.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') handleUpdate(location.id)
                          if (e.key === 'Escape') {
                            setEditingId(null)
                            setEditName("")
                          }
                        }}
                        autoFocus
                        className="flex-1"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleUpdate(location.id)}
                        title="Save"
                      >
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingId(null)
                          setEditName("")
                        }}
                        title="Cancel"
                      >
                        <X className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{location.name}</span>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingId(location.id)
                            setEditName(location.name)
                          }}
                          title="Edit location name"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteModal({ open: true, location })}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Delete location"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
              open={deleteModal.open}
              onOpenChange={(open) => setDeleteModal({ open, location: open ? deleteModal.location : undefined })}
              title="Delete Location"
              description={`Are you sure you want to delete "${deleteModal.location?.name}"? This action cannot be undone. You can only delete locations that are not currently in use.`}
              onConfirm={handleDelete} isConfirming={false}      />
    </>
  )
}
