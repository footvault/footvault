"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ShoppingCart, Trash2, ChevronDown, ChevronUp, Grid, List } from "lucide-react"
import Image from "next/image"
import { formatCurrency } from "@/lib/utils/currency"
import { useCurrency } from "@/context/CurrencyContext"
import { useState } from "react"

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
}

interface CheckoutCartProps {
  selectedVariants: TransformedVariant[];
  onRemove: (variantId: string) => void;
}

export function CheckoutCart({ selectedVariants, onRemove }: CheckoutCartProps) {
  const { currency } = useCurrency();
  const [showAll, setShowAll] = useState(false);
  const [isCompactView, setIsCompactView] = useState(false);

  // Constants for display logic
  const ITEMS_TO_SHOW = 5;
  const hasMoreItems = selectedVariants.length > ITEMS_TO_SHOW;
  const displayedVariants = showAll ? selectedVariants : selectedVariants.slice(0, ITEMS_TO_SHOW);

  // Calculate total
  const total = selectedVariants.reduce((sum, v) => sum + v.productSalePrice, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" /> 
            Cart ({selectedVariants.length})
          </CardTitle>
          {selectedVariants.length > 0 && (
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
        </div>
      </CardHeader>
      <CardContent>


        {/* Cart Items */}
        {selectedVariants.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No items in cart</p>
        ) : (
          <>
            {/* Compact View */}
            {isCompactView ? (
              <div className="space-y-2">
                {displayedVariants.map((variant) => (
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
                            <span>#{variant.serialNumber}</span>
                          )}
                        </div>
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
                ))}
              </div>
            ) : (
              /* Detailed View */
              <ul className="space-y-4">
                {displayedVariants.map((variant) => (
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
                        <p className="text-xs text-gray-500 mt-0.5">Serial #: {variant.serialNumber}</p>
                      )}
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          Size: {variant.size} {variant.sizeLabel}
                        </Badge>
                        {variant.location && (
                          <Badge variant="outline" className="text-xs">
                            {variant.location}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-semibold mt-1">{formatCurrency(variant.productSalePrice, currency)}</p>
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
                ))}
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
                      Show {selectedVariants.length - ITEMS_TO_SHOW} More Items
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
      </CardContent>
    </Card>
  )
}
