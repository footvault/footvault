"use client"

import React from "react"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import QRScanner from "./qr-scanner"

interface InventorySearchWithQRProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  placeholder?: string
  className?: string
}

export default function InventorySearchWithQR({ 
  searchTerm, 
  onSearchChange, 
  placeholder = "Search by name, SKU, or serial number...",
  className = ""
}: InventorySearchWithQRProps) {
  const handleQRScanResult = (scannedData: string) => {
    console.log("Putting QR data in search:", scannedData)
    onSearchChange(scannedData)
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>
      <QRScanner onScanResult={handleQRScanResult} />
    </div>
  )
}
