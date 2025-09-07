"use client"

import { useState, useCallback, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { QrCode, Camera, CameraOff, Check, X, ShoppingCart, Trash2, AlertCircle, CheckCircle } from "lucide-react"
import Image from "next/image"
import { formatCurrency } from "@/lib/utils/currency"
import { useCurrency } from "@/context/CurrencyContext"
import { Scanner } from "@yudiel/react-qr-scanner"
import { toast } from "sonner"

interface ScannedVariant {
  id: string;
  variantSku: string;
  serialNumber: string;
  size: string;
  sizeLabel: string;
  location: string | null;
  status: string;
  costPrice: number;
  productName: string;
  productBrand: string;
  productSku: string;
  productImage: string | null;
  productSalePrice: number;
  productCategory: string | null;
  productSizeCategory: string;
  ownerType?: 'store' | 'consignor';
  consignorId?: string;
  consignorName?: string;
  consignorCommissionRate?: number;
  scannedAt: Date;
}

interface QRCheckoutScannerProps {
  onBatchComplete: (variants: ScannedVariant[]) => void;
  onClose: () => void;
  existingCartItems?: string[]; // Array of variant IDs already in cart
}

export function QRCheckoutScanner({ onBatchComplete, onClose, existingCartItems = [] }: QRCheckoutScannerProps) {
  const { currency } = useCurrency();
  const [isScanning, setIsScanning] = useState(false);
  const [scannedBatch, setScannedBatch] = useState<ScannedVariant[]>([]);
  const [lastScanResult, setLastScanResult] = useState<{
    type: 'success' | 'error' | 'duplicate' | 'sold' | 'already-in-cart';
    message: string;
    variant?: ScannedVariant;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Handle successful QR scan
  const handleScanSuccess = async (detectedCodes: any[]) => {
    if (isProcessing || !detectedCodes || detectedCodes.length === 0) return;
    
    const scannedValue = detectedCodes[0].rawValue;
    setIsProcessing(true);
    
    try {
      // Clear previous result
      setLastScanResult(null);

      console.log('QR Code scanned:', scannedValue);
      console.log('QR Value type:', typeof scannedValue);
      console.log('QR Value length:', scannedValue.length);
      console.log('QR First 20 chars:', scannedValue.substring(0, 20));

      // Check if already scanned in current batch
      const alreadyScanned = scannedBatch.find(v => 
        v.serialNumber === scannedValue || v.id === scannedValue
      );
      if (alreadyScanned) {
        setLastScanResult({
          type: 'duplicate',
          message: `"${alreadyScanned.productName}" (${alreadyScanned.size}) is already in your scan batch`,
        });
        setIsProcessing(false);
        return;
      }

      // Check if already in cart
      const apiUrl = `/api/variants/by-serial/${encodeURIComponent(scannedValue)}`;
     
      
      const response = await fetch(apiUrl);
      console.log('API Response status:', response.status);
      console.log('API Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('=== API ERROR DETAILS ===');
       
        
        setLastScanResult({
          type: 'error',
          message: `Item not found (${response.status}). Please check the QR code and try again.`,
        });
        setIsProcessing(false);
        return;
      }

      const variant = await response.json();
     
     

      // Check if already in existing cart
      if (existingCartItems.includes(variant.id)) {
        setLastScanResult({
          type: 'already-in-cart',
          message: `"${variant.productName}" (${variant.size}) is already in your cart`,
        });
        setIsProcessing(false);
        return;
      }

      // Check if variant is sold
      if (variant.status === 'Sold') {
        setLastScanResult({
          type: 'sold',
          message: `"${variant.productName}" (${variant.size}) is already sold`,
        });
        setIsProcessing(false);
        return;
      }

      // Check if variant is not available
      if (variant.status !== 'Available') {
        setLastScanResult({
          type: 'error',
          message: `"${variant.productName}" (${variant.size}) is not available (Status: ${variant.status})`,
        });
        setIsProcessing(false);
        return;
      }

      // Valid variant - add to batch
      const scannedVariant: ScannedVariant = {
        ...variant,
        scannedAt: new Date()
      };

      setScannedBatch(prev => [...prev, scannedVariant]);
      setLastScanResult({
        type: 'success',
        message: `Added "${variant.productName}" (${variant.size}) to batch`,
        variant: scannedVariant
      });

      // Play success sound (optional)
      try {
        const audio = new Audio('/sounds/scan-success.mp3');
        audio.volume = 0.3;
        audio.play().catch(() => {}); // Ignore if sound fails
      } catch {}

    } catch (error) {
      console.error('Error processing scan:', error);
      setLastScanResult({
        type: 'error',
        message: `Item not found or error scanning. Please try again.`,
      });
    }

    setIsProcessing(false);
  };

  const handleScanError = (error: unknown) => {
    // Only log actual errors, not routine scanning messages
    if (error && typeof error === 'object' && 'message' in error) {
      const errorMessage = (error as Error).message;
      if (!errorMessage.includes("No QR code found") && !errorMessage.includes("Camera not found")) {
        console.log("QR scan error:", errorMessage);
      }
    }
  };

  // Remove item from batch
  const removeFromBatch = (variantId: string) => {
    setScannedBatch(prev => prev.filter(v => v.id !== variantId));
    toast.success("Removed from scan batch");
  };

  // Complete batch and add to cart
  const completeBatch = () => {
    if (scannedBatch.length === 0) {
      toast.error("No items to add to cart");
      return;
    }

    onBatchComplete(scannedBatch);
    toast.success(`Added ${scannedBatch.length} items to cart`);
    onClose();
  };

  // Cancel and close
  const handleCancel = () => {
    onClose();
  };

  // Calculate batch total
  const batchTotal = scannedBatch.reduce((sum, v) => sum + v.productSalePrice, 0);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="flex-shrink-0">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              QR Checkout Scanner
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsScanning(!isScanning)}
              >
                {isScanning ? (
                  <>
                    <CameraOff className="h-4 w-4 mr-2" />
                    Stop Scanner
                  </>
                ) : (
                  <>
                    <Camera className="h-4 w-4 mr-2" />
                    Start Scanner
                  </>
                )}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden flex gap-4">
          {/* Scanner Section */}
          <div className="w-1/2 flex flex-col">
            <div className="bg-gray-100 rounded-lg p-4 mb-4 flex-shrink-0">
              {isScanning ? (
                <div className="relative">
                  <Scanner
                    onScan={handleScanSuccess}
                    onError={handleScanError}
                    constraints={{
                      facingMode: "environment",
                      width: { ideal: 1280, min: 640 },
                      height: { ideal: 720, min: 480 },
                    }}
                    formats={['qr_code']}
                    styles={{
                      container: {
                        width: "100%",
                        height: "320px",
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
                  
                  {/* Scanning overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-40 h-40 border-2 border-white rounded-lg relative">
                      <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-green-400"></div>
                      <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-green-400"></div>
                      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-green-400"></div>
                      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-green-400"></div>
                    </div>
                  </div>

                  {isProcessing && (
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                      <div className="bg-white rounded-lg p-3">
                        <div className="text-center text-sm text-gray-600">
                          Processing scan...
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-20">
                  <Camera className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">Click "Start Scanner" to begin scanning QR codes</p>
                  <p className="text-sm text-gray-500 mt-2">Scan multiple items to add them to your cart</p>
                </div>
              )}
            </div>

            {/* Last Scan Result */}
            {lastScanResult && (
              <Alert className={`mb-4 ${
                lastScanResult.type === 'success' ? 'border-green-200 bg-green-50' :
                lastScanResult.type === 'sold' ? 'border-red-200 bg-red-50' :
                lastScanResult.type === 'duplicate' || lastScanResult.type === 'already-in-cart' ? 'border-yellow-200 bg-yellow-50' :
                'border-red-200 bg-red-50'
              }`}>
                <div className="flex items-center gap-2">
                  {lastScanResult.type === 'success' ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  )}
                  <AlertDescription className={`${
                    lastScanResult.type === 'success' ? 'text-green-800' :
                    lastScanResult.type === 'sold' ? 'text-red-800' :
                    lastScanResult.type === 'duplicate' || lastScanResult.type === 'already-in-cart' ? 'text-yellow-800' :
                    'text-red-800'
                  }`}>
                    {lastScanResult.message}
                  </AlertDescription>
                </div>
              </Alert>
            )}
          </div>

          {/* Batch Section */}
          <div className="w-1/2 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Scanned Items ({scannedBatch.length})</h3>
              {scannedBatch.length > 0 && (
                <div className="text-sm font-medium">
                  Total: {formatCurrency(batchTotal, currency)}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto border rounded-lg">
              {scannedBatch.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <ShoppingCart className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p>No items scanned yet</p>
                  <p className="text-sm text-gray-400 mt-1">Start scanning QR codes to add items</p>
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {scannedBatch.map((variant) => (
                    <div key={variant.id} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-12 h-12 relative rounded overflow-hidden flex-shrink-0">
                        <Image
                          src={variant.productImage || "/placeholder.svg"}
                          alt={variant.productName}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{variant.productName}</h4>
                        <p className="text-xs text-gray-600">{variant.productBrand}</p>
                        <div className="flex gap-2 mt-1 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            Size: {variant.size}
                          </Badge>
                          {variant.location && (
                            <Badge variant="outline" className="text-xs">
                              {variant.location}
                            </Badge>
                          )}
                          {variant.ownerType === 'consignor' && (
                            <Badge className="text-xs bg-blue-500 text-white">
                              Consigned
                            </Badge>
                          )}
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-xs text-gray-500">#{variant.serialNumber}</span>
                          <span className="text-sm font-semibold">{formatCurrency(variant.productSalePrice, currency)}</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 flex-shrink-0"
                        onClick={() => removeFromBatch(variant.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mt-4 pt-4 border-t">
              <Button
                variant="outline"
                onClick={handleCancel}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={completeBatch}
                disabled={scannedBatch.length === 0}
                className="flex-1"
              >
                <Check className="h-4 w-4 mr-2" />
                Add to Cart ({scannedBatch.length})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
