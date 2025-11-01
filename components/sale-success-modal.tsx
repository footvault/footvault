"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CheckCircle, FileText, ShoppingCart, Loader2, Truck } from "lucide-react"
import { useRouter } from "next/navigation"

interface SaleSuccessModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  saleId?: string
  onPrintReceipt?: () => void
  isPrintingReceipt?: boolean
  hasShipping?: boolean
  onPrintShippingLabel?: () => void
  isPrintingShippingLabel?: boolean
}

export function SaleSuccessModal({
  open,
  onOpenChange,
  saleId,
  onPrintReceipt,
  isPrintingReceipt = false,
  hasShipping = false,
  onPrintShippingLabel,
  isPrintingShippingLabel = false,
}: SaleSuccessModalProps) {
  const router = useRouter()

  const handleMakeSale = () => {
    onOpenChange(false)
    router.push("/checkout")
  }

  const handlePrintReceipt = () => {
    if (onPrintReceipt) {
      onPrintReceipt()
    }
  }

  const handlePrintShippingLabel = () => {
    if (onPrintShippingLabel) {
      onPrintShippingLabel()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] text-center p-8">
        <DialogHeader>
          <DialogTitle className="sr-only">Sale Success</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center space-y-6">
          <CheckCircle className="h-20 w-20 text-green-500 animate-bounce" />
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-green-700">Sale Completed!</h2>
            <p className="text-lg text-gray-600">You have successfully recorded the sale. Congrats!</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Button
              onClick={handlePrintReceipt}
              variant="outline"
              className="flex items-center gap-2"
              disabled={isPrintingReceipt}
            >
              {isPrintingReceipt ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              {isPrintingReceipt ? "Generating Receipt..." : "Print Receipt"}
            </Button>
            {hasShipping && (
              <Button
                onClick={handlePrintShippingLabel}
                variant="outline"
                className="flex items-center gap-2"
                disabled={isPrintingShippingLabel}
              >
                {isPrintingShippingLabel ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Truck className="h-4 w-4" />
                )}
                {isPrintingShippingLabel ? "Generating Label..." : "Print Shipping Label"}
              </Button>
            )}
            <Button
              onClick={handleMakeSale}
              className="flex items-center gap-2"
            >
              <ShoppingCart className="h-4 w-4" />
              Make More Sales
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
