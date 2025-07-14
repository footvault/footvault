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
import { deleteProfitDistributionTemplate } from "@/app/actions"
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
    if (!selectedTemplate || !confirm(`Are you sure you want to delete template \"${selectedTemplate.name}\"?`)) return

    startTransition(async () => {
      const result = await deleteProfitDistributionTemplate(selectedTemplate.id)
      if (result.success) {
        toast({ title: "Success", description: "Template deleted successfully!" })
        onClose()
      } else {
        toast({ title: "Error", description: result.error || "Failed to delete template.", variant: "destructive" })
      }
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{selectedTemplate ? "Edit Profit Template" : "Create New Profit Template"}</DialogTitle>
          <DialogDescription>
            {selectedTemplate
              ? "Modify the details of this profit distribution template."
              : "Create a new template for recurring profit distributions."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="templateName" className="text-right">Name</Label>
            <Input id="templateName" value={templateName} onChange={(e) => setTemplateName(e.target.value)} className="col-span-3" disabled={isPending} />
          </div>
         
          <h3 className="text-lg font-semibold mt-4 col-span-4">Participants</h3>
          <div className="space-y-3">
            {templateItems.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <Select value={item.avatar_id} onValueChange={(value) => handleItemAvatarChange(index, value)} disabled={isPending}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select Avatar" />
                  </SelectTrigger>
                  <SelectContent>
                    {avatars.map((avatar) => (
                      <SelectItem key={avatar.id} value={avatar.id}>
                        <div className="flex items-center gap-2">
                          <UIAvatar className="h-6 w-6">
                            <AvatarImage src={`/api/avatar?name=${avatar.name}`} />
                            <AvatarFallback>{avatar.name.charAt(0)}</AvatarFallback>
                          </UIAvatar>
                          {avatar.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative w-24">
                  <Input type="number" value={item.percentage} onChange={(e) => handleItemPercentageChange(index, Number(e.target.value))} placeholder="0" min="0" max="100" step="0.01" className="pr-6" disabled={isPending} />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleRemoveTemplateItem(index)} disabled={isPending}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            ))}
            <Button variant="outline" className="w-full" onClick={handleAddTemplateItem} disabled={isPending}>
              <Plus className="h-4 w-4 mr-2" /> Add Participant
            </Button>
          </div>

          <div className="flex justify-between font-semibold text-sm mt-4">
            <span>Total Percentage:</span>
            <span
              className={
                Math.abs(templateItems.reduce((sum, item) => sum + item.percentage, 0) - 100) > 0.01
                  ? "text-red-500"
                  : "text-green-600"
              }
            >
              {templateItems.reduce((sum, item) => sum + item.percentage, 0).toFixed(2)}%
            </span>
          </div>

          <h3 className="text-lg font-semibold mt-4 col-span-4">Existing Templates</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
            {profitTemplates.length === 0 ? (
              <p className="text-gray-500 text-center">No templates created yet.</p>
            ) : (
              profitTemplates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-center justify-between p-2 border rounded-md hover:bg-gray-50 cursor-pointer"
                  onClick={() => fetchTemplateWithDistributions(template.id)}
                >
                  <span>{template.name}</span>
                  <Edit className="h-4 w-4 text-gray-500" />
                </div>
              ))
            )}
          </div>
        </div>

        <DialogFooter>
          {selectedTemplate && (
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />} Delete
            </Button>
          )}
          {isEditing && (
            <Button variant="outline" onClick={resetForm} disabled={isPending}>Cancel</Button>
          )}
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {isEditing ? "Save Changes" : "Create Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
