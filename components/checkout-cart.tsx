"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ShoppingCart, Trash2, ChevronDown, ChevronUp, Grid, List, DollarSign, QrCode } from "lucide-react"
import Image from "next/image"
import { formatCurrency } from "@/lib/utils/currency"
import { useCurrency } from "@/context/CurrencyContext"
import { useState } from "react"
import { calculateSaleSplit } from "@/lib/utils/consignment"
import { QRCheckoutScanner } from "@/components/qr-checkout-scanner"

interface TransformedVariant {
  id: string;
  variantSku: string;
  size: string;
  sizeLabel: string;
  location: string | null;
  status: string;
  serialNumber: string | null;
  costPrice: number;
  productName: string;
  productBrand: string;
  productSku: string;
  productImage: string | null;
  productOriginalPrice: number;
  productSalePrice: number;
  productCategory: string | null;
  productSizeCategory: string;
  ownerType?: 'store' | 'consignor';
  consignorId?: string;
  consignorName?: string;
  consignorCommissionRate?: number;
  consignorPayoutMethod?: 'cost_price' | 'cost_plus_fixed' | 'cost_plus_percentage' | 'percentage_split';
  consignorFixedMarkup?: number;
  consignorMarkupPercentage?: number;
}

interface Preorder {
  id: number;
  pre_order_no: number;
  customer_id: number;
  product_id: number;
  variant_id: number | null;
  size: string | null;
  size_label: string | null;
  status: string;
  cost_price: number;
  total_amount: number;
  down_payment: number | null;
  remaining_balance: number;
  expected_delivery_date: string | null;
  completed_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  customer: {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    zip_code: string | null;
    country: string | null;
  };
  product: {
    name: string;
    brand: string;
    sku: string;
    image: string | null;
  };
}

interface CheckoutCartProps {
  selectedVariants: TransformedVariant[];
  selectedPreorders?: Preorder[];
  onRemove: (variantId: string) => void;
  onRemovePreorder?: (preorderId: number) => void;
  onAddVariants: (variants: TransformedVariant[]) => void;
  commissionFrom?: 'total' | 'profit';
}

export function CheckoutCart({ 
  selectedVariants, 
  selectedPreorders = [], 
  onRemove, 
  onRemovePreorder, 
  onAddVariants, 
  commissionFrom = 'total' 
}: CheckoutCartProps) {
  const { currency } = useCurrency();
  const [showAll, setShowAll] = useState(false);
  const [isCompactView, setIsCompactView] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);

  // Constants for display logic
  const ITEMS_TO_SHOW = 5;
  
  // Create unified items list (variants + pre-orders converted to variant-like objects)
  const unifiedItems = [
    ...selectedVariants.map(variant => ({ 
      type: 'variant' as const, 
      item: variant,
      displayPrice: variant.productSalePrice,
      id: variant.id 
    })),
    ...selectedPreorders.map(preorder => ({ 
      type: 'preorder' as const, 
      item: preorder,
      displayPrice: preorder.total_amount, // Use total_amount instead of remaining_balance
      id: `preorder-${preorder.id}` 
    }))
  ];
  
  const totalItems = unifiedItems.length;
  const hasMoreItems = totalItems > ITEMS_TO_SHOW;
  const displayedItems = showAll ? unifiedItems : unifiedItems.slice(0, ITEMS_TO_SHOW);

  // Calculate total 
  const variantsTotal = selectedVariants.reduce((sum, v) => sum + v.productSalePrice, 0);
  const preordersTotal = selectedPreorders.reduce((sum, p) => sum + p.total_amount, 0); // Use total_amount
  const total = variantsTotal + preordersTotal;

  // Handle QR scan batch completion
  const handleQRBatchComplete = (scannedVariants: any[]) => {
    // Convert ScannedVariant to TransformedVariant format
    const transformedVariants: TransformedVariant[] = scannedVariants.map(variant => ({
      ...variant,
      productOriginalPrice: variant.productSalePrice, // Default to sale price if original price not available
    }));
    onAddVariants(transformedVariants);
    setShowQRScanner(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" /> 
            Cart ({totalItems})
          </CardTitle>
          {totalItems > 0 && (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCompactView(!isCompactView)}
                className="text-xs"
              >
                {isCompactView ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
                {isCompactView ? "Detailed" : "Compact"}
              </Button>
            </div>
          )}
          {/* QR Scanner Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowQRScanner(true)}
            className="flex items-center gap-2"
          >
            <QrCode className="h-4 w-4" />
            Scan QR
          </Button>
        </div>
      </CardHeader>
      <CardContent>


        {/* Cart Items */}
        {totalItems === 0 ? (
          <p className="text-center text-gray-500 py-8">No items in cart</p>
        ) : (
          <>
            {/* Compact View */}
            {isCompactView ? (
              <div className="space-y-2">
                {displayedItems.map((unifiedItem) => {
                  if (unifiedItem.type === 'preorder') {
                    const preorder = unifiedItem.item as Preorder;
                    return (
                      <div key={unifiedItem.id} className="flex items-center justify-between p-2 bg-blue-50 rounded-md border border-blue-200">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="w-8 h-8 relative rounded overflow-hidden flex-shrink-0">
                            <Image
                              src={preorder.product.image || "/placeholder.svg"}
                              alt={preorder.product.name}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{preorder.product.brand} {preorder.product.name}</p>
                            <div className="flex gap-2 text-xs text-blue-600">
                              <Badge variant="outline" className="bg-yellow-100 border-yellow-300 text-yellow-800 text-xs px-1 py-0">PRE-ORDER</Badge>
                              <span>Size: {preorder.size_label || preorder.size}</span>
                              <span>Pre Order: #{preorder.pre_order_no}</span>
                            </div>
                            <div className="flex gap-3 text-xs text-gray-600 mt-1">
                              <span>Cost: {formatCurrency(preorder.cost_price, currency)}</span>
                              <span>Total: {formatCurrency(preorder.total_amount, currency)}</span>
                              <span className={`font-medium ${
                                (preorder.total_amount - preorder.cost_price) >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                Profit: {formatCurrency(preorder.total_amount - preorder.cost_price, currency)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <span className="text-sm font-medium block">{formatCurrency(preorder.total_amount, currency)}</span>
                            <span className="text-xs text-gray-500">total sale</span>
                          </div>
                          {onRemovePreorder && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onRemovePreorder(preorder.id)}
                              className="h-6 w-6 p-0 hover:bg-red-100"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  } else {
                    const variant = unifiedItem.item as TransformedVariant;
                    return (
                      <div key={variant.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="w-8 h-8 relative rounded overflow-hidden flex-shrink-0">
                            <Image
                              src={variant.productImage || "/placeholder.svg"}
                              alt={variant.productName}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{variant.productName}</p>
                            <div className="flex gap-2 text-xs text-gray-500">
                              <span>Size: {variant.size}</span>
                              {variant.serialNumber && (
                                <span>Serial: #{variant.serialNumber}</span>
                              )}
                            </div>
                            {variant.ownerType === 'consignor' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 mt-1">
                                Consigned
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-sm font-semibold">{formatCurrency(variant.productSalePrice, currency)}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => onRemove(variant.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  }
                })}
              </div>
            ) : (
              /* Detailed View */
              <ul className="space-y-4">
                {displayedItems.map((unifiedItem) => {
                  if (unifiedItem.type === 'preorder') {
                    const preorder = unifiedItem.item as Preorder;
                    return (
                      <li key={unifiedItem.id} className="flex gap-4 items-start p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="w-16 h-16 relative rounded-md overflow-hidden flex-shrink-0">
                          <Image
                            src={preorder.product.image || "/placeholder.svg"}
                            alt={preorder.product.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="flex-grow">
                          <h4 className="font-medium line-clamp-1">{preorder.product.brand} {preorder.product.name}</h4>
                          <p className="text-sm text-blue-600">Customer: {preorder.customer.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">Pre Order: #{preorder.pre_order_no}</p>
                          <div className="flex gap-2 mt-1 flex-wrap">
                            <Badge variant="outline" className="bg-yellow-100 border-yellow-300 text-yellow-800 text-xs">
                              PRE-ORDER
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              Size: {preorder.size_label || preorder.size}
                            </Badge>
                          </div>
                          
                          {/* Enhanced cost and profit information */}
                          <div className="mt-2 p-2 bg-white rounded border border-gray-200">
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Cost Price:</span>
                                <span className="font-medium">{formatCurrency(preorder.cost_price, currency)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Total Amount:</span>
                                <span className="font-medium">{formatCurrency(preorder.total_amount, currency)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Down Payment:</span>
                                <span className="font-medium text-green-600">
                                  {formatCurrency(preorder.down_payment || 0, currency)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Remaining:</span>
                                <span className="font-medium text-orange-600">
                                  {formatCurrency(preorder.remaining_balance, currency)}
                                </span>
                              </div>
                            </div>
                            
                            {/* Profit calculation */}
                            <div className="mt-2 pt-2 border-t border-gray-200">
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-600">Expected Profit:</span>
                                <span className={`font-bold ${
                                  (preorder.total_amount - preorder.cost_price) >= 0 
                                    ? 'text-green-600' 
                                    : 'text-red-600'
                                }`}>
                                  {formatCurrency(preorder.total_amount - preorder.cost_price, currency)}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Main price display */}
                          <div className="flex justify-between items-center mt-2">
                            <p className="text-sm font-semibold text-blue-700">Sale Price: {formatCurrency(preorder.total_amount, currency)}</p>
                          </div>
                        </div>
                        {onRemovePreorder && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="flex-shrink-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => onRemovePreorder(preorder.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </li>
                    );
                  } else {
                    const variant = unifiedItem.item as TransformedVariant;
                    return (
                      <li key={variant.id} className="flex gap-4 items-start">
                        <div className="w-16 h-16 relative rounded-md overflow-hidden flex-shrink-0">
                          <Image
                            src={variant.productImage || "/placeholder.svg"}
                            alt={variant.productName}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="flex-grow">
                          <h4 className="font-medium line-clamp-1">{variant.productName}</h4>
                          <p className="text-sm text-gray-600">{variant.productBrand}</p>
                          {variant.serialNumber && (
                            <p className="text-xs text-gray-500 mt-0.5">Serial: #{variant.serialNumber}</p>
                          )}
                          <div className="flex gap-2 mt-1 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              Size: {variant.size} {variant.sizeLabel}
                            </Badge>
                            {variant.location && (
                              <Badge variant="outline" className="text-xs">
                                {variant.location}
                              </Badge>
                            )}
                            {variant.ownerType === 'consignor' && (
                              <Badge className="text-xs bg-blue-500 hover:bg-blue-600 text-white border-0">
                                Consigned by {variant.consignorName || 'Unknown'}
                              </Badge>
                            )}
                          </div>
                          <div className="flex justify-between items-center mt-1">
                            <p className="text-sm font-semibold">{formatCurrency(variant.productSalePrice, currency)}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="flex-shrink-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => onRemove(variant.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </li>
                    );
                  }
                })}
              </ul>
            )}

            {/* Show More/Less Button */}
            {hasMoreItems && (
              <div className="mt-4 text-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAll(!showAll)}
                  className="w-full"
                >
                  {showAll ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-2" />
                      Show Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-2" />
                      Show {totalItems - ITEMS_TO_SHOW} More Items
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        )}

        {/* Payment summary */}
        <div className="mt-6 border-t pt-4 space-y-2">
          <div className="flex justify-between text-sm font-medium">
            <span>Subtotal:</span>
            <span>{formatCurrency(total, currency)}</span>
          </div>
        </div>

        {/* QR Scanner Modal */}
        {showQRScanner && (
          <QRCheckoutScanner
            onBatchComplete={handleQRBatchComplete}
            onClose={() => setShowQRScanner(false)}
            existingCartItems={selectedVariants.map(v => v.id)}
          />
        )}
      </CardContent>
    </Card>
  )
}
