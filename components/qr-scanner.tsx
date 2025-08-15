"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { QrCode, X } from "lucide-react"
import { Scanner } from "@yudiel/react-qr-scanner"

interface QRScannerProps {
  onScanResult: (data: string) => void
}

export default function QRScannerComponent({ onScanResult }: QRScannerProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleScan = (detectedCodes: any[]) => {
    if (detectedCodes && detectedCodes.length > 0) {
      const qrCode = detectedCodes[0]
      console.log("✅ QR Code detected:", qrCode.rawValue)
      onScanResult(qrCode.rawValue)
      handleClose()
    }
  }

  const handleError = (error: unknown) => {
    console.error("❌ QR Scanner error:", error)
  }

  const handleOpen = () => {
    setIsOpen(true)
  }

  const handleClose = () => {
    setIsOpen(false)
  }

  return (
    <>
      <Button variant="outline" size="icon" onClick={handleOpen}>
        <QrCode className="h-4 w-4" />
      </Button>

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Scan QR Code</h2>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="relative">
            {isOpen && (
              <Scanner
                onScan={handleScan}
                onError={handleError}
                constraints={{
                  facingMode: "environment",
                  width: { ideal: 1280, min: 640 },
                  height: { ideal: 720, min: 480 },
                }}
                formats={['qr_code']}
                styles={{
                  container: {
                    width: "100%",
                    height: "256px",
                    borderRadius: "0.5rem",
                    overflow: "hidden",
                  },
                  video: {
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  },
                }}
                components={{
                  finder: false,
                }}
                scanDelay={500}
                allowMultiple={false}
              />
            )}
            
            {/* Scanning overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-40 h-40 border-2 border-white rounded-lg">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-green-400"></div>
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-green-400"></div>
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-green-400"></div>
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-green-400"></div>
              </div>
            </div>
          </div>

          <p className="text-center text-sm text-gray-600 mt-2">
            Point your camera at a QR code
          </p>
        </DialogContent>
      </Dialog>
    </>
  )
}
