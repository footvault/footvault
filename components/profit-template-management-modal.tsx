"use client"

import { useState, useTransition, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, Loader2, Save, PieChart, Users, FileText, ChevronRight } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { motion, AnimatePresence } from "framer-motion"
import type { ProfitDistributionTemplateDetail } from "@/lib/types"
import { cn } from "@/lib/utils"

interface AvatarType {
  id: string
  name: string
  default_percentage: number
}

interface ProfitTemplateItem {
  avatar_id: string
  percentage: number
  avatar_name?: string
}

interface ProfitTemplate extends ProfitDistributionTemplateDetail {}

interface ProfitTemplateManagementModalProps {
  isOpen: boolean
  onClose: () => void
  avatars: AvatarType[]
  profitTemplates: ProfitTemplate[]
}

export function ProfitTemplateManagementModal({
  isOpen,
  onClose,
  avatars,
  profitTemplates,
}: ProfitTemplateManagementModalProps) {
  const [isPending, startTransition] = useTransition()
  const [selectedTemplate, setSelectedTemplate] = useState<ProfitTemplate | null>(null)
  const [templateName, setTemplateName] = useState("")
  const [templateDescription, setTemplateDescription] = useState("")
  const [templateItems, setTemplateItems] = useState<ProfitTemplateItem[]>([])
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    if (!isOpen) resetForm()
  }, [isOpen])

  useEffect(() => {
    if (selectedTemplate) {
      setTemplateName(selectedTemplate.name)
      setTemplateDescription(selectedTemplate.description || "")
      setTemplateItems(
        (selectedTemplate.distributions ?? []).map((item) => ({
          avatar_id: item.avatar_id,
          percentage: item.percentage,
          avatar_name: avatars.find((a) => a.id === item.avatar_id)?.name || "",
        }))
      )
      setIsEditing(true)
    } else {
      resetForm()
    }
  }, [selectedTemplate, avatars])

  const fetchTemplateWithDistributions = async (id: string) => {
    try {
      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`/api/get-profit-template?id=${id}`, {
        headers: { Authorization: `Bearer ${session?.access_token || ''}` }
      })
      const result = await response.json()
      if (result.success && result.data) setSelectedTemplate(result.data)
      else toast({ title: "Error", description: result.error || "Failed to fetch template.", variant: "destructive" })
    } catch {
      toast({ title: "Error", description: "Unexpected error fetching template.", variant: "destructive" })
    }
  }

  const resetForm = () => {
    setSelectedTemplate(null)
    setTemplateName("")
    setTemplateDescription("")
    setTemplateItems([])
    setIsEditing(false)
  }

  const handleAddTemplateItem = () => setTemplateItems((prev) => [...prev, { avatar_id: "", percentage: 0 }])

  const handleRemoveTemplateItem = (index: number) => setTemplateItems((prev) => prev.filter((_, i) => i !== index))

  const handleItemPercentageChange = (index: number, value: number) => {
    setTemplateItems((prev) => prev.map((item, i) => i === index ? { ...item, percentage: value } : item))
  }

  const handleItemAvatarChange = (index: number, avatarId: string) => {
    const avatar = avatars.find((a) => a.id === avatarId)
    setTemplateItems((prev) => prev.map((item, i) => 
      i === index 
        ? { 
            ...item, 
            avatar_id: avatarId, 
            avatar_name: avatar?.name || "",
            percentage: avatar?.default_percentage || 0
          } 
        : item
    ))
  }

  const validateForm = () => {
    if (!templateName.trim()) {
      toast({ title: "Validation Error", description: "Template name cannot be empty.", variant: "destructive" })
      return false
    }
    if (templateItems.length === 0) {
      toast({ title: "Validation Error", description: "Please add at least one participant.", variant: "destructive" })
      return false
    }
    if (templateItems.some((item) => !item.avatar_id)) {
      toast({ title: "Validation Error", description: "Please select an avatar for all participants.", variant: "destructive" })
      return false
    }
    const total = templateItems.reduce((sum, item) => sum + item.percentage, 0)
    if (Math.abs(total - 100) > 0.01) {
      toast({ title: "Validation Error", description: `Total percentage must be 100%. Current: ${total.toFixed(2)}%`, variant: "destructive" })
      return false
    }
    return true
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    startTransition(async () => {
      const payload = {
        name: templateName,
        description: templateDescription,
        distributions: templateItems.map(({ avatar_id, percentage }) => ({ avatar_id, percentage })),
      }

      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token || ""}`,
      }

      const response = await fetch(
        isEditing && selectedTemplate ? "/api/update-profit-template" : "/api/add-profit-template",
        {
          method: "POST",
          headers,
          body: JSON.stringify(isEditing && selectedTemplate ? { id: selectedTemplate.id, ...payload } : payload),
        }
      )

      const result = await response.json()
      if (result.success) {
        toast({ title: "Success", description: `Template ${isEditing ? "updated" : "added"} successfully!` })
        onClose()
      } else {
        toast({ title: "Error", description: result.error || "Failed to save template.", variant: "destructive" })
      }
    })
  }

  const handleDelete = async () => {
    if (!selectedTemplate || !confirm(`Are you sure you want to delete template "${selectedTemplate.name}"?`)) return

    startTransition(async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client")
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        const response = await fetch("/api/delete-profit-template", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token || ''}`,
          },
          body: JSON.stringify({ id: selectedTemplate.id }),
        })
        const result = await response.json()
        if (result.success) {
          toast({ title: "Success", description: "Template deleted successfully!" })
          onClose()
        } else {
          toast({ title: "Error", description: result.error || "Failed to delete template.", variant: "destructive" })
        }
      } catch {
        toast({ title: "Error", description: "Unexpected error deleting template.", variant: "destructive" })
      }
    })
  }

  const totalPercentage = templateItems.reduce((sum, item) => sum + item.percentage, 0)
  const isValidTotal = Math.abs(totalPercentage - 100) <= 0.01

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-hidden flex flex-col p-0 custom-scrollbar">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="flex items-start gap-3"
          >
            <div className="rounded-lg bg-purple-500/10 p-2.5 shrink-0">
              <PieChart className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <DialogHeader className="p-0 space-y-1">
                <DialogTitle className="text-lg font-semibold tracking-tight">
                  {selectedTemplate ? "Edit Profit Template" : "Create New Profit Template"}
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  {selectedTemplate
                    ? "Modify the details of this profit distribution template."
                    : "Create a new template for recurring profit distributions."}
                </DialogDescription>
              </DialogHeader>
            </div>
          </motion.div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-5 space-y-5">
          {/* Template Name */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.05 }}
            className="space-y-2"
          >
            <Label htmlFor="templateName" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Template Name
            </Label>
            <Input 
              id="templateName" 
              value={templateName} 
              onChange={(e) => setTemplateName(e.target.value)} 
              placeholder="e.g., Store Split, Team Distribution"
              className="h-10 bg-muted/30 border-border focus:bg-background transition-colors"
              disabled={isPending} 
            />
          </motion.div>

          {/* Participants Section */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.1 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Participants</h3>
                {templateItems.length > 0 && (
                  <span className="text-xs text-muted-foreground">({templateItems.length})</span>
                )}
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleAddTemplateItem} 
                disabled={isPending}
                className="h-8 text-xs gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" /> 
                Add
              </Button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
              <AnimatePresence mode="popLayout">
                {templateItems.map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="rounded-lg border border-border bg-muted/30 p-3"
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar Letter Badge */}
                      <div className="flex-shrink-0">
                        {item.avatar_id ? (
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-primary text-sm font-semibold">
                              {avatars.find(a => a.id === item.avatar_id)?.name.charAt(0).toUpperCase() || 'A'}
                            </span>
                          </div>
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                            <span className="text-muted-foreground text-sm font-semibold">?</span>
                          </div>
                        )}
                      </div>

                      {/* Avatar Selection */}
                      <div className="flex-1 min-w-0">
                        <Select 
                          value={item.avatar_id} 
                          onValueChange={(value) => handleItemAvatarChange(index, value)} 
                          disabled={isPending}
                        >
                          <SelectTrigger className="h-9 bg-background border-border text-sm">
                            <SelectValue placeholder="Select participant" />
                          </SelectTrigger>
                          <SelectContent>
                            {avatars.map((avatar) => (
                              <SelectItem key={avatar.id} value={avatar.id}>
                                <div className="flex items-center gap-2">
                                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                                    <span className="text-primary text-[10px] font-semibold">
                                      {avatar.name.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  <span>{avatar.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Percentage Input */}
                      <div className="flex-shrink-0 relative">
                        <Input 
                          type="number" 
                          value={item.percentage || ''} 
                          onChange={(e) => handleItemPercentageChange(index, Number(e.target.value))} 
                          placeholder="0" 
                          min="0" 
                          max="100" 
                          step="0.01" 
                          className="w-20 h-9 pr-7 text-center text-sm bg-background border-border" 
                          disabled={isPending} 
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                      </div>

                      {/* Remove Button */}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleRemoveTemplateItem(index)} 
                        disabled={isPending}
                        className="flex-shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {templateItems.length === 0 && (
                <div className="text-center py-8 rounded-lg border border-dashed border-border bg-muted/20">
                  <Users className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No participants added yet.</p>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">Click &ldquo;Add&rdquo; to get started.</p>
                </div>
              )}
            </div>

            {/* Total Percentage Display */}
            {templateItems.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={cn(
                  "rounded-lg border-2 p-3 transition-colors",
                  isValidTotal
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-destructive/30 bg-destructive/5"
                )}
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Percentage</span>
                  <span className={cn(
                    "text-base font-bold tabular-nums",
                    isValidTotal ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                  )}>
                    {totalPercentage.toFixed(2)}%
                  </span>
                </div>
                {!isValidTotal && (
                  <p className="text-xs text-destructive/80 mt-1">
                    Total must equal 100%
                  </p>
                )}
              </motion.div>
            )}
          </motion.div>

          {/* Existing Templates Section */}
          {profitTemplates.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.15 }}
              className="space-y-3"
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Existing Templates</h3>
                <span className="text-xs text-muted-foreground">({profitTemplates.length})</span>
              </div>
              <div className="grid gap-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                {profitTemplates.map((template, i) => (
                  <motion.div
                    key={template.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: i * 0.03 }}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border border-border",
                      "hover:bg-muted/50 cursor-pointer transition-all duration-150",
                      "group",
                      selectedTemplate?.id === template.id && "bg-primary/5 border-primary/30"
                    )}
                    onClick={() => fetchTemplateWithDistributions(template.id)}
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-medium">{template.name}</span>
                      {template.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{template.description}</p>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0 group-hover:text-foreground transition-colors" />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/20">
          <div className="flex gap-2 w-full">
            {selectedTemplate && (
              <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isPending} className="gap-1.5">
                {isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                Delete
              </Button>
            )}
            
            <div className="flex-1" />
            
            {isEditing && (
              <Button variant="outline" size="sm" onClick={resetForm} disabled={isPending}>
                Cancel
              </Button>
            )}
            <Button size="sm" onClick={handleSubmit} disabled={isPending} className="gap-1.5">
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              {isEditing ? "Save Changes" : "Create Template"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}


export default ProfitTemplateManagementModal;
