"use client"

import { Dialog, DialogContent } from "@/components/ui/dialog"
import { CheckCircle } from "lucide-react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

interface SaleSuccessModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  redirectPath?: string
  redirectDelay?: number // in milliseconds
}

export function SaleSuccessModal({
  open,
  onOpenChange,
  redirectPath = "/",
  redirectDelay = 3000,
}: SaleSuccessModalProps) {
  const router = useRouter()

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (open) {
      timer = setTimeout(() => {
        router.push(redirectPath)
      }, redirectDelay)
    }
    return () => clearTimeout(timer)
  }, [open, redirectPath, redirectDelay, router])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] text-center p-8">
        <div className="flex flex-col items-center justify-center space-y-4">
          <CheckCircle className="h-20 w-20 text-green-500 animate-bounce" />
          <h2 className="text-3xl font-bold text-green-700">Sale Completed!</h2>
          <p className="text-lg text-gray-600">You have successfully recorded the sale. Congrats!</p>
          <p className="text-sm text-gray-500">Redirecting to inventory...</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
