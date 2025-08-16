"use client"

import { useState, useTransition, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, Loader2, Edit, Save } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Avatar as UIAvatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { ProfitDistributionTemplateDetail } from "@/lib/types"

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
    setTemplateItems((prev) => prev.map((item, i) => i === index ? { ...item, avatar_id: avatarId, avatar_name: avatar?.name || "" } : item))
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-6">
          <DialogTitle className="text-2xl font-bold">
            {selectedTemplate ? "Edit Profit Template" : "Create New Profit Template"}
          </DialogTitle>
          <DialogDescription className="text-base">
            {selectedTemplate
              ? "Modify the details of this profit distribution template."
              : "Create a new template for recurring profit distributions."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6">
          {/* Template Name Section */}
          <div className="space-y-2">
            <Label htmlFor="templateName" className="text-sm font-medium">
              Template Name
            </Label>
            <Input 
              id="templateName" 
              value={templateName} 
              onChange={(e) => setTemplateName(e.target.value)} 
              placeholder="e.g., Store Split, Team Distribution"
              className="h-11"
              disabled={isPending} 
            />
          </div>

          {/* Participants Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Participants</h3>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleAddTemplateItem} 
                disabled={isPending}
                className="h-9"
              >
                <Plus className="h-4 w-4 mr-2" /> 
                Add Participant
              </Button>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto">
              {templateItems.map((item, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    {/* Avatar Letter Badge */}
                    <div className="flex-shrink-0">
                      {item.avatar_id ? (
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-blue-600 font-semibold">
                            {avatars.find(a => a.id === item.avatar_id)?.name.charAt(0).toUpperCase() || 'A'}
                          </span>
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-400 font-semibold">?</span>
                        </div>
                      )}
                    </div>

                    {/* Avatar Selection */}
                    <div className="flex-1">
                      <Select 
                        value={item.avatar_id} 
                        onValueChange={(value) => handleItemAvatarChange(index, value)} 
                        disabled={isPending}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Select participant" />
                        </SelectTrigger>
                        <SelectContent>
                          {avatars.map((avatar) => (
                            <SelectItem key={avatar.id} value={avatar.id}>
                              <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                                  <span className="text-blue-600 text-xs font-semibold">
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
                        className="w-20 h-11 pr-8 text-center" 
                        disabled={isPending} 
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">%</span>
                    </div>

                    {/* Remove Button */}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleRemoveTemplateItem(index)} 
                      disabled={isPending}
                      className="flex-shrink-0 h-9 w-9 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {templateItems.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>No participants added yet.</p>
                  <p className="text-sm">Click "Add Participant" to get started.</p>
                </div>
              )}
            </div>

            {/* Total Percentage Display */}
            <div className="bg-white border-2 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total Percentage:</span>
                <span className={`text-lg font-bold ${
                  Math.abs(templateItems.reduce((sum, item) => sum + item.percentage, 0) - 100) > 0.01
                    ? "text-red-500"
                    : "text-green-600"
                }`}>
                  {templateItems.reduce((sum, item) => sum + item.percentage, 0).toFixed(2)}%
                </span>
              </div>
              {Math.abs(templateItems.reduce((sum, item) => sum + item.percentage, 0) - 100) > 0.01 && (
                <p className="text-sm text-red-500 mt-1">
                  Total must equal 100%
                </p>
              )}
            </div>
          </div>

          {/* Existing Templates Section */}
          {profitTemplates.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Existing Templates</h3>
              <div className="grid gap-2 max-h-48 overflow-y-auto">
                {profitTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => fetchTemplateWithDistributions(template.id)}
                  >
                    <div>
                      <span className="font-medium">{template.name}</span>
                      {template.description && (
                        <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                      )}
                    </div>
                    <Edit className="h-4 w-4 text-gray-400" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="pt-6 border-t">
          <div className="flex gap-2 w-full">
            {selectedTemplate && (
              <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Delete
              </Button>
            )}
            
            <div className="flex-1" />
            
            {isEditing && (
              <Button variant="outline" onClick={resetForm} disabled={isPending}>
                Cancel
              </Button>
            )}
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {isEditing ? "Save Changes" : "Create Template"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


export default ProfitTemplateManagementModal;
