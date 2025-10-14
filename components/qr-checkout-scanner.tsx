"use client"

import { useState, useCallback, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { QrCode, Camera, CameraOff, Check, X, ShoppingCart, Trash2, AlertCircle, CheckCircle, Keyboard, ScanLine } from "lucide-react"
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
  const scannerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [scannerType, setScannerType] = useState<'camera' | 'manual'>('manual'); // Default to handheld
  const [isScanning, setIsScanning] = useState(false);
  const [manualInput, setManualInput] = useState('');

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scannerTimeoutRef.current) {
        clearTimeout(scannerTimeoutRef.current);
      }
    };
  }, []);


  const [scannedBatch, setScannedBatch] = useState<ScannedVariant[]>([]);
  const [lastScanResult, setLastScanResult] = useState<{
    type: 'success' | 'error' | 'duplicate' | 'sold' | 'already-in-cart';
    message: string;
    variant?: ScannedVariant;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const scanCountRef = useRef(0);

  // Keep input focused when in scanner mode
  useEffect(() => {
    if (scannerType === 'manual') {
      const focusInput = () => {
        const input = document.querySelector('input[autoFocus]') as HTMLInputElement;
        if (input && document.activeElement !== input) {
          console.log('Focusing input via useEffect');
          input.focus();
        }
      };

      // Focus immediately
      focusInput();

      // Also focus when processing completes
      if (!isProcessing) {
        setTimeout(focusInput, 100);
      }

      // Set up a more aggressive focus maintenance
      const focusInterval = setInterval(() => {
        if (scannerType === 'manual' && !isProcessing) {
          focusInput();
        }
      }, 500);

      return () => {
        clearInterval(focusInterval);
      };
    }
  }, [scannerType, isProcessing]);

  // Process scanned value (works for both camera and manual input)
  const processScannedValue = async (scannedValue: string) => {
    scanCountRef.current += 1;
    console.log(`=== SCAN #${scanCountRef.current} ===`);
    console.log('Value:', scannedValue);
    console.log('isProcessing:', isProcessing);
    
    if (isProcessing || !scannedValue.trim()) {
      console.log('Skipping - already processing or empty value');
      return;
    }
    
    console.log('Processing scan...');
    setIsProcessing(true);
    
    try {
      // Clear previous result immediately to avoid showing stale errors
      setLastScanResult(null);


      // Check if already scanned in current batch
      const alreadyScanned = scannedBatch.find(v => 
        v.serialNumber === scannedValue || v.id === scannedValue
      );
      if (alreadyScanned) {
        setLastScanResult({
          type: 'duplicate',
          message: `Item already on the list`,
        });
        setIsProcessing(false);
        return;
      }

      // Check if already in cart
      const apiUrl = `/api/variants/by-serial/${encodeURIComponent(scannedValue)}`;
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        setLastScanResult({
          type: 'error',
          message: `Item not found`,
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
          message: `Variant is sold already`,
        });
        setIsProcessing(false);
        return;
      }

      // Check if variant is not available
      if (variant.status !== 'Available') {
        setLastScanResult({
          type: 'error',
          message: `Item not available`,
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
        message: `Item added`,
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
        message: `Item not found`,
      });
    } finally {
      // Always reset processing state, even if there's an error
      console.log('Scan processing complete, resetting isProcessing');
      setIsProcessing(false);
    }
  };

  // Handle camera QR scan
  const handleScanSuccess = async (detectedCodes: any[]) => {
    if (!detectedCodes || detectedCodes.length === 0) return;
    const scannedValue = detectedCodes[0].rawValue;
    await processScannedValue(scannedValue);
  };



  // Handle manual input changes (auto-process for handheld scanner)
  const handleManualInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    console.log('Input change:', value, 'Length:', value.length, 'isProcessing:', isProcessing);
    setManualInput(value);
    
    // Clear any previous timeout to avoid processing partial scans
    if (scannerTimeoutRef.current) {
      clearTimeout(scannerTimeoutRef.current);
      console.log('Cleared previous timeout');
    }

    // Clear any previous error messages when new input starts
    if (value.length === 1) {
      setLastScanResult(null);
    }
    
    // Auto-process for handheld scanner when value is entered
    if (value.trim() && scannerType === 'manual') {
      // Capture the current value for processing
      const valueToProcess = value.trim();
      console.log('Setting timeout for:', valueToProcess);
      
      // Longer delay to ensure complete scan capture and avoid partial processing
      scannerTimeoutRef.current = setTimeout(async () => {
        console.log('Timeout fired for:', valueToProcess);
        // Process the captured value directly (don't compare with current state)
        if (valueToProcess) {
          await processScannedValue(valueToProcess);
          console.log('Clearing input after processing');
          setManualInput(''); // Clear after processing
          
          // Refocus the input field for next scan
          setTimeout(() => {
            const input = document.querySelector('input[autoFocus]') as HTMLInputElement;
            if (input) {
              console.log('Refocusing input after processing');
              input.focus();
              input.click(); // Also click to ensure it's really focused
            } else {
              console.log('Could not find input field to refocus');
            }
          }, 200); // Increased delay to ensure DOM is ready
        }
      }, 300); // Increased delay further to ensure complete scan
    }
  };

  // Handle manual input key press  
  const handleManualKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      // Clear any pending timeout since we're processing now
      if (scannerTimeoutRef.current) {
        clearTimeout(scannerTimeoutRef.current);
        scannerTimeoutRef.current = null;
      }
      
      // Process immediately on Enter
      if (manualInput.trim()) {
        const valueToProcess = manualInput.trim();
        processScannedValue(valueToProcess).then(() => {
          setManualInput('');
          
          // Ensure input stays focused for next scan
          setTimeout(() => {
            const input = e.target as HTMLInputElement;
            console.log('Refocusing input after Enter key processing');
            input.focus();
            input.click();
          }, 200);
        });
      }
    }
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
              {scannerType === 'camera' && (
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
              )}
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardTitle>
          
          {/* Scanner Type Selection */}
          <div className="flex gap-2 mt-3">
            <Button
              variant={scannerType === 'manual' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setScannerType('manual');
                setIsScanning(false);
              }}
              className="flex items-center gap-2"
            >
              <ScanLine className="h-4 w-4" />
              Scanner
            </Button>
            <Button
              variant={scannerType === 'camera' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setScannerType('camera');
                setIsScanning(false);
                setManualInput('');
              }}
              className="flex items-center gap-2"
            >
              <Camera className="h-4 w-4" />
              Camera
            </Button>
            

          </div>
          

        </CardHeader>

        <CardContent className="flex-1 overflow-hidden flex gap-4">
          {/* Scanner Section */}
          <div className="w-1/2 flex flex-col">
            <div className="bg-gray-100 rounded-lg p-4 mb-4 flex-shrink-0">
              {scannerType === 'camera' ? (
                // Camera Scanner Interface
                isScanning ? (
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
                    <p className="text-gray-600">Click "Start Scanner" to begin</p>
                  </div>
                )
              ) : (
                // Handheld Scanner Interface - Show scanning status and recent scans
                <div 
                  className="py-8 relative min-h-[320px] cursor-pointer"
                  onClick={() => {
                    console.log('Scanner area clicked, focusing input');
                    const input = document.querySelector('input[autoFocus]') as HTMLInputElement;
                    if (input) {
                      input.focus();
                      input.click();
                    }
                  }}
                >
                  <div className="text-center mb-6">
                    <ScanLine className={`h-12 w-12 mx-auto mb-4 ${isProcessing ? 'text-blue-600 animate-pulse' : 'text-blue-500'}`} />
                    <p className="text-gray-600 font-medium">
                      {isProcessing ? 'Processing...' : 'Scanner Ready'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {isProcessing ? 'Please wait' : 'Point scanner at items to add them'}
                    </p>
                  </div>
                  
                  {/* Show recent scans in scanner interface */}
                  {scannedBatch.length > 0 && (
                    <div className="mt-6">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Recent Scans</h4>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {scannedBatch.slice(-3).map((variant) => (
                          <div key={variant.id} className="flex items-center gap-3 p-2 bg-white rounded border text-xs">
                            <div className="w-8 h-8 relative rounded overflow-hidden flex-shrink-0">
                              <Image
                                src={variant.productImage || "/placeholder.svg"}
                                alt={variant.productName}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{variant.productBrand} {variant.productName}</p>
                              <p className="text-gray-500">Size: {variant.size}</p>
                            </div>
                            <span className="text-green-600 font-medium">✓</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Hidden input for scanner - positioned to capture focus */}
                  <Input
                    value={manualInput}
                    onChange={handleManualInputChange}
                    onKeyDown={handleManualKeyPress}
                    onFocus={() => console.log('Input focused')}
                    onBlur={() => {
                      console.log('Input lost focus - refocusing in 100ms');
                      setTimeout(() => {
                        const input = document.querySelector('input[autoFocus]') as HTMLInputElement;
                        if (input && scannerType === 'manual' && !isProcessing) {
                          input.focus();
                        }
                      }, 100);
                    }}
                    className="absolute top-0 left-0 w-full h-full opacity-0 cursor-default"
                    autoFocus
                    style={{ zIndex: 1 }}
                  />
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
