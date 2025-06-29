"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Printer, Download, QrCode } from "lucide-react"
import React, { useEffect, useRef, useState } from "react"
import { useQRCode } from 'next-qrcode';
import { useCurrency } from "@/context/CurrencyContext"
import { formatCurrency } from "@/lib/utils/currency"

interface PrintPreviewProps {
  selectedItems: number[]
  selectedVariants: string[]
  shoes: any[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PrintPreview({ selectedItems, selectedVariants, shoes, open, onOpenChange }: PrintPreviewProps) {
  const printRef = useRef<HTMLDivElement>(null)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const { Canvas } = useQRCode();
  const { currency } = useCurrency()

  // Add qrCanvases and qrDataUrls state
  const qrCanvases = useRef<{ [key: string]: HTMLCanvasElement | null }>({});
  const [qrDataUrls, setQrDataUrls] = useState<{ [key: string]: string }>({});

  const selectedShoes = shoes.filter((shoe) => selectedItems.includes(shoe.id))
  const selectedVariantObjects = shoes.flatMap((shoe) =>
    shoe.variants
      .filter((variant: any) => selectedVariants.includes(variant.id))
      .map((variant: any) => ({
        ...variant,
        productName: shoe.name,
        productBrand: shoe.brand,
        productPrice: shoe.salePrice,
      })),
  )

  const handlePrint = async (type: "products" | "variants") => {
    const items = type === "products" ? selectedShoes : selectedVariantObjects;

    // VSCode terminal debug: log all QR data URLs before printing
    console.log("[QR PRINT DEBUG] Data URLs:", qrDataUrls);
    console.log("[QR PRINT DEBUG] Items:", items);

    // Create print content with QR images from data URLs
    const printContent = document.createElement('div');
    printContent.innerHTML = `
      <div style="font-family: Arial, sans-serif; padding: 20px; background: white;">
        <h2 style="text-align: center; margin-bottom: 30px; color: #333; font-size: 24px;">
          QR Codes - ${type === "products" ? "Products" : "Individual Shoes"}
        </h2>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; max-width: 100%;">
          ${items.map((item, index) => {
            const key = type === "products" ? `product-${item.id}` : `variant-${item.id}`;
            const qrUrl = qrDataUrls[key] || '';
            return `
              <div style="border: 2px solid #333; padding: 15px; text-align: center; border-radius: 8px; background: white; min-height: 220px; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                  <div style="width: 80px; height: 80px; border: 1px solid #ddd; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center; background: #f9f9f9;">
                    ${qrUrl ? `<img src="${qrUrl}" alt="QR" style="width: 80px; height: 80px;" />` : '<div style="width:80px;height:80px;background:#eee;color:#888;display:flex;align-items:center;justify-content:center;font-size:10px;">No QR</div>'}
                  </div>
                  <div style="font-weight: bold; font-size: 16px; margin: 10px 0; color: #333;">${item.productName || item.name || ''}</div>
                  <div style="font-size: 14px; color: #666; margin: 8px 0;">${item.productBrand || item.brand || ''}</div>
                  <div style="font-family: monospace; font-size: 12px; color: #888; margin: 8px 0; background: #f0f0f0; padding: 4px; border-radius: 4px;">${type === "products" ? (item.sku || '') : (item.variantSku || '')}</div>
                  ${type === "variants" ? `
                    <div style="background: #e8f4fd; padding: 8px; margin: 8px 0; border-radius: 4px; font-size: 12px;">
                      <div style="margin: 2px 0;"><strong>Size:</strong> ${item.size || ''}</div>
                      <div style="margin: 2px 0;"><strong>Serial:</strong> ${item.serialNumber || ''}</div>
                      <div style="margin: 2px 0;"><strong>Location:</strong> ${item.location || ''}</div>
                    </div>
                  ` : `
                    <div style="font-size: 12px; color: #666; margin: 8px 0;">Serial: ${item.serial_number || ''}</div>
                  `}
                </div>
                <div style="font-weight: bold; color: #22c55e; font-size: 14px; margin-top: 10px; border-top: 1px solid #eee; padding-top: 8px;">
                  ${formatCurrency(item.productPrice || item.salePrice || 0, currency)}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    // Open print window
    const printWindow = window.open("", "_blank", "width=1000,height=800,scrollbars=yes");
    if (!printWindow) {
      alert("Please allow popups for this site to enable printing");
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>QR Codes - ${type === "products" ? "Products" : "Individual Shoes"}</title>
          <style>
            * { box-sizing: border-box; }
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 20px; 
              background: white; 
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            @media print { 
              body { margin: 0; padding: 10px; } 
              div { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                setTimeout(function() { window.close(); }, 2000);
              }, 300);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
  }

  const handleDownloadPDF = async (type: "products" | "variants" = "products") => {
    setIsGeneratingPDF(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: html2canvas } = await import('html2canvas');
      const QRCode = await import('qrcode');
      
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '0';
      tempContainer.style.width = '800px';
      tempContainer.style.backgroundColor = 'white';
      tempContainer.style.padding = '20px';
      
      const items = type === "variants" ? selectedVariantObjects : selectedShoes;
      
      tempContainer.innerHTML = `
        <div style="font-family: Arial, sans-serif;">
          <h2 style="text-align: center; margin-bottom: 30px; color: #333;">
            QR Codes - ${type === "products" ? "Products" : "Individual Shoes"}
          </h2>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;">
            ${items.map((item: any) => `
              <div style="border: 2px solid #333; padding: 15px; text-align: center; border-radius: 8px; background: white;">
                <div style="width: 80px; height: 80px; border: 1px solid #ddd; margin: 0 auto 10px; display: flex; align-items: center; justify-content: center; background: #f9f9f9;">
                  <canvas id="qr-${item.id}" width="80" height="80"></canvas>
                </div>
                <div style="font-weight: bold; font-size: 14px; margin: 8px 0;">${item.productName || item.name || ''}</div>
                <div style="font-size: 12px; color: #666; margin: 4px 0;">${item.productBrand || item.brand || ''}</div>
                <div style="font-family: monospace; font-size: 11px; color: #888; margin: 4px 0;">${item.sku || item.variantSku || ''}</div>
                ${type === "variants" ? `
                  <div style="background: #f0f0f0; padding: 8px; margin: 8px 0; border-radius: 4px; font-size: 11px;">
                    <div>Size ${item.size || ''}</div>
                    <div>Serial: ${item.serialNumber || ''}</div>
                    <div>Location: ${item.location || ''}</div>
                  </div>
                ` : ''}
                <div style="font-weight: bold; color: #22c55e; font-size: 12px; margin-top: 8px;">
                  ${formatCurrency(item.productPrice || item.salePrice || 0, currency)}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
      
      document.body.appendChild(tempContainer);
      
      // Generate QR codes with error handling
      for (const item of items) {
        const canvas = tempContainer.querySelector(`#qr-${item.id}`) as HTMLCanvasElement;
        if (canvas) {
          const qrText = item.sku || item.variantSku || item.serialNumber || String(item.id);
          try {
            await QRCode.toCanvas(canvas, qrText, {
              width: 80,
              margin: 1,
              color: { dark: '#000000', light: '#FFFFFF' },
              errorCorrectionLevel: 'M'
            });
          } catch (qrError) {
            console.warn(`Failed to generate QR code for item ${item.id}:`, qrError);
            // Draw enhanced fallback
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, 80, 80);
              ctx.strokeStyle = '#000000';
              ctx.lineWidth = 2;
              ctx.strokeRect(1, 1, 78, 78);
              
              // Draw corner markers
              ctx.fillStyle = '#000000';
              [
                [5, 5], [60, 5], [5, 60]
              ].forEach(([x, y]) => {
                ctx.fillRect(x, y, 15, 15);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(x + 3, y + 3, 9, 9);
                ctx.fillStyle = '#000000';
                ctx.fillRect(x + 5, y + 5, 5, 5);
              });
              
              // Add data pattern
              for (let x = 25; x < 55; x += 2) {
                for (let y = 25; y < 55; y += 2) {
                  if ((x + y + qrText.length) % 4 === 0) {
                    ctx.fillRect(x, y, 1, 1);
                  }
                }
              }
              
              ctx.fillStyle = '#333';
              ctx.font = 'bold 7px monospace';
              ctx.textAlign = 'center';
              ctx.fillText(qrText.substring(0, 10), 40, 75);
            }
          }
        }
      }
      
      // Wait for QR generation to complete
      await new Promise<void>((resolve) => setTimeout(resolve, 1000));
      
      const canvas = await html2canvas(tempContainer, {
        backgroundColor: 'white',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false
      });
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pageHeight = 297;
      let yPosition = 0;
      
      while (yPosition < imgHeight) {
        if (yPosition > 0) {
          pdf.addPage();
        }
        
        pdf.addImage(
          canvas.toDataURL('image/png'),
          'PNG',
          0,
          -yPosition,
          imgWidth,
          imgHeight
        );
        
        yPosition += pageHeight;
      }
      
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `qr-codes-${type}-${timestamp}.pdf`;
      pdf.save(filename);
      
      document.body.removeChild(tempContainer);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Error generating PDF: ${errorMessage}. Please try again.`);
    } finally {
      setIsGeneratingPDF(false);
    }
  }

  // Helper: check if all QR data URLs are ready for current tab
  const allProductQRCodesReady = selectedShoes.every(shoe => qrDataUrls[`product-${shoe.id}`]);
  const allVariantQRCodesReady = selectedVariantObjects.every(variant => qrDataUrls[`variant-${variant.id}`]);

  const currentTab = selectedVariants.length > 0 ? "variants" : "products";

  // Debug: Log QR canvas refs and data URLs to the console after canvases render
  useEffect(() => {
    const timeout = setTimeout(() => {
      const newDataUrls: { [key: string]: string } = {};
      let changed = false;
      // For products
      selectedShoes.forEach((shoe) => {
        const key = `product-${shoe.id}`;
        const canvas = qrCanvases.current[key];
        if (canvas) {
          try {
            const url = canvas.toDataURL();
            newDataUrls[key] = url;
            if (qrDataUrls[key] !== url) changed = true;
          } catch {}
        }
      });
      // For variants
      selectedVariantObjects.forEach((variant) => {
        const key = `variant-${variant.id}`;
        const canvas = qrCanvases.current[key];
        if (canvas) {
          try {
            const url = canvas.toDataURL();
            newDataUrls[key] = url;
            if (qrDataUrls[key] !== url) changed = true;
          } catch {}
        }
      });
      // Debug output
      if (typeof window !== 'undefined') {
        // Print all canvas refs and their data URLs
        console.log('[QR DEBUG] Product canvases:', Object.keys(qrCanvases.current).filter(k => k.startsWith('product-')).map(k => ({ key: k, canvas: qrCanvases.current[k], url: newDataUrls[k] })));
        console.log('[QR DEBUG] Variant canvases:', Object.keys(qrCanvases.current).filter(k => k.startsWith('variant-')).map(k => ({ key: k, canvas: qrCanvases.current[k], url: newDataUrls[k] })));
        console.log('[QR DEBUG] All data URLs:', newDataUrls);
      }
      // Only update state if changed
      if (changed || Object.keys(qrDataUrls).length !== Object.keys(newDataUrls).length) {
        setQrDataUrls(newDataUrls);
      }
    }, 300); // Wait 300ms for canvases to render
    return () => clearTimeout(timeout);
  }, [selectedShoes.map(s => s.id).join(','), selectedVariantObjects.map(v => v.id).join(','), open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Print Preview - QR Codes
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue={currentTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="products" disabled={selectedItems.length === 0}>
              Products ({selectedItems.length})
            </TabsTrigger>
            <TabsTrigger value="variants" disabled={selectedVariants.length === 0}>
              Individual Shoes ({selectedVariants.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-4">
            <div className="flex gap-2">
              <Button onClick={() => handlePrint("products")} className="flex-1" disabled={selectedItems.length === 0 || !allProductQRCodesReady}>
                <Printer className="h-4 w-4 mr-2" />
                Print Product QR Codes
              </Button>
              <Button 
                onClick={() => handleDownloadPDF("products")} 
                variant="outline" 
                className="flex-1"
                disabled={isGeneratingPDF || selectedItems.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                {isGeneratingPDF ? 'Generating PDF...' : 'Download PDF'}
              </Button>
            </div>

            <div
              ref={printRef}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-h-96 overflow-y-auto border rounded-lg p-4"
            >
              {selectedShoes.map((shoe) => (
                <Card key={shoe.id} className="text-center">
                  <CardContent className="p-4">
                    <div
                      className="w-20 h-20 border-2 border-gray-300 mx-auto mb-3 flex items-center justify-center bg-gray-50"
                      ref={el => {
                        if (el) {
                          const canvas = el.querySelector('canvas');
                          qrCanvases.current[`product-${shoe.sku}`] = canvas as HTMLCanvasElement | null;
                        }
                      }}
                    >
                      <Canvas
                        text={shoe.sku}
                        options={{ width: 64, margin: 1 }}
                      />
                    </div>
                    <h3 className="font-bold text-sm mb-1">{shoe.name}</h3>
                    <p className="text-xs text-gray-600">{shoe.brand}</p>
                    <p className="text-xs font-mono text-gray-500">{shoe.sku}</p>
                    <p className="text-sm font-bold text-green-600 mt-1">{formatCurrency(shoe.salePrice, currency)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="variants" className="space-y-4">
            <div className="flex gap-2">
              <Button onClick={() => handlePrint("variants")} className="flex-1" disabled={selectedVariants.length === 0 || !allVariantQRCodesReady}>
                <Printer className="h-4 w-4 mr-2" />
                Print Individual Shoe QR Codes
              </Button>
              <Button 
                onClick={() => handleDownloadPDF("variants")} 
                variant="outline" 
                className="flex-1"
                disabled={isGeneratingPDF || selectedVariants.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                {isGeneratingPDF ? 'Generating PDF...' : 'Download PDF'}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 max-h-96 overflow-y-auto border rounded-lg p-4">
              {selectedVariantObjects.map((variant) => (
                <Card key={variant.id} className="text-center">
                  <CardContent className="p-3">
                    <div
                      className="w-16 h-16 border-2 border-gray-300 mx-auto mb-2 flex items-center justify-center bg-gray-50"
                      ref={el => {
                        if (el) {
                          const canvas = el.querySelector('canvas');
                          qrCanvases.current[`variant-${variant.id}`] = canvas as HTMLCanvasElement | null;
                        }
                      }}
                    >
                      <Canvas
                        text={variant.serialNumber}
                        options={{ width: 48, margin: 1 }}
                      />
                    </div>
                    <h3 className="font-bold text-xs mb-1">{variant.productName}</h3>
                    <p className="text-xs text-gray-600">{variant.productBrand}</p>
                    <div className="bg-gray-100 p-1 rounded mt-1 mb-1">
                      <p className="text-xs font-bold">Size {variant.size}</p>
                      <p className="text-xs font-mono">{variant.variantSku}</p>
                      <p className="text-xs">Serial: {variant.serialNumber}</p>
                      <p className="text-xs">Location: {variant.location}</p>
                    </div>
                    <p className="text-xs font-bold ">{formatCurrency(variant.productPrice, currency)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {selectedItems.length === 0 && selectedVariants.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <QrCode className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No items selected for printing</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}