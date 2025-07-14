"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useCurrency } from "@/context/CurrencyContext"
import { formatCurrency } from "@/lib/utils/currency"
import { Package, TrendingUp, AlertTriangle, DollarSign } from "lucide-react"

interface StatsCardsProps {
  data: any[];
  totalInventoryValue?: number;
}

export function StatsCards({ data, totalInventoryValue }: StatsCardsProps) {
  const { currency } = useCurrency()
  const totalProducts = data.length
  const totalStock = data.reduce((sum, shoe) => {
    const availableVariants = shoe.variants.filter((v: any) => v.status === "Available")
    return sum + availableVariants.length
  }, 0)

  const lowStockItems = data.filter((shoe) => {
    const availableStock = shoe.variants.filter((v: any) => v.status === "Available").length
    return availableStock > 0 && availableStock <= 10
  }).length

  // Use the parent-calculated value if provided, else fallback to old logic
  const totalValue = typeof totalInventoryValue === "number"
    ? totalInventoryValue
    : data.reduce((sum, shoe) => {
        const availableVariants = shoe.variants.filter((v: any) => v.status === "Available")
        return sum + availableVariants.length * shoe.salePrice
      }, 0)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Products</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalProducts}</div>
          <p className="text-xs text-muted-foreground">Active product lines</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Individual Shoes</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalStock}</div>
          <p className="text-xs text-muted-foreground">Available individual units</p>
        </CardContent>
      </Card>

     

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalValue, currency)}</div>
          <p className="text-xs text-muted-foreground">Total available stock value</p>
        </CardContent>
      </Card>
    </div>
  )
}
