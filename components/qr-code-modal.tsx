
// Force rebuild: QRCodeModal export is named, not default
"use client"

import React, { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Variant } from "@/lib/types"
import { Download, Printer } from "lucide-react"
import dynamic from "next/dynamic"
import { useTimezone } from "@/context/TimezoneContext"

interface QRCodeModalProps {
  open: boolean
  variant?: Variant
  onClose: () => void
}

export default function QRCodeModal({ open, variant, onClose }: QRCodeModalProps) {
  const { formatDateInTimezone } = useTimezone()
  const [pdfUrl, setPdfUrl] = useState<string>("")
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    if (variant && open) {
      generatePDF()
    }
  }, [variant, open])

  const generatePDF = async () => {
    if (!variant) return

    setGenerating(true)
    try {
      // Dynamic imports to avoid SSR issues
      const [QRCode, jsPDF] = await Promise.all([
        import('qrcode'),
        import('jspdf')
      ])

      // Create new PDF document
      const pdf = new jsPDF.default({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      // Set up the document
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      
      // Add border
      pdf.setLineWidth(1)
      pdf.rect(10, 10, pageWidth - 20, pageHeight - 20)

      // Company header
      pdf.setFontSize(16)
      pdf.setFont('helvetica', 'bold')
      pdf.text('SNEAKFITS', pageWidth / 2, 25, { align: 'center' })

      // Variant info section
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'normal')
      
      let yPos = 45
      const leftMargin = 20
      
      // Product details
      pdf.setFont('helvetica', 'bold')
      pdf.text('Product Information:', leftMargin, yPos)
      yPos += 10
      
      pdf.setFont('helvetica', 'normal')
      pdf.text(`SKU: ${(variant as any).product?.sku || 'N/A'}`, leftMargin, yPos)
      yPos += 8
      pdf.text(`Name: ${(variant as any).product?.name || 'N/A'}`, leftMargin, yPos)
      yPos += 8
      pdf.text(`Brand: ${(variant as any).product?.brand || 'N/A'}`, leftMargin, yPos)
      yPos += 8
      pdf.text(`Size: ${variant.size || 'N/A'}`, leftMargin, yPos)
      yPos += 8
      pdf.text(`Status: ${variant.status || 'Available'}`, leftMargin, yPos)
      yPos += 8
      pdf.text(`Cost Price: $${variant.cost_price?.toFixed(2) || '0.00'}`, leftMargin, yPos)
      yPos += 8
      pdf.text(`Sale Price: $${(variant as any).product?.sale_price?.toFixed(2) || '0.00'}`, leftMargin, yPos)
      yPos += 8
      pdf.text(`Serial Number: ${(variant as any).serial_number || variant.id}`, leftMargin, yPos)
      yPos += 8
      
      if ((variant as any).date_sold) {
        pdf.text(`Date Sold: ${formatDateInTimezone((variant as any).date_sold)}`, leftMargin, yPos)
        yPos += 8
      }
      
      pdf.text(`Date Added: ${formatDateInTimezone(variant.created_at)}`, leftMargin, yPos)
      yPos += 15

      // Generate QR Code
      const qrData = JSON.stringify({
        id: variant.id,
        serial: (variant as any).serial_number,
        sku: (variant as any).product?.sku,
        name: (variant as any).product?.name,
        brand: (variant as any).product?.brand,
        size: variant.size,
        status: variant.status,
      })

      // Create QR code as data URL
      const qrCodeDataUrl = await QRCode.default.toDataURL(qrData, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })

      // Add QR code to PDF
      const qrSize = 60 // mm
      const qrX = (pageWidth - qrSize) / 2
      pdf.addImage(qrCodeDataUrl, 'PNG', qrX, yPos, qrSize, qrSize)
      yPos += qrSize + 10

      // Add QR code label
      pdf.setFontSize(10)
      pdf.text('Scan QR Code for Product Details', pageWidth / 2, yPos, { align: 'center' })

      // Add large serial number at bottom
      yPos = pageHeight - 40
      pdf.setFontSize(24)
      pdf.setFont('helvetica', 'bold')
      const serialNumber = (variant as any).serial_number || variant.id.slice(-5)
      pdf.text(serialNumber, pageWidth / 2, yPos, { align: 'center' })

      // Convert PDF to blob URL for display
      const pdfBlob = pdf.output('blob')
      const url = URL.createObjectURL(pdfBlob)
      setPdfUrl(url)
      
    } catch (error) {
      console.error('Error generating PDF:', error)
    } finally {
      setGenerating(false)
    }
  }

  const handleDownload = () => {
    if (!pdfUrl || !variant) return

    const link = document.createElement('a')
    link.href = pdfUrl
    link.download = `variant-${(variant as any).serial_number || variant.id}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handlePrint = () => {
    if (!pdfUrl) return
    
    const printWindow = window.open(pdfUrl, '_blank')
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print()
      }
    }
  }

  if (!open || !variant) return null

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Product Label & QR Code</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {generating ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p>Generating PDF...</p>
              </div>
            </div>
          ) : pdfUrl ? (
            <div className="border rounded-lg overflow-hidden">
              <iframe
                src={pdfUrl}
                className="w-full h-96"
                title="Product Label PDF"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-96 text-muted-foreground">
              Failed to generate PDF
            </div>
          )}
        </div>
        
        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handlePrint} disabled={!pdfUrl}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button variant="outline" onClick={handleDownload} disabled={!pdfUrl}>
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
          <Button onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}