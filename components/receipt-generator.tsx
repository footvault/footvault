"use client"

import { useState, useEffect } from "react"
import jsPDF from "jspdf"
import { useCurrency } from "@/context/CurrencyContext"

interface ReceiptData {
  saleId: string
  userInfo: {
    username: string
    receiptAddress?: string
    receiptMoreInfo?: string
    receiptHeaderType?: 'username' | 'logo'
    receiptLogoUrl?: string
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
  const { currency } = useCurrency()

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

  useEffect(() => {
    if (receiptData) {
      generatePDF(receiptData)
    }
  }, [receiptData])

  const generatePDF = (data: ReceiptData) => {
    if (!data) return
    
    try {
      // Constants for document formatting
      const pageWidth = 80
      const margin = 4
      const contentWidth = pageWidth - (margin * 2)
      const lineHeight = 4.5
      
      // Helper function to calculate content height
      const calculateHeight = () => {
        let calculatedY = 8 // Starting Y position
        
        // Create a temporary document just for measuring
        const tempDoc = new jsPDF({
          unit: 'mm',
          format: [80, 500], // Large temporary height for measurement
          orientation: 'portrait'
        })
        tempDoc.setFont('helvetica', 'normal')
        
        // Measure all content sections
        // Store header (logo or name)
        if (data.userInfo.receiptHeaderType === 'logo' && data.userInfo.receiptLogoUrl) {
          // Logo height calculation
          calculatedY += 24 + 8 + 2 // Updated: Logo height (24mm) + spacing after (8mm) + spacing before (2mm)
        } else {
          // Username height calculation
          tempDoc.setFontSize(14)
          tempDoc.setFont('helvetica', 'bolditalic')
          const storeNameText = data.userInfo.username.toUpperCase()
          const storeNameLinesHeight = tempDoc.splitTextToSize(storeNameText, contentWidth)
          calculatedY += (storeNameLinesHeight.length * 5) + 2
        }
        
        // Store address
        if (data.userInfo.receiptAddress) {
          tempDoc.setFontSize(10)
          tempDoc.setFont('helvetica', 'normal')
          const addressLines = tempDoc.splitTextToSize(data.userInfo.receiptAddress, contentWidth)
          calculatedY += (addressLines.length * lineHeight) + 2
        }
        
        // Notice section
        calculatedY += (lineHeight * 2) + 6 // Two notice lines + spacing
        
        // Invoice box
        calculatedY += 14
        
        // Items header
        calculatedY += lineHeight + 1 + 5 // Header + separator spacing
        
        // Items content
        data.saleInfo.items.forEach(item => {
          const itemNameText = `${item.name}`
          const sizeText = item.size ? `Size: ${item.size}` : ''
          const fullItemText = sizeText ? `${itemNameText}\n${sizeText}` : itemNameText
          const wrappedLines = tempDoc.splitTextToSize(fullItemText, contentWidth * 0.48)
          calculatedY += (wrappedLines.length * lineHeight) + 3 // Item spacing
        })
        
        // Items separator
        calculatedY += 5 + 6 // Before and after separator
        
        // Totals section (5 lines: items, discount, additional, total, separator)
        calculatedY += (lineHeight * 4) + 3 + 5 // Totals + spacing + separator
        
        // Payment section (2 lines)
        calculatedY += (lineHeight * 2) + 5 // Payment info + spacing
        
        // More info section
        if (data.userInfo.receiptMoreInfo) {
          const moreInfoLines = data.userInfo.receiptMoreInfo.split('\n')
          let infoHeight = 0
          moreInfoLines.forEach(line => {
            if (line.trim()) {
              const wrappedLines = tempDoc.splitTextToSize(line.trim(), contentWidth - 4)
              infoHeight += wrappedLines.length * lineHeight
            } else {
              infoHeight += lineHeight / 2
            }
          })
          calculatedY += 5 + infoHeight + 4 // Separator + content + spacing
        }
        
        // Footer
        calculatedY += 5 + lineHeight + 2 + lineHeight + 5 // Footer spacing and text
        
        // Add bottom margin
        return calculatedY + 10
      }
      
      // Calculate the exact height needed
      const finalHeight = calculateHeight()
      
      // Create the actual PDF with the calculated height
      const doc = new jsPDF({
        unit: 'mm',
        format: [80, Math.max(finalHeight, 80)], // Minimum 80mm height
        orientation: 'portrait'
      })

      // Currency formatting helper - just numbers now
      const formatAmount = (amount: number) => {
        return amount.toLocaleString('en-US', { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 2 
        })
      }

      // Set default font to Helvetica
      doc.setFont('helvetica', 'normal')
      
      let y = 8 // Starting Y position
      
      // Helper function to check if we need more space (simplified for single page)
      const checkPageBreak = (neededSpace: number) => {
        // Just ensure we have enough space - let the page extend naturally
        return true
      }
      
      // Store header (logo or name)
      checkPageBreak(8)
      
      if (data.userInfo.receiptHeaderType === 'logo' && data.userInfo.receiptLogoUrl) {
        // Try to add logo
        try {
          const logoHeight = 24 // same as width for better proportion
          const logoWidth = 24  // Smaller width: 36mm (3:1 ratio)
          const logoX = (pageWidth - logoWidth) / 2 // Center horizontally
          
          // Add some space before logo
          y += 2
          
          // Add logo image (this will only work if the image is accessible)
          doc.addImage(data.userInfo.receiptLogoUrl, 'JPEG', logoX, y, logoWidth, logoHeight)
          y += logoHeight + 8 // More spacing after logo: 8mm (increased from 5mm)
        } catch (error) {
          // If logo fails to load, fallback to username
          console.warn('Failed to load receipt logo, falling back to username:', error)
          doc.setFontSize(14)
          doc.setFont('helvetica', 'bolditalic')
          const storeName = data.userInfo.username.toUpperCase()
          
          y += 2 // Space before username fallback
          const storeNameLines = doc.splitTextToSize(storeName, contentWidth)
          storeNameLines.forEach((line: string, index: number) => {
            const lineWidth = doc.getTextWidth(line)
            doc.text(line, (pageWidth - lineWidth) / 2, y)
            
            // Underline each line
            const underlineY = y + 0.5
            doc.line((pageWidth - lineWidth) / 2, underlineY, (pageWidth + lineWidth) / 2, underlineY)
            y += 5
          })
          y += 2 // Extra space after store name
        }
      } else {
        // Use username (default)
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bolditalic')
        const storeName = data.userInfo.username.toUpperCase()
        
        y += 2 // Space before username
        // Wrap store name if too long
        const storeNameLines = doc.splitTextToSize(storeName, contentWidth)
        storeNameLines.forEach((line: string, index: number) => {
          const lineWidth = doc.getTextWidth(line)
          doc.text(line, (pageWidth - lineWidth) / 2, y)
          
          // Underline each line
          const underlineY = y + 0.5
          doc.line((pageWidth - lineWidth) / 2, underlineY, (pageWidth + lineWidth) / 2, underlineY)
          y += 5
        })
        y += 2 // Extra space after store name
      }
      
      // Store address (centered)
      if (data.userInfo.receiptAddress) {
        checkPageBreak(8)
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        const addressLines = doc.splitTextToSize(data.userInfo.receiptAddress, contentWidth)
        addressLines.forEach((line: string) => {
          const lineWidth = doc.getTextWidth(line)
          doc.text(line, (pageWidth - lineWidth) / 2, y)
          y += lineHeight
        })
        y += 2
      }
      
      // Notice (centered, bold)
      checkPageBreak(8)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      
      const notice1 = "ALL SALES ARE FINAL"
      let noticeWidth = doc.getTextWidth(notice1)
      doc.text(notice1, (pageWidth - noticeWidth) / 2, y)
      y += lineHeight
      
      const notice2 = "*ASK FOR OFFICIAL RECEIPT*"
      noticeWidth = doc.getTextWidth(notice2)
      doc.text(notice2, (pageWidth - noticeWidth) / 2, y)
      y += 6 // More space before invoice box
      
      // Invoice info box (black background)
      checkPageBreak(12)
      doc.setFillColor(0, 0, 0)
      doc.rect(margin, y - 2, contentWidth, 10, 'F')
      
      doc.setTextColor(255, 255, 255) // White text
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`INV#: ${data.saleInfo.invoiceNumber}`, margin + 1, y + 2)
      doc.text(`${data.saleInfo.date} | ${data.saleInfo.time}`, margin + 1, y + 6)
      
      doc.setTextColor(0, 0, 0) // Back to black text
      y += 14 // More space after invoice box
      
      // Items section
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      
      // Add a subtle header for the items section
      checkPageBreak(lineHeight)
      doc.setFont('helvetica', 'bold')
      doc.text('ITEM', margin, y)
      doc.text('PRICE', pageWidth - margin - doc.getTextWidth('PRICE'), y)
      y += lineHeight + 1 // Extra space after headers
      
      // Add a light separator line under headers
      doc.setLineWidth(0.1)
      doc.line(margin, y, pageWidth - margin, y)
      y += 5 // More space after separator line
      
      // Helper for drawing each item in 50/50 layout
      const drawItemRow = (name: string, size: string, price: number) => {
        const leftColWidth = contentWidth * 0.48 // Slightly less than 50% for safety
        const rightColStart = margin + leftColWidth + 3 // 3mm gap

        // Format item name with size prominently displayed
        const itemNameText = `${name}`
        const sizeText = size ? `Size: ${size}` : '' // This will show the full size like "7 US"
        const fullItemText = sizeText ? `${itemNameText}\n${sizeText}` : itemNameText
        
        // Set font for items
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)
        
        // Force text to wrap strictly within left column
        const wrappedNameLines = doc.splitTextToSize(fullItemText, leftColWidth)

        // Format price
        const priceText = formatAmount(price)

        // Draw each line of item name - strictly within left column
        wrappedNameLines.forEach((line: string, idx: number) => {
          checkPageBreak(lineHeight)
          
          // Ensure line doesn't exceed left column width
          let displayLine = line
          while (doc.getTextWidth(displayLine) > leftColWidth && displayLine.length > 0) {
            displayLine = displayLine.slice(0, -1)
          }
          
          doc.text(displayLine, margin, y)

          // Only print price aligned with the first line
          if (idx === 0) {
            const priceWidth = doc.getTextWidth(priceText)
            doc.text(priceText, pageWidth - margin - priceWidth, y)
          }
          y += lineHeight
        })

        y += 3 // More spacing between items
      }

      // Loop through all items
      data.saleInfo.items.forEach(item => {
        drawItemRow(item.name, item.size, item.price)
      })
      
      y += 5 // More space before separator
      
      // Separator line
      checkPageBreak(2)
      doc.setLineWidth(0.2)
      doc.line(margin, y, pageWidth - margin, y)
      y += 6 // More space after separator
      
      // Helper function for total lines (right-aligned values)
      const addTotalLine = (label: string, value: string, isBold: boolean = false) => {
        checkPageBreak(lineHeight)
        doc.setFont('helvetica', isBold ? 'bold' : 'normal')
        doc.setFontSize(10)
        
        doc.text(label, margin, y)
        const valueWidth = doc.getTextWidth(value)
        doc.text(value, pageWidth - margin - valueWidth, y)
        y += lineHeight
      }
      
      // Item count
      const itemCount = data.saleInfo.items.reduce((sum, item) => sum + item.quantity, 0)
      addTotalLine('Item(s)', itemCount.toString())
      
      // Always show discount (even if 0)
      const discountAmount = data.saleInfo.discount || 0
      addTotalLine('DISCOUNT', discountAmount > 0 ? `-${formatAmount(discountAmount)}` : '0.00')
      
      // Always show additional charge (even if 0)
      const additionalAmount = data.saleInfo.additionalCharge || 0
      addTotalLine('ADDITIONAL CHARGE', formatAmount(additionalAmount))
      
      // Total line
      addTotalLine('TOTAL', formatAmount(data.saleInfo.total), true)
      y += 3 // More space before separator
      
      // Separator line
      checkPageBreak(2)
      doc.line(margin, y, pageWidth - margin, y)
      y += 5 // More space after separator
      
      // Payment section
      const displayPaymentReceived = data.saleInfo.paymentReceived === 0 ? data.saleInfo.total : data.saleInfo.paymentReceived
      addTotalLine('PAYMENT RECEIVED', formatAmount(displayPaymentReceived))
      addTotalLine('CHANGE AMOUNT', formatAmount(data.saleInfo.changeAmount))
      y += 5 // More space before more info section
      
      // More info section
      if (data.userInfo.receiptMoreInfo) {
        checkPageBreak(8)
        doc.line(margin, y, pageWidth - margin, y)
        y += 5 // More space before more info
        
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        const moreInfoLines = data.userInfo.receiptMoreInfo.split('\n')
        
        moreInfoLines.forEach((line) => {
          if (line.trim()) {
            const wrappedLines = doc.splitTextToSize(line.trim(), contentWidth - 4) // Slightly smaller for better centering
            wrappedLines.forEach((wrappedLine: string) => {
              checkPageBreak(lineHeight)
              const lineWidth = doc.getTextWidth(wrappedLine)
              doc.text(wrappedLine, (pageWidth - lineWidth) / 2, y) // Centered
              y += lineHeight
            })
          } else {
            y += lineHeight / 2
          }
        })
        y += 4 // More space after more info
      }
      
      // Footer
      checkPageBreak(8)
      doc.line(margin, y, pageWidth - margin, y)
      y += 5 // More space before footer
      
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      
      const footer1 = "Acknowledgement Receipt"
      let footerWidth = doc.getTextWidth(footer1)
      doc.text(footer1, (pageWidth - footerWidth) / 2, y)
      y += lineHeight + 2
      
      const footer2 = "Thank you!"
      footerWidth = doc.getTextWidth(footer2)
      doc.text(footer2, (pageWidth - footerWidth) / 2, y)
      
      // Open PDF in new browser tab (with Next.js safety check)
      if (typeof window !== "undefined") {
        const pdfBlob = doc.output('blob')
        const pdfUrl = URL.createObjectURL(pdfBlob)
        window.open(pdfUrl, '_blank')
        
        // Clean up the URL after a delay to prevent memory leaks
        setTimeout(() => {
          URL.revokeObjectURL(pdfUrl)
        }, 1000)
      }
      
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
