"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DollarSign, Package, Users, Calendar } from "lucide-react" // Added User and Phone icons
import Image from "next/image"
import { useCurrency } from "@/context/CurrencyContext"
import { formatCurrency } from "@/lib/utils/currency"
// IMPORTANT: If sale.items is empty in the modal, the issue is likely in the data fetching function
// that populates the 'sale' prop for this modal. Ensure that function uses
// a 'select' query with nested relationships (e.g., `*, sale_items(*, variants(*, products(*)))`).
interface Sale {
  id: string
  sale_date: string
  total_amount: number
  total_discount: number
  net_profit: number
  customer_name?: string | null // Added customer name
  customer_phone?: string | null // Added customer phone
  created_at: string
  updated_at: string
  items: Array<{
    id: string
    variant_id: string
    sold_price: number
    cost_price: number
    quantity: number
    variant: {
      id: string
      serialNumber: string
      size: string
      sizeLabel: string
      variantSku: string
      costPrice: number
      productName: string
      productBrand: string
      productSku: string
      productImage: string
    }
  }>
  profitDistribution: Array<{
    id: string
    avatar_id: string
    amount: number
    percentage: number
    avatar: {
      id: string
      name: string
    }
  }>
}

interface SaleDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sale: Sale
}

export function SaleDetailModal({ open, onOpenChange, sale }: SaleDetailModalProps) {
  if (!sale) return null
  const { currency } = useCurrency()
  console.log("Sale prop received in SaleDetailModal:", sale) // Add this line
  console.log("Sale items in modal:", sale.items)
  console.log("Sale profitDistribution in modal:", sale.profitDistribution)

  const items = Array.isArray(sale.items) ? sale.items : [];
  const profitDistribution = Array.isArray(sale.profitDistribution) ? sale.profitDistribution : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-8">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" /> Sale Details - {sale.id.slice(0, 8)}...
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-8">
          {/* Sale Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5" /> Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span>Sale Date:</span>
                <span className="font-medium">{new Date(sale.sale_date).toLocaleDateString()}</span>
              </div>
              {sale.customer_name && (
                <div className="flex justify-between text-sm">
                  <span>Customer Name:</span>
                  <span className="font-medium">{sale.customer_name}</span>
                </div>
              )}
              {sale.customer_phone && (
                <div className="flex justify-between text-sm">
                  <span>Customer Phone:</span>
                  <span className="font-medium">{sale.customer_phone}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span>Total Items:</span>
                <span className="font-medium">{items.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span className="font-medium">{formatCurrency((sale.total_amount + sale.total_discount), currency)}</span>
              </div>
              <div className="flex justify-between text-sm ">
                <span>Discount:</span>
                <span className="font-medium">{formatCurrency(sale.total_discount, currency)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-3">
                <span>Total Amount:</span>
                <span>{formatCurrency(sale.total_amount, currency)}</span>
              </div>
              <div className="flex justify-between font-semibold text-base">
                <span>Net Profit:</span>
                <span className={sale.net_profit < 0 ? "text-red-600" : "text-green-600"}>
                  {formatCurrency(sale.net_profit, currency)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Sold Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Package className="h-5 w-5" /> Sold Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-60 overflow-y-auto pr-4">
                {items.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">No items recorded for this sale.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Serial</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead className="text-right">Sold Price</TableHead>
                        <TableHead className="text-right">Cost Price</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="py-2">
                            <div className="flex items-center gap-3">
                              <Image
                                src={item.variant.productImage || "/placeholder.svg?height=40&width=40"}
                                alt={item.variant.productName}
                                width={40}
                                height={40}
                                className="rounded-md object-cover"
                              />
                              <div>
                                <p className="font-medium text-sm">{item.variant.productName}</p>
                                <p className="text-xs text-gray-500">{item.variant.productBrand}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs py-2">{item.variant.serialNumber}</TableCell>
                          <TableCell className="text-xs py-2">
                            {item.variant.size} ({item.variant.sizeLabel})
                          </TableCell>
                          <TableCell className="text-right font-medium py-2">{formatCurrency(item.sold_price, currency)}</TableCell>
                          <TableCell className="text-right text-gray-600 py-2">{formatCurrency(item.cost_price, currency)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Profit Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5" /> Profit Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {profitDistribution.length === 0 ? (
                <p className="text-center text-gray-500 py-4">No profit distribution recorded for this sale.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Avatar</TableHead>
                      <TableHead className="text-right">Percentage</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profitDistribution.map((dist) => (
                      <TableRow key={dist.id}>
                        <TableCell className="font-medium py-2">{dist.avatar.name}</TableCell>
                        <TableCell className="text-right py-2">{dist.percentage.toFixed(2)}%</TableCell>
                        <TableCell className="text-right font-medium py-2">{formatCurrency(dist.amount, currency)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
