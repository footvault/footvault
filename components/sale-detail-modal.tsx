"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DollarSign, Package, Users, Calendar, MapPin } from "lucide-react" // Added MapPin for shipping
import Image from "next/image"
import { useCurrency } from "@/context/CurrencyContext"
import { useTimezone } from "@/context/TimezoneContext"
import { formatCurrency } from "@/lib/utils/currency"

// IMPORTANT: If sale.items is empty in the modal, the issue is likely in the data fetching function
// that populates the 'sale' prop for this modal. Ensure that function uses
// a 'select' query with nested relationships (e.g., `*, sale_items(*, variants(*, products(*)))`).

// API-transformed sale structure (what we actually receive from get-sales API)
interface ApiSale {
  id: string
  sales_no?: number | null
  sale_date: string
  total_amount: number
  total_discount: number
  net_profit: number
  customer_name?: string | null
  customer_phone?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
  status?: string
  payment_type?: any
  shipping_address?: string | null
  shipping_city?: string | null
  shipping_state?: string | null
  shipping_zip?: string | null
  shipping_country?: string | null
  shipping_notes?: string | null
  items?: Array<{
    id: string
    sold_price: number
    cost_price: number
    quantity: number
    variant?: {
      id: string
      serialNumber: string
      size: string
      sizeLabel: string
      variantSku: string
      costPrice?: number
      productName: string
      productBrand: string
      productSku: string
      productImage: string
      type?: string
      notes?: string | null
    } | null
  }>
  profitDistribution?: Array<{
    id: string
    percentage: number
    amount: number
    avatar?: {
      id: string
      name: string
    } | null
  }>
}

interface SaleDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sale: ApiSale
}

export function SaleDetailModal({ open, onOpenChange, sale }: SaleDetailModalProps) {
  if (!sale) return null
  const { currency } = useCurrency()
  const { formatDateInTimezone } = useTimezone()
  console.log("Sale prop received in SaleDetailModal:", sale) // Add this line
  console.log("Sale items in modal:", sale.items)
  console.log("Sale profitDistribution in modal:", sale.profitDistribution)

  const items = Array.isArray(sale.items) ? sale.items : [];
  const profitDistribution = Array.isArray(sale.profitDistribution) ? sale.profitDistribution : [];

  // Format sales number similar to sales list
  const formatSalesNo = (n: number | null | undefined) => n != null ? `#${n.toString().padStart(3, "0")}` : "#---";
  const saleNumber = formatSalesNo(sale.sales_no);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto p-6">
        <DialogHeader className="mb-6">
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" /> Sale Details - {saleNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-6">
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
                <span className="font-medium">{formatDateInTimezone(sale.sale_date)}</span>
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
                <span>Payment Type:</span>
                <span className="font-medium">
                  {(() => {
                    if (!sale.payment_type) return 'N/A';
                    
                    if (typeof sale.payment_type === 'object' && sale.payment_type !== null) {
                      // Handle new JSONB format { "type": "uuid" }
                      if (sale.payment_type.type) {
                        // This would need to be looked up from payment types, but for now show fallback
                        return 'Cash'; // TODO: Implement payment type lookup by ID
                      }
                      // Handle legacy format with name property
                      if (sale.payment_type.name) {
                        return sale.payment_type.name;
                      }
                      return 'Cash';
                    }
                    
                    // Handle string format
                    if (typeof sale.payment_type === 'string') {
                      return sale.payment_type.charAt(0).toUpperCase() + sale.payment_type.slice(1);
                    }
                    
                    return 'N/A';
                  })()}
                  {typeof sale.payment_type === 'object' && sale.payment_type?.feeType && typeof sale.payment_type?.feeValue === 'number' && sale.payment_type?.feeValue > 0 && (
                    <>
                      <span className="text-xs text-gray-500 ml-2">
                        ({sale.payment_type.feeType === 'percent' ? `${sale.payment_type.feeValue}%` : `₱${sale.payment_type.feeValue}`} fee)
                      </span>
                      <div className="text-xs text-gray-500 mt-1">
                        Fee Amount: {sale.payment_type.feeType === 'percent'
                          ? `${((sale.payment_type.feeValue / 100) * sale.total_amount).toLocaleString(undefined, { style: 'currency', currency: currency })}`
                          : `${formatCurrency(sale.payment_type.feeValue, currency)}`}
                      </div>
                    </>
                  )}
                </span>
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

          {/* Shipping Information - Only show if shipping details exist */}
          {(sale.shipping_address || sale.shipping_city || sale.shipping_country || sale.shipping_notes) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MapPin className="h-5 w-5" /> Shipping Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {sale.shipping_address && (
                  <div className="flex justify-between text-sm">
                    <span>Address:</span>
                    <span className="font-medium text-right max-w-[60%]">{sale.shipping_address}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span>Location:</span>
                  <span className="font-medium text-right">
                    {[sale.shipping_city, sale.shipping_state, sale.shipping_zip, sale.shipping_country]
                      .filter(Boolean)
                      .join(', ')}
                  </span>
                </div>
                {sale.shipping_notes && (
                  <div className="text-sm">
                    <span className="font-medium">Notes:</span>
                    <div className="mt-1 p-2 bg-gray-50 rounded text-gray-700">
                      {sale.shipping_notes}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Sold Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Package className="h-5 w-5" /> Sold Items
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="max-h-64 overflow-y-auto">
                {items.length === 0 ? (
                  <p className="text-center text-gray-500 py-6">No items recorded for this sale.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[200px]">Item</TableHead>
                        <TableHead className="w-[100px]">
                          {items.some(item => item.variant?.type === 'Pre-order' || item.variant?.type === 'downpayment') 
                            ? 'Pre-order' 
                            : 'Serial'}
                        </TableHead>
                        <TableHead className="w-[80px]">Size</TableHead>
                        <TableHead className="w-[120px]">Notes</TableHead>
                        <TableHead className="text-right w-[100px]">Sold Price</TableHead>
                        <TableHead className="text-right w-[100px]">Cost Price</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="py-3 min-w-[200px]">
                            <div className="flex items-center gap-3">
                              <Image
                                src={item.variant?.productImage || "/placeholder.svg?height=40&width=40"}
                                alt={item.variant?.productName || "Product"}
                                width={40}
                                height={40}
                                className="rounded-md object-cover flex-shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-sm whitespace-nowrap overflow-hidden text-ellipsis">{item.variant?.productName || 'Unknown Product'}</p>
                                <p className="text-xs text-gray-500 whitespace-nowrap overflow-hidden text-ellipsis">{item.variant?.productBrand || 'Unknown Brand'}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs py-3 w-[100px]">
                            {(() => {
                              // Check if this is a pre-order or downpayment item
                              const isPreorderItem = item.variant?.type === 'Pre-order';
                              const isDownpaymentItem = item.variant?.type === 'downpayment';
                              
                              if (isPreorderItem || isDownpaymentItem) {
                                const preorderMatch = item.variant?.notes?.match(/pre-order #(\d+)/);
                                const preorderNumber = preorderMatch?.[1];
                                return preorderNumber ? `#${preorderNumber}` : 'N/A';
                              } else {
                                return item.variant?.serialNumber || 'N/A';
                              }
                            })()}
                          </TableCell>
                          <TableCell className="text-xs py-3 w-[80px]">
                            <div className="whitespace-nowrap">
                              {item.variant?.size || 'N/A'} ({item.variant?.sizeLabel || 'N/A'})
                            </div>
                          </TableCell>
                          <TableCell className="text-xs py-3 w-[120px]">
                            {item.variant?.notes ? (
                              <div className="truncate" title={item.variant.notes}>
                                {item.variant.notes}
                              </div>
                            ) : (
                              <span className="text-gray-400 italic">No notes</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium py-3 w-[100px]">{formatCurrency(item.sold_price, currency)}</TableCell>
                          <TableCell className="text-right text-gray-600 py-3 w-[100px]">{formatCurrency(item.cost_price, currency)}</TableCell>
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
            <CardContent className="p-4">
              {profitDistribution.length === 0 ? (
                <p className="text-center text-gray-500 py-6">No profit distribution recorded for this sale.</p>
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
                        <TableCell className="font-medium py-3">{dist.avatar?.name || 'Unknown Avatar'}</TableCell>
                        <TableCell className="text-right py-3">{dist.percentage.toFixed(2)}%</TableCell>
                        <TableCell className="text-right font-medium py-3">{formatCurrency(dist.amount, currency)}</TableCell>
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
