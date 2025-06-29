"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Download, Printer, Copy, QrCode } from "lucide-react"
import React, { useRef, useState } from "react"
import { useQRCode } from 'next-qrcode';

interface QRCodeModalProps {
  shoe: any
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedVariants?: any[] // Add this prop
}

export function QRCodeModal({ shoe, open, onOpenChange, selectedVariants = [] }: QRCodeModalProps) {
  const qrRef = useRef<HTMLDivElement>(null)
  const [isPrinting, setIsPrinting] = useState(false)
  const [activeTab, setActiveTab] = useState("product")
  const { Canvas } = useQRCode();

  if (!shoe && selectedVariants.length === 0) return null

  const generateQRData = (type: "product" | "variant") => {
    if (type === "product") {
      return shoe.sku || `${shoe.brand}-${shoe.name}-${shoe.id}`;
    } else if (shoe.selectedVariant) {
      return shoe.selectedVariant.serialNumber || shoe.selectedVariant.variantSku || `${shoe.selectedVariant.id}`;
    }
    return ""
  }

  const generateVariantQRData = (variant: any) => {
    return variant.serialNumber || variant.variantSku || `${variant.id}`;
  }

  const printQR = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setTimeout(() => setIsPrinting(false), 500);
    }, 100);
  }

  const copyQRData = (data: string) => {
    navigator.clipboard.writeText(data)
  }

  // Replace QRCodeDisplay with real QR code
  const QRCodeDisplay = ({ data, size = 200 }: { data: string; size?: number }) => (
    <div
      className="border-2 border-gray-300 flex items-center justify-center bg-white"
      style={{ width: size, height: size }}
    >
      <Canvas text={data} options={{ width: size, margin: 2 }} />
    </div>
  )

  // Render a grid of QR codes for selected variants
  const QRVariantGrid = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
      {selectedVariants.map((variant, idx) => (
        <div key={variant.id || idx} className="flex flex-col items-center border rounded-lg p-3 bg-white print:break-inside-avoid">
          <Canvas text={generateVariantQRData(variant)} options={{ width: 120, margin: 2 }} />
          <div className="mt-2 text-center">
            <div className="font-bold text-xs">{variant.productName}</div>
            <div className="text-xs text-gray-600">{variant.brand}</div>
            <div className="text-xs font-mono">{variant.variantSku}</div>
            <div className="text-xs">Size {variant.size} ({variant.sizeLabel})</div>
            <div className="text-xs">Serial: {variant.serialNumber}</div>
            <div className="text-xs">Location: {variant.location}</div>
            <div className="text-xs font-bold text-green-600">${variant.price}</div>
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[90vw] max-h-[90vh] overflow-y-auto sm:max-w-lg md:max-w-xl lg:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              QR Code Generator - {shoe.name}
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="product">Product QR</TabsTrigger>
              <TabsTrigger value="variant" disabled={!shoe.selectedVariant && selectedVariants.length === 0}>
                {selectedVariants.length > 0 ? `Selected Variants (${selectedVariants.length})` : 
                 shoe.selectedVariant ? `Individual Shoe (${shoe.selectedVariant.variantSku})` : 'Individual Shoe QR'}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="product" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Product QR Code</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center space-y-4">
                    <QRCodeDisplay data={generateQRData("product")} />
                    <div className="product-info space-y-2">
                      <h3 className="font-bold text-lg">{shoe.name}</h3>
                      <p className="text-gray-600">{shoe.brand}</p>
                      <p className="font-mono text-sm">{shoe.sku}</p>
                      <p className="text-lg font-bold text-green-600">${shoe.salePrice}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button onClick={() => copyQRData(generateQRData("product"))} variant="outline" className="flex-1">
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Data
                    </Button>
                    <Button onClick={printQR} variant="outline" className="flex-1">
                      <Printer className="h-4 w-4 mr-2" />
                      Print
                    </Button>
                    <Button variant="outline" className="flex-1">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="variant" className="space-y-4">
              {selectedVariants.length > 0 ? (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>Selected Variants QR Codes ({selectedVariants.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <QRVariantGrid />
                    </CardContent>
                  </Card>
                  <div className="flex gap-2 mt-4">
                    <Button onClick={printQR} variant="outline" className="flex-1">
                      <Printer className="h-4 w-4 mr-2" />
                      Print All
                    </Button>
                  </div>
                </>
              ) : shoe.selectedVariant && (
                <Card>
                  <CardHeader>
                    <CardTitle>Individual Shoe QR Code</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center space-y-4">
                      <QRCodeDisplay data={generateQRData("variant")} />

                      <div className="space-y-2">
                        <h3 className="font-bold text-lg">{shoe.name}</h3>
                        <p className="text-gray-600">{shoe.brand}</p>
                        <div className="variant-info bg-gray-100 p-4 rounded-lg">
                          <p className="font-bold">
                            Size {shoe.selectedVariant.size} ({shoe.selectedVariant.sizeLabel})
                          </p>
                          <p className="font-mono text-sm">{shoe.selectedVariant.variantSku}</p>
                          <p className="text-sm">Serial: {shoe.selectedVariant.serialNumber}</p>
                          <p className="text-sm">Location: {shoe.selectedVariant.location}</p>
                          <p className="text-sm">Status: {shoe.selectedVariant.status}</p>
                          <p className="text-sm">Added: {shoe.selectedVariant.dateAdded}</p>
                        </div>
                        <p className="text-lg font-bold text-green-600">${shoe.salePrice}</p>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Button onClick={() => copyQRData(generateQRData("variant"))} variant="outline" className="flex-1">
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Data
                      </Button>
                      <Button onClick={printQR} variant="outline" className="flex-1">
                        <Printer className="h-4 w-4 mr-2" />
                        Print
                      </Button>
                      <Button variant="outline" className="flex-1">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Print Layout */}
      {isPrinting && (
        <>
          <style jsx global>{`
            @media print {
              body * {
                visibility: hidden;
              }
              .print-content, .print-content * {
                visibility: visible;
              }
              .print-content {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                background: white;
                padding: 20px;
                box-sizing: border-box;
              }
              .print-single {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 400px;
                page-break-inside: avoid;
                margin: 0 auto;
                max-width: 400px;
              }
              .print-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 20px;
                width: 100%;
              }
              .print-grid-item {
                display: flex;
                flex-direction: column;
                align-items: center;
                border: 1px solid #ccc;
                padding: 15px;
                border-radius: 8px;
                page-break-inside: avoid;
                background: white;
              }
              .print-qr {
                margin-bottom: 15px;
              }
              .print-info {
                text-align: center;
                font-family: Arial, sans-serif;
              }
              .print-info h3 {
                font-size: 16px;
                font-weight: bold;
                margin: 0 0 8px 0;
              }
              .print-info p {
                margin: 4px 0;
                font-size: 14px;
              }
              .print-info .brand {
                color: #666;
              }
              .print-info .sku {
                font-family: monospace;
                font-size: 12px;
              }
              .print-info .price {
                font-weight: bold;
                color: #16a34a;
                font-size: 16px;
              }
              .print-info .variant-details {
                font-size: 12px;
                margin-top: 8px;
              }
            }
          `}</style>
          <div className="print-content">
            {activeTab === "product" ? (
              <div className="print-single">
                <div className="print-qr">
                  <Canvas text={generateQRData("product")} options={{ width: 200, margin: 2 }} />
                </div>
                <div className="print-info">
                  <h3>{shoe.name}</h3>
                  <p className="brand">{shoe.brand}</p>
                  <p className="sku">{shoe.sku}</p>
                  <p className="price">${shoe.salePrice}</p>
                </div>
              </div>
            ) : selectedVariants.length > 0 ? (
              <div className="print-grid">
                {selectedVariants.map((variant, idx) => (
                  <div key={variant.id || idx} className="print-grid-item">
                    <div className="print-qr">
                      <Canvas text={generateVariantQRData(variant)} options={{ width: 120, margin: 2 }} />
                    </div>
                    <div className="print-info">
                      <h3>{variant.productName}</h3>
                      <p className="brand">{variant.brand}</p>
                      <p className="sku">{variant.variantSku}</p>
                      <div className="variant-details">
                        <p>Size {variant.size} ({variant.sizeLabel})</p>
                        <p>Serial: {variant.serialNumber}</p>
                        <p>Location: {variant.location}</p>
                      </div>
                      <p className="price">${variant.price}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : shoe.selectedVariant && (
              <div className="print-single">
                <div className="print-qr">
                  <Canvas text={generateQRData("variant")} options={{ width: 200, margin: 2 }} />
                </div>
                <div className="print-info">
                  <h3>{shoe.name}</h3>
                  <p className="brand">{shoe.brand}</p>
                  <p className="sku">{shoe.selectedVariant.variantSku}</p>
                  <div className="variant-details">
                    <p>Size {shoe.selectedVariant.size} ({shoe.selectedVariant.sizeLabel})</p>
                    <p>Serial: {shoe.selectedVariant.serialNumber}</p>
                    <p>Location: {shoe.selectedVariant.location}</p>
                    <p>Status: {shoe.selectedVariant.status}</p>
                  </div>
                  <p className="price">${shoe.salePrice}</p>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </>
  )
}