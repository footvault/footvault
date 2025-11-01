"use client"

import { useState, useEffect } from "react"
import jsPDF from "jspdf"
import { useCurrency } from "@/context/CurrencyContext"

interface ShippingLabelData {
  saleId: string
  userInfo: {
    username: string
    businessName?: string
    businessAddress?: string
    businessPhone?: string
  }
  shippingInfo: {
    customerName: string
    address: string
    city: string
    state: string
    zipCode: string
    country: string
    phone?: string
    email?: string
    notes?: string
  }
  saleInfo: {
    invoiceNumber: string
    date: string
    items: Array<{
      productName: string
      brand: string
      size: string
      serialNumber?: string
    }>
  }
}

interface ShippingLabelGeneratorProps {
  saleId?: string
  onComplete?: () => void
  onError?: (error: string) => void
}

export function ShippingLabelGenerator({ saleId, onComplete, onError }: ShippingLabelGeneratorProps) {
  const [labelData, setLabelData] = useState<ShippingLabelData | null>(null)
  const { currency } = useCurrency()

  // Fetch shipping label data
  const fetchShippingLabelData = async () => {
    if (!saleId) {
      console.error("No sale ID provided")
      onError?.("No sale ID provided")
      return
    }

    try {
      console.log("Fetching shipping label data for sale:", saleId)
      
      const response = await fetch(`/api/shipping-label-data?saleId=${saleId}`)
      const result = await response.json()
      
      console.log("Shipping label data response:", result)
      
      if (result.success && result.data) {
        setLabelData(result.data)
        generateShippingLabel(result.data)
      } else {
        throw new Error(result.error || "Failed to fetch shipping label data")
      }
    } catch (error) {
      console.error("Error fetching shipping label data:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      onError?.(errorMessage)
    }
  }

  // Generate shipping label PDF
  const generateShippingLabel = (data: ShippingLabelData) => {
    try {
      console.log("Generating shipping label PDF...")
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      // Set up fonts and styles
      pdf.setFont('helvetica')
      
      let yPosition = 20
      const leftMargin = 20
      const rightMargin = 20
      const pageWidth = pdf.internal.pageSize.getWidth()
      const contentWidth = pageWidth - leftMargin - rightMargin

      // Header - Business Information
      pdf.setFontSize(18)
      pdf.setFont('helvetica', 'bold')
      pdf.text(data.userInfo.businessName || data.userInfo.username, leftMargin, yPosition)
      yPosition += 10

      if (data.userInfo.businessAddress) {
        pdf.setFontSize(10)
        pdf.setFont('helvetica', 'normal')
        pdf.text(data.userInfo.businessAddress, leftMargin, yPosition)
        yPosition += 7
      }

      if (data.userInfo.businessPhone) {
        pdf.text(`Phone: ${data.userInfo.businessPhone}`, leftMargin, yPosition)
        yPosition += 7
      }

      yPosition += 10

      // Title
      pdf.setFontSize(16)
      pdf.setFont('helvetica', 'bold')
      pdf.text('SHIPPING LABEL', leftMargin, yPosition)
      yPosition += 15

      // Sale Information
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Order Information:', leftMargin, yPosition)
      yPosition += 8

      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      pdf.text(`Order #: ${data.saleInfo.invoiceNumber}`, leftMargin, yPosition)
      yPosition += 6
      pdf.text(`Date: ${data.saleInfo.date}`, leftMargin, yPosition)
      yPosition += 15

      // Shipping Address Section
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Ship To:', leftMargin, yPosition)
      yPosition += 8

      // Draw border around shipping address
      const addressStartY = yPosition
      pdf.setFontSize(11)
      pdf.setFont('helvetica', 'bold')
      pdf.text(data.shippingInfo.customerName, leftMargin + 5, yPosition)
      yPosition += 8

      pdf.setFont('helvetica', 'normal')
      pdf.text(data.shippingInfo.address, leftMargin + 5, yPosition)
      yPosition += 6
      
      const cityStateZip = `${data.shippingInfo.city}, ${data.shippingInfo.state} ${data.shippingInfo.zipCode}`
      pdf.text(cityStateZip, leftMargin + 5, yPosition)
      yPosition += 6
      
      pdf.text(data.shippingInfo.country, leftMargin + 5, yPosition)
      yPosition += 6

      if (data.shippingInfo.phone) {
        pdf.text(`Phone: ${data.shippingInfo.phone}`, leftMargin + 5, yPosition)
        yPosition += 6
      }

      if (data.shippingInfo.email) {
        pdf.text(`Email: ${data.shippingInfo.email}`, leftMargin + 5, yPosition)
        yPosition += 6
      }

      // Draw border around address
      const addressHeight = yPosition - addressStartY + 5
      pdf.rect(leftMargin, addressStartY - 5, contentWidth, addressHeight)

      yPosition += 15

      // Items Section
      pdf.setFontSize(12)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Items:', leftMargin, yPosition)
      yPosition += 10

      // Items table header
      pdf.setFontSize(9)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Product', leftMargin, yPosition)
      pdf.text('Brand', leftMargin + 60, yPosition)
      pdf.text('Size', leftMargin + 110, yPosition)
      pdf.text('Serial #', leftMargin + 140, yPosition)
      yPosition += 3

      // Draw line under header
      pdf.line(leftMargin, yPosition, leftMargin + contentWidth, yPosition)
      yPosition += 8

      // Items
      pdf.setFont('helvetica', 'normal')
      data.saleInfo.items.forEach((item, index) => {
        if (yPosition > 250) { // Check if we need a new page
          pdf.addPage()
          yPosition = 20
        }

        pdf.text(item.productName.length > 25 ? item.productName.substring(0, 25) + '...' : item.productName, leftMargin, yPosition)
        pdf.text(item.brand || '', leftMargin + 60, yPosition)
        pdf.text(item.size || '', leftMargin + 110, yPosition)
        pdf.text(item.serialNumber || 'N/A', leftMargin + 140, yPosition)
        yPosition += 6
      })

      yPosition += 10

      // Special Instructions
      if (data.shippingInfo.notes && data.shippingInfo.notes.trim()) {
        pdf.setFontSize(12)
        pdf.setFont('helvetica', 'bold')
        pdf.text('Special Instructions:', leftMargin, yPosition)
        yPosition += 8

        pdf.setFontSize(10)
        pdf.setFont('helvetica', 'normal')
        const notes = data.shippingInfo.notes.trim()
        const noteLines = pdf.splitTextToSize(notes, contentWidth)
        pdf.text(noteLines, leftMargin, yPosition)
        yPosition += (noteLines.length * 6) + 10
      }

      // Footer
      yPosition = Math.max(yPosition, 250)
      pdf.setFontSize(8)
      pdf.setFont('helvetica', 'normal')
      pdf.text(`Generated on ${new Date().toLocaleString()}`, leftMargin, yPosition)

      // Save and download the PDF
      const fileName = `shipping-label-${data.saleInfo.invoiceNumber}.pdf`
      pdf.save(fileName)
      
      console.log("Shipping label generated successfully:", fileName)
      onComplete?.()
      
    } catch (error) {
      console.error("Error generating shipping label:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      onError?.(errorMessage)
    }
  }

  // Start the process when component mounts and saleId is available
  useEffect(() => {
    if (saleId) {
      fetchShippingLabelData()
    }
  }, [saleId])

  // This component doesn't render anything visible
  return null
}