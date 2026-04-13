"use client"

import type React from "react"

import { useState, useTransition, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Edit, Trash2, Loader2, Users, Percent, Save, XCircle, Star, Plus, Crown } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "@/hooks/use-toast"
import type { Avatar, AvatarFormValues } from "@/lib/types"
import PremiumFeatureModal from "./PremiumFeatureModal"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

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
  const [userPlan, setUserPlan] = useState<string | null>(null)
  const [showPremiumModal, setShowPremiumModal] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [deletingAvatarId, setDeletingAvatarId] = useState<string | null>(null)

  useEffect(() => {
    setAvatars(initialAvatars)
  }, [initialAvatars])

  const createMainAvatarIfMissing = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const { data: { user } } = await supabase.auth.getUser();
      if (!session || !user) return;
      const mainName = user.user_metadata?.full_name || user.email || 'Main Account';
      await fetch('/api/create-avatar', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: (() => {
          const fd = new FormData();
          fd.append('name', mainName);
          fd.append('default_percentage', '100');
          return fd;
        })()
      });
    } catch {}
  }, []);

  const fetchAvatars = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const response = await fetch('/api/get-avatars', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      const result = await response.json();
      if (result.success && result.data) {
        setAvatars(result.data);
        if (result.data.length === 0) {
          await createMainAvatarIfMissing();
          const refetch = await fetch('/api/get-avatars', {
            headers: { 'Authorization': `Bearer ${session.access_token}` },
          });
          const refetchResult = await refetch.json();
          if (refetchResult.success && refetchResult.data) {
            setAvatars(refetchResult.data);
          }
        }
      }
    } catch {}
  }, [createMainAvatarIfMissing]);

  useEffect(() => {
    if (open) fetchAvatars();
  }, [open, fetchAvatars]);

  const fetchUserPlan = useCallback(async () => {
    try {
      setIsLoading(true);
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Authentication Required", description: "Please sign in to access features.", variant: "destructive" });
        return;
      }
      const response = await fetch('/api/user-plan', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to fetch user plan.");
      if (result.plan) setUserPlan(result.plan);
      else throw new Error("Plan data missing from response.");
    } catch (error: any) {
      console.error("Error fetching user plan:", error);
      toast({ title: "Error", description: error.message || "An error occurred while checking your plan.", variant: "destructive" });
      setUserPlan("free");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserPlan();
  }, [fetchUserPlan]);

  const defaultAvatarId = avatars.length > 0 ? avatars[0].id : null

  const getAvatarLimit = (plan: string | null): number => {
    switch (plan?.toLowerCase()) {
      case 'team': return 5
      case 'store': return 100
      default: return 0
    }
  }

  const canAddAvatar = (plan: string | null, currentCount: number): boolean => {
    if (!plan || ['free', 'individual'].includes(plan.toLowerCase())) return false
    return currentCount < getAvatarLimit(plan)
  }

  const shouldShowCounter = (plan: string | null): boolean => {
    return typeof plan === "string" && ['team', 'store'].includes(plan.toLowerCase())
  }

  const handleNewAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    setNewAvatar((prev) => ({
      ...prev,
      [id]: id === "default_percentage" ? Number.parseFloat(value) : value,
    }))
  }

  const handleCreateAvatar = async () => {
    if (!canAddAvatar(userPlan, avatars.length)) {
      const limit = getAvatarLimit(userPlan)
      const planName = userPlan?.toLowerCase()
      if (planName === 'free' || planName === 'individual') {
        toast({ title: "Premium Feature", description: "Avatar creation is available for Team and Store plans only.", variant: "destructive" })
      } else {
        toast({ title: "Avatar Limit Reached", description: `You've reached the maximum of ${limit} avatars for your ${userPlan} plan.`, variant: "destructive" })
      }
      return
    }
    if (!newAvatar.name.trim()) {
      toast({ title: "Name Required", description: "Please enter a name for the avatar.", variant: "destructive" })
      return
    }
    if (isNaN(newAvatar.default_percentage) || newAvatar.default_percentage < 0 || newAvatar.default_percentage > 100) {
      toast({ title: "Invalid Percentage", description: "Percentage must be between 0 and 100.", variant: "destructive" })
      return
    }

    startTransition(async () => {
      try {
        const form = document.getElementById("new-avatar-form") as HTMLFormElement
        const formData = new FormData(form)
        const { createClient } = await import("@/lib/supabase/client")
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        const response = await fetch("/api/create-avatar", {
          method: "POST",
          headers: { Authorization: `Bearer ${session?.access_token || ""}` },
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
      } catch {
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
    if (isNaN(editingAvatarValues.default_percentage) || editingAvatarValues.default_percentage < 0 || editingAvatarValues.default_percentage > 100) {
      toast({ title: "Invalid Percentage", description: "Percentage must be between 0 and 100.", variant: "destructive" })
      return
    }

    startTransition(async () => {
      const formData = new FormData()
      formData.append("id", avatarId)
      formData.append("name", editingAvatarValues.name)
      formData.append("default_percentage", editingAvatarValues.default_percentage.toString())
      try {
        const response = await fetch("/api/update-avatar", { method: "POST", body: formData });
        const result = await response.json();
        if (result.success) {
          toast({ title: "Avatar Updated", description: result.message })
          setEditingAvatarId(null)
          setEditingAvatarValues(null)
          await refreshAvatars()
        } else {
          toast({ title: "Failed to Update Avatar", description: result.message, variant: "destructive" })
        }
      } catch {
        toast({ title: "Failed to Update Avatar", description: "Unexpected error.", variant: "destructive" })
      }
    })
  }

  const handleDeleteAvatar = async (avatarId: string) => {
    setDeletingAvatarId(avatarId)
    try {
      const response = await fetch("/api/delete-avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: avatarId }),
      });
      const result = await response.json();
      if (result.success) {
        toast({ title: "Avatar Deleted", description: result.message })
        await refreshAvatars()
      } else {
        toast({ title: "Failed to Delete Avatar", description: result.message, variant: "destructive" })
      }
    } catch {
      toast({ title: "Failed to Delete Avatar", description: "Unexpected error.", variant: "destructive" })
    } finally {
      setDeletingAvatarId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 custom-scrollbar">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="flex items-start gap-3"
          >
            <div className="rounded-lg bg-blue-500/10 p-2.5 shrink-0">
              <Users className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <DialogHeader className="p-0 space-y-1">
                <DialogTitle className="text-lg font-semibold tracking-tight">Manage Avatars</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground mt-0.5">Create and manage profit distribution participants</p>
            </div>
          </motion.div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-5 space-y-5">
          {/* Add New Avatar Form */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.05 }}
            className="rounded-xl border border-border bg-muted/30 p-4 space-y-3"
          >
            <div className="flex items-center gap-2 mb-1">
              <Plus className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Add New Avatar</h3>
            </div>
            <form id="new-avatar-form" className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Avatar Name
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    value={newAvatar.name}
                    onChange={handleNewAvatarChange}
                    placeholder="e.g., John Doe"
                    className="h-9 bg-background border-border"
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="default_percentage" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Default Percentage
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
                      className="h-9 pr-8 bg-background border-border"
                      disabled={isPending}
                    />
                    <Percent className="absolute right-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </div>
              </div>
              
              {shouldShowCounter(userPlan) && (
                <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-1.5">
                  <span>Avatars</span>
                  <span className="font-medium tabular-nums">
                    {avatars.length} / {getAvatarLimit(userPlan)} used
                  </span>
                </div>
              )}

              {canAddAvatar(userPlan, avatars.length) ? (
                <Button type="button" onClick={handleCreateAvatar} className="w-full h-9 text-sm gap-1.5" disabled={isPending}>
                  {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <Plus className="h-3.5 w-3.5" />
                  Add Avatar
                </Button>
              ) : (
                <>
                  <Button 
                    type="button" 
                    onClick={userPlan && ['free', 'individual'].includes(userPlan.toLowerCase()) 
                      ? () => setShowPremiumModal(true) 
                      : undefined
                    } 
                    className="w-full h-9 text-sm gap-1.5" 
                    disabled={!!userPlan && ['team', 'store'].includes(userPlan.toLowerCase())}
                  >
                    {userPlan && ['free', 'individual'].includes(userPlan.toLowerCase()) ? (
                      <>
                        <Crown className="h-3.5 w-3.5 text-yellow-500" />
                        Upgrade to Add Avatars
                      </>
                    ) : (
                      <>
                        <Users className="h-3.5 w-3.5" />
                        Avatar Limit Reached
                      </>
                    )}
                  </Button>
                  {userPlan && ['free', 'individual'].includes(userPlan.toLowerCase()) && (
                    <PremiumFeatureModal
                      open={showPremiumModal}
                      onOpenChange={setShowPremiumModal}
                      featureName="Add Avatar"
                    />
                  )}
                </>
              )}
            </form>
          </motion.div>

          {/* Existing Avatars List */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.1 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Existing Avatars</h3>
                {avatars.length > 0 && (
                  <span className="text-xs text-muted-foreground">({avatars.length})</span>
                )}
              </div>
            </div>

            {avatars.length === 0 ? (
              <div className="text-center py-10 rounded-lg border border-dashed border-border bg-muted/20">
                <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No avatars created yet.</p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">Add one above to get started!</p>
              </div>
            ) : (
              <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {avatars.map((avatar, i) => (
                    <motion.div
                      key={avatar.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2, delay: i * 0.03 }}
                      className={cn(
                        "rounded-lg border border-border p-3 transition-all duration-150",
                        editingAvatarId === avatar.id ? "bg-primary/5 border-primary/30" : "hover:bg-muted/40"
                      )}
                    >
                      {editingAvatarId === avatar.id ? (
                        /* Edit mode */
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-primary text-sm font-semibold">
                              {(editingAvatarValues?.name || avatar.name).charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <Input
                              id="name"
                              value={editingAvatarValues?.name || ""}
                              onChange={handleEditChange}
                              disabled={isPending}
                              className="h-8 text-sm bg-background border-border"
                              placeholder="Avatar name"
                            />
                          </div>
                          <div className="relative shrink-0">
                            <Input
                              id="default_percentage"
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              value={editingAvatarValues?.default_percentage || 0}
                              onChange={handleEditChange}
                              className="w-20 h-8 pr-7 text-center text-sm bg-background border-border"
                              disabled={isPending}
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button size="icon" className="h-8 w-8" onClick={() => handleSaveEdit(avatar.id)} disabled={isPending}>
                              <Save className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setEditingAvatarId(null)} disabled={isPending}>
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        /* View mode */
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-primary text-sm font-semibold">
                              {avatar.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium truncate">{avatar.name}</span>
                              {avatar.id === defaultAvatarId && (
                                <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Main</span>
                              )}
                            </div>
                          </div>
                          <span className="text-sm font-medium tabular-nums text-muted-foreground shrink-0">
                            {avatar.default_percentage.toFixed(2)}%
                          </span>
                          <div className="flex gap-1 shrink-0">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => handleEditClick(avatar)}
                              disabled={isPending}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteAvatar(avatar.id)}
                              disabled={deletingAvatarId === avatar.id || isPending || avatar.id === defaultAvatarId}
                            >
                              {deletingAvatarId === avatar.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/20">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isPending} className="w-full sm:w-auto">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

