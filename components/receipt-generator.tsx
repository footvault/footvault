"use client"

import { useState, useEffect } from "react"
import jsPDF from "jspdf"

interface ReceiptData {
  saleId: string
  userInfo: {
    username: string
    receiptAddress?: string
    receiptMoreInfo?: string
  }
  saleInfo: {
    invoiceNumber: number
    date: string
    time: string
    items: Array<{
      name: string
      size: string
      price: number
      quantity: number
    }>
    subtotal: number
    discount: number
    additionalCharge: number
    total: number
    paymentReceived: number
    changeAmount: number
    paymentType: string
  }
}

interface ReceiptGeneratorProps {
  saleId?: string
  onComplete?: () => void
  onError?: (error: string) => void
}

export function ReceiptGenerator({ saleId, onComplete, onError }: ReceiptGeneratorProps) {
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null)

  const fetchReceiptData = async () => {
    if (!saleId) return
    
    try {
      // Get the authentication token
      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch(`/api/receipt/${saleId}`, {
        headers: {
          Authorization: `Bearer ${session?.access_token || ""}`,
        }
      })
      const result = await response.json()
      
      if (result.success) {
        setReceiptData(result.data)
        // Auto-generate PDF once data is loaded
        generatePDF(result.data)
      } else {
        onError?.(result.error || "Failed to fetch receipt data")
      }
    } catch (err) {
      onError?.("Failed to fetch receipt data")
      console.error("Receipt fetch error:", err)
    }
  }

  useEffect(() => {
    if (saleId) {
      fetchReceiptData()
    }
  }, [saleId])

  const generatePDF = (data: ReceiptData) => {
    if (!data) return
    
    try {
      // Create PDF with thermal paper dimensions (80mm wide)
      // 80mm = 226.77 points, but we'll use a more standard width
      const doc = new jsPDF({
        unit: 'mm',
        format: [80, 200], // 80mm wide, 200mm tall (will auto-extend)
        orientation: 'portrait'
      })

      // Set font
      doc.setFont('courier', 'normal')
      
      let y = 10 // Starting Y position
      const pageWidth = 80
      const margin = 5
      const contentWidth = pageWidth - (margin * 2)
      
      // Store name (centered, bold)
      doc.setFontSize(14)
      doc.setFont('courier', 'bold')
      const storeName = data.userInfo.username.toUpperCase()
      const storeNameWidth = doc.getTextWidth(storeName)
      doc.text(storeName, (pageWidth - storeNameWidth) / 2, y)
      
      // Underline the store name
      const underlineY = y + 1
      doc.line((pageWidth - storeNameWidth) / 2, underlineY, (pageWidth + storeNameWidth) / 2, underlineY)
      y += 8
      
      // Store address (centered)
      if (data.userInfo.receiptAddress) {
        doc.setFontSize(9)
        doc.setFont('courier', 'normal')
        const addressLines = doc.splitTextToSize(data.userInfo.receiptAddress, contentWidth)
        addressLines.forEach((line: string) => {
          const lineWidth = doc.getTextWidth(line)
          doc.text(line, (pageWidth - lineWidth) / 2, y)
          y += 4
        })
      }
      y += 3
      
      // Notice (centered, bold)
      doc.setFontSize(10)
      doc.setFont('courier', 'bold')
      const notice1 = "ALL SALES ARE FINAL"
      const notice2 = "*ASK FOR OFFICIAL RECEIPT*"
      
      let noticeWidth = doc.getTextWidth(notice1)
      doc.text(notice1, (pageWidth - noticeWidth) / 2, y)
      y += 4
      
      noticeWidth = doc.getTextWidth(notice2)
      doc.text(notice2, (pageWidth - noticeWidth) / 2, y)
      y += 8
      
      // Invoice info box (black background effect with border)
      doc.setFillColor(0, 0, 0) // Black background
      doc.rect(margin, y - 3, contentWidth, 12, 'F')
      
      doc.setTextColor(255, 255, 255) // White text
      doc.setFontSize(9)
      doc.text(`INV#: ${data.saleInfo.invoiceNumber}`, margin + 2, y + 2)
      doc.text(`${data.saleInfo.date} | ${data.saleInfo.time}`, margin + 2, y + 7)
      
      doc.setTextColor(0, 0, 0) // Back to black text
      y += 15
      
      // Items
      doc.setFont('courier', 'normal')
      doc.setFontSize(9)
      
      data.saleInfo.items.forEach((item) => {
        // Item name and size
        const itemText = `${item.name} (${item.size})`
        const itemLines = doc.splitTextToSize(itemText, contentWidth)
        
        itemLines.forEach((line: string) => {
          doc.setFont('courier', 'bold')
          doc.text(line, margin, y)
          y += 4
        })
        
        // Price (right aligned)
        doc.setFont('courier', 'normal')
        const priceText = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'PHP'
        }).format(item.price)
        const priceWidth = doc.getTextWidth(priceText)
        doc.text(priceText, pageWidth - margin - priceWidth, y)
        y += 4
        
        // Separator line
        doc.line(margin, y, pageWidth - margin, y)
        y += 3
      })
      
      y += 3
      
      // Totals section
      const addTotalLine = (label: string, amount: number, isBold: boolean = false) => {
        if (isBold) {
          doc.setFont('courier', 'bold')
        } else {
          doc.setFont('courier', 'normal')
        }
        
        const amountText = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'PHP'
        }).format(amount)
        
        doc.text(label, margin, y)
        const amountWidth = doc.getTextWidth(amountText)
        doc.text(amountText, pageWidth - margin - amountWidth, y)
        y += 4
      }
      
      addTotalLine(`Item(s)`, data.saleInfo.items.reduce((sum, item) => sum + item.quantity, 0))
      
      if (data.saleInfo.discount > 0) {
        addTotalLine("DISCOUNT", -data.saleInfo.discount)
      }
      
      if (data.saleInfo.additionalCharge > 0) {
        addTotalLine("ADDITIONAL CHARGE", data.saleInfo.additionalCharge)
      }
      
      // Total line with border
      doc.line(margin, y, pageWidth - margin, y)
      y += 1
      addTotalLine("TOTAL", data.saleInfo.total, true)
      y += 3
      
      // Payment section with border
      doc.line(margin, y, pageWidth - margin, y)
      y += 3
      
      addTotalLine("PAYMENT RECEIVED", data.saleInfo.paymentReceived)
      addTotalLine("CHANGE AMOUNT", data.saleInfo.changeAmount)
      y += 5
      
      // More info section
      if (data.userInfo.receiptMoreInfo) {
        doc.line(margin, y, pageWidth - margin, y)
        y += 3
        
        doc.setFontSize(8)
        doc.setFont('courier', 'normal')
        const moreInfoLines = data.userInfo.receiptMoreInfo.split('\n')
        
        moreInfoLines.forEach((line) => {
          if (line.trim()) {
            const wrappedLines = doc.splitTextToSize(line.trim(), contentWidth)
            wrappedLines.forEach((wrappedLine: string) => {
              doc.text(wrappedLine, margin, y)
              y += 3.5
            })
          } else {
            y += 2
          }
        })
        y += 3
      }
      
      // Footer
      doc.line(margin, y, pageWidth - margin, y)
      y += 4
      
      doc.setFontSize(9)
      doc.setFont('courier', 'italic')
      const footer1 = "Acknowledgement Receipt"
      const footer2 = "Thank you!"
      
      let footerWidth = doc.getTextWidth(footer1)
      doc.text(footer1, (pageWidth - footerWidth) / 2, y)
      y += 4
      
      footerWidth = doc.getTextWidth(footer2)
      doc.text(footer2, (pageWidth - footerWidth) / 2, y)
      
      // Open PDF in new browser tab
      const pdfBlob = doc.output('blob')
      const pdfUrl = URL.createObjectURL(pdfBlob)
      window.open(pdfUrl, '_blank')
      
      // Call completion callback
      onComplete?.()
    } catch (err) {
      onError?.("Failed to generate PDF")
      console.error("PDF generation error:", err)
    }
  }

  // This component doesn't render anything visible
  return null
}
