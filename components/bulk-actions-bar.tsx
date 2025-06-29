"use client"

import { Button } from "@/components/ui/button"
import { Copy, Trash2, QrCode, Printer, Download, Edit, Package, CheckSquare } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

interface BulkActionsBarProps {
  selectedCount: number
  selectedVariantCount: number
  onAction: (action: string) => void
  isLoading: boolean
}

export function BulkActionsBar({ selectedCount, selectedVariantCount, onAction, isLoading }: BulkActionsBarProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-900">
            {selectedCount} product{selectedCount !== 1 ? "s" : ""} selected
          </span>
        </div>
        {selectedVariantCount > 0 && (
          <div className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-900">
              {selectedVariantCount} individual shoe{selectedVariantCount !== 1 ? "s" : ""} selected
            </span>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {selectedCount > 0 && (
          <>
           

            <Button variant="outline" size="sm" onClick={() => onAction("export")} disabled={isLoading}>
              <Download className="h-4 w-4 mr-1" />
              Export Products
            </Button>

            <Button variant="outline" size="sm" onClick={() => onAction("print-qr")} disabled={isLoading}>
              <QrCode className="h-4 w-4 mr-1" />
              Print Product QR
            </Button>
          </>
        )}

        {selectedVariantCount > 0 && (
          <>
            <Button variant="outline" size="sm" onClick={() => onAction("print-variant-qr")} disabled={isLoading}>
              <QrCode className="h-4 w-4 mr-1" />
              Print Individual QR ({selectedVariantCount})
            </Button>

          
          </>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={isLoading}>
              More Actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {selectedVariantCount > 0 && (
              <>
               
              
                
          
              </>
            )}
           
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onAction("delete")} className="text-red-600">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Selected
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
