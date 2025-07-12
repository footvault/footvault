"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ShoppingCart, Trash2 } from "lucide-react"
import Image from "next/image"
import { formatCurrency } from "@/lib/utils/currency"
import { useCurrency } from "@/context/CurrencyContext"

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

  const { currency } = useCurrency(); // Get the user's selected currency

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" /> Cart
        </CardTitle>
      </CardHeader>
      <CardContent>
        {selectedVariants.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No items in cart</p>
        ) : (
          <ul className="space-y-4">
            {selectedVariants.map((variant) => (
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
      </CardContent>
    </Card>
  )
}
