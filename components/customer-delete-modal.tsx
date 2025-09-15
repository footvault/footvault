"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Trash2, AlertTriangle } from "lucide-react"
import { toast } from "sonner"

interface Customer {
  id: number
  name: string
  email: string | null
  phone: string | null
  customerType: string
}

interface CustomerDeleteModalProps {
  customer: Customer | null
  isOpen: boolean
  onClose: () => void
  onDelete: (customerId: number) => void
}

export function CustomerDeleteModal({
  customer,
  isOpen,
  onClose,
  onDelete,
}: CustomerDeleteModalProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!customer) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/customers/${customer.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete customer')
      }

      toast.success(`Customer "${customer.name}" deleted successfully`)
      onDelete(customer.id)
      onClose()
    } catch (error) {
      console.error('Error deleting customer:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete customer')
    } finally {
      setIsDeleting(false)
    }
  }

  if (!customer) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="h-5 w-5" />
            Delete Customer
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete the customer and remove all associated data.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            <p className="font-medium text-red-900">
              You are about to delete:
            </p>
            <div className="text-sm text-red-700">
              <p><strong>Name:</strong> {customer.name}</p>
              <p><strong>Phone:</strong> {customer.phone || 'N/A'}</p>
              <p><strong>Email:</strong> {customer.email || 'N/A'}</p>
              <p><strong>Type:</strong> {customer.customerType.toUpperCase()}</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
            className="gap-2"
          >
            {isDeleting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Delete Customer
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}