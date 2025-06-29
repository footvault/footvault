"use client"

import type React from "react"

import { useState, useTransition, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Edit, Trash2, Loader2, Users, Percent, Save, XCircle, Star } from "lucide-react"
import { updateAvatar, deleteAvatar } from "@/app/actions"
import { toast } from "@/hooks/use-toast"
import type { Avatar, AvatarFormValues } from "@/lib/types"
import PremiumFeatureModal from "./PremiumFeatureModal"
import { createClient } from "@/lib/supabase/client"

interface AvatarManagementModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialAvatars: Avatar[]
  refreshAvatars: () => Promise<void>
}

export function AvatarManagementModal({
  open,
  onOpenChange,
  initialAvatars,
  refreshAvatars,
}: AvatarManagementModalProps) {
  const [avatars, setAvatars] = useState<Avatar[]>(initialAvatars)
  const [newAvatar, setNewAvatar] = useState<AvatarFormValues>({ name: "", default_percentage: 0 })
  const [editingAvatarId, setEditingAvatarId] = useState<string | null>(null)
  const [editingAvatarValues, setEditingAvatarValues] = useState<AvatarFormValues | null>(null)
  const [isPending, startTransition] = useTransition()
   const [userPlan, setUserPlan] = useState<string | null>(null);
   const [showPremiumModal, setShowPremiumModal] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setAvatars(initialAvatars)
  }, [initialAvatars])

  const fetchUserPlan = useCallback(async () => {
    try {
      setIsLoading(true);
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to access features.",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch('/api/user-plan', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch user plan.");
      }

      if (result.plan) {
        setUserPlan(result.plan); // 'free', 'individual', 'team', 'store'
      } else {
        throw new Error("Plan data missing from response.");
      }
    } catch (error: any) {
      console.error("Error fetching user plan:", error);
      toast({
        title: "Error",
        description: error.message || "An error occurred while checking your plan.",
        variant: "destructive",
      });
      setUserPlan("free"); // fallback if error
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserPlan();
  }, [fetchUserPlan]);

  const defaultAvatarId = avatars.length > 0 ? avatars[0].id : null // Assuming the first avatar is the default

  const handleNewAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    setNewAvatar((prev) => ({
      ...prev,
      [id]: id === "default_percentage" ? Number.parseFloat(value) : value,
    }))
  }

  const handleCreateAvatar = async () => {
    if (!newAvatar.name.trim()) {
      toast({ title: "Name Required", description: "Please enter a name for the avatar.", variant: "destructive" })
      return
    }
    if (isNaN(newAvatar.default_percentage) || newAvatar.default_percentage < 0 || newAvatar.default_percentage > 100) {
      toast({
        title: "Invalid Percentage",
        description: "Percentage must be between 0 and 100.",
        variant: "destructive",
      })
      return
    }

    startTransition(async () => {
      try {
        const form = document.getElementById("new-avatar-form") as HTMLFormElement
        const formData = new FormData(form)
        // Get session token for auth
        const { createClient } = await import("@/lib/supabase/client")
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        const response = await fetch("/api/create-avatar", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session?.access_token || ""}`
          },
          body: formData
        })
        const result = await response.json()
        if (result.success) {
          toast({ title: "Avatar Created", description: result.message })
          setNewAvatar({ name: "", default_percentage: 0 })
          await refreshAvatars()
        } else {
          toast({ title: "Failed to Create Avatar", description: result.error || result.message, variant: "destructive" })
        }
      } catch (err) {
        toast({ title: "Failed to Create Avatar", description: "Unexpected error.", variant: "destructive" })
      }
    })
  }

  const handleEditClick = (avatar: Avatar) => {
    setEditingAvatarId(avatar.id)
    setEditingAvatarValues({ name: avatar.name, default_percentage: avatar.default_percentage })
  }

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    setEditingAvatarValues((prev) =>
      prev ? { ...prev, [id]: id === "default_percentage" ? Number.parseFloat(value) : value } : null,
    )
  }

  const handleSaveEdit = async (avatarId: string) => {
    if (!editingAvatarValues?.name.trim()) {
      toast({ title: "Name Required", description: "Please enter a name for the avatar.", variant: "destructive" })
      return
    }
    if (
      isNaN(editingAvatarValues.default_percentage) ||
      editingAvatarValues.default_percentage < 0 ||
      editingAvatarValues.default_percentage > 100
    ) {
      toast({
        title: "Invalid Percentage",
        description: "Percentage must be between 0 and 100.",
        variant: "destructive",
      })
      return
    }

    startTransition(async () => {
      const formData = new FormData()
      formData.append("name", editingAvatarValues.name)
      formData.append("default_percentage", editingAvatarValues.default_percentage.toString())
      const result = await updateAvatar(avatarId, formData)
      if (result.success) {
        toast({ title: "Avatar Updated", description: result.message })
        setEditingAvatarId(null)
        setEditingAvatarValues(null)
        await refreshAvatars()
      } else {
        toast({ title: "Failed to Update Avatar", description: result.message, variant: "destructive" })
      }
    })
  }

  const handleDeleteAvatar = async (avatarId: string) => {
    startTransition(async () => {
      const result = await deleteAvatar(avatarId)
      if (result.success) {
        toast({ title: "Avatar Deleted", description: result.message })
        await refreshAvatars()
      } else {
        toast({ title: "Failed to Delete Avatar", description: result.message, variant: "destructive" })
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> Manage Avatars
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Add New Avatar Form */}
          <div className="border p-4 rounded-md space-y-3 bg-gray-50">
            <h3 className="font-semibold text-lg">Add New Avatar</h3>
            <form id="new-avatar-form" className="space-y-3">
              <div>
                <Label htmlFor="name" className="text-sm">
                  Avatar Name
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={newAvatar.name}
                  onChange={handleNewAvatarChange}
                  placeholder="e.g., John Doe, Marketing Fund"
                  disabled={isPending}
                />
              </div>
              <div>
                <Label htmlFor="default_percentage" className="text-sm">
                  Default Percentage (%)
                </Label>
                <div className="relative">
                  <Input
                    id="default_percentage"
                    name="default_percentage"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={newAvatar.default_percentage}
                    onChange={handleNewAvatarChange}
                    placeholder="0.00"
                    className="pr-8"
                    disabled={isPending}
                  />
                  <Percent className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>
              {userPlan?.toLowerCase() != "free" ? (
  <Button type="button" onClick={handleCreateAvatar} className="w-full" disabled={isPending}>
    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
    Add Avatar
  </Button>
) : (
  <>
    <Button type="button" onClick={() => setShowPremiumModal(true)} className="w-full">
      <Star className="h-4 w-4 mr-2 text-yellow-500" />
      Add Avatar
    </Button>
    <PremiumFeatureModal
      open={showPremiumModal}
      onOpenChange={setShowPremiumModal}
      featureName="Add Avatar"
    />
  </>
)}
            </form>
          </div>

          {/* Existing Avatars List */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Existing Avatars</h3>
            {avatars.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4" />
                <p>No avatars created yet. Add one above!</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Default %</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {avatars.map((avatar) => (
                    <TableRow key={avatar.id}>
                      <TableCell className="font-medium">
                        {editingAvatarId === avatar.id ? (
                          <Input
                            id="name"
                            value={editingAvatarValues?.name || ""}
                            onChange={handleEditChange}
                            disabled={isPending}
                          />
                        ) : (
                          <>
                            {avatar.name}
                            {avatar.id === defaultAvatarId && (
                              <span className="ml-2 text-xs text-gray-500">(Main Account)</span>
                            )}
                          </>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {editingAvatarId === avatar.id ? (
                          <div className="relative">
                            <Input
                              id="default_percentage"
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              value={editingAvatarValues?.default_percentage || 0}
                              onChange={handleEditChange}
                              className="pr-8 text-right"
                              disabled={isPending}
                            />
                            <Percent className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          </div>
                        ) : (
                          `${avatar.default_percentage.toFixed(2)}%`
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {editingAvatarId === avatar.id ? (
                          <div className="flex justify-end gap-2">
                            <Button size="sm" onClick={() => handleSaveEdit(avatar.id)} disabled={isPending}>
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingAvatarId(null)}
                              disabled={isPending}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditClick(avatar)}
                              disabled={isPending}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteAvatar(avatar.id)}
                              disabled={isPending || avatar.id === defaultAvatarId} // Disable delete for default avatar
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

