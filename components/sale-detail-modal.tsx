"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DollarSign, Package, Users, Calendar, MapPin, CreditCard, Hash, User, Phone, Truck, FileText } from "lucide-react"
import Image from "next/image"
import { useCurrency } from "@/context/CurrencyContext"
import { useTimezone } from "@/context/TimezoneContext"
import { formatCurrency } from "@/lib/utils/currency"
import { motion } from "framer-motion"

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
  down_payment?: number | null
  remaining_balance?: number | null
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 custom-scrollbar">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Hash className="h-4 w-4 text-primary" />
              </div>
              <div>
                <DialogHeader className="p-0 space-y-0">
                  <DialogTitle className="text-lg font-semibold">Sale {saleNumber}</DialogTitle>
                </DialogHeader>
                <p className="text-xs text-muted-foreground">{formatDateInTimezone(sale.sale_date)}</p>
              </div>
            </div>
            {sale.status && (
              <Badge variant="outline" className={`text-xs font-medium ${
                sale.status === 'completed' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' :
                sale.status === 'pending' ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20' :
                sale.status === 'refunded' ? 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20' :
                sale.status === 'voided' ? 'bg-muted text-muted-foreground border-border' :
                sale.status === 'downpayment' ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20' :
                'bg-muted text-muted-foreground border-border'
              }`}>
                {sale.status.charAt(0).toUpperCase() + sale.status.slice(1)}
              </Badge>
            )}
          </div>
        </div>

        <div className="px-6 pb-6 space-y-6">
          {/* Summary Grid */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
          >
            <div className="grid grid-cols-2 gap-3">
              {/* Customer Info */}
              {(sale.customer_name || sale.customer_phone) && (
                <div className="col-span-2 flex items-start gap-3 rounded-lg border bg-muted/30 p-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-500/10">
                    <User className="h-4 w-4 text-blue-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-muted-foreground">Customer</p>
                    <p className="text-sm font-semibold text-foreground truncate">{sale.customer_name || 'N/A'}</p>
                    {sale.customer_phone && (
                      <p className="text-xs text-muted-foreground mt-0.5">{sale.customer_phone}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Payment Type */}
              <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-purple-500/10">
                  <CreditCard className="h-4 w-4 text-purple-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-muted-foreground">Payment</p>
                  <p className="text-sm font-semibold text-foreground">
                    {(() => {
                      if (!sale.payment_type) return 'N/A';
                      if (typeof sale.payment_type === 'object' && sale.payment_type !== null) {
                        if (sale.payment_type.type) return 'Cash';
                        if (sale.payment_type.name) return sale.payment_type.name;
                        return 'Cash';
                      }
                      if (typeof sale.payment_type === 'string') {
                        return sale.payment_type.charAt(0).toUpperCase() + sale.payment_type.slice(1);
                      }
                      return 'N/A';
                    })()}
                  </p>
                  {typeof sale.payment_type === 'object' && sale.payment_type?.feeType && typeof sale.payment_type?.feeValue === 'number' && sale.payment_type?.feeValue > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Fee: {sale.payment_type.feeType === 'percent' ? `${sale.payment_type.feeValue}%` : formatCurrency(sale.payment_type.feeValue, currency)}
                      {' '}({(() => {
                        const baseAmount = sale.down_payment != null && sale.down_payment > 0
                          ? (sale.remaining_balance || 0)
                          : sale.total_amount;
                        if (sale.payment_type.feeType === 'percent') {
                          return formatCurrency((sale.payment_type.feeValue / 100) * baseAmount, currency);
                        }
                        return formatCurrency(sale.payment_type.feeValue, currency);
                      })()})
                    </p>
                  )}
                </div>
              </div>

              {/* Items Count */}
              <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-amber-500/10">
                  <Package className="h-4 w-4 text-amber-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-muted-foreground">Items</p>
                  <p className="text-sm font-semibold text-foreground">{items.length} {items.length === 1 ? 'item' : 'items'}</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Financial Summary */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b bg-muted/30">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  Financial Summary
                </h3>
              </div>
              <div className="p-4 space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium text-foreground">{formatCurrency((sale.total_amount + sale.total_discount), currency)}</span>
                </div>
                {sale.total_discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="font-medium text-red-600 dark:text-red-400">-{formatCurrency(sale.total_discount, currency)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold border-t border-border pt-2.5">
                  <span className="text-foreground">Total</span>
                  <span className="text-foreground">{formatCurrency(sale.total_amount, currency)}</span>
                </div>

                {/* Down payment info */}
                {sale.down_payment != null && sale.down_payment > 0 && (
                  <>
                    <div className="flex justify-between text-sm bg-blue-500/5 rounded-lg p-2.5 -mx-1">
                      <span className="text-blue-700 dark:text-blue-400 font-medium">Down Payment</span>
                      <span className="font-semibold text-blue-700 dark:text-blue-400">{formatCurrency(sale.down_payment, currency)}</span>
                    </div>
                    {(sale.remaining_balance != null && sale.remaining_balance > 0) || sale.status === 'completed' ? (
                      <div className={`flex justify-between text-sm rounded-lg p-2.5 -mx-1 ${
                        sale.status === 'completed' ? 'bg-emerald-500/5' : 'bg-amber-500/5'
                      }`}>
                        <span className={`font-medium ${sale.status === 'completed' ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
                          Remaining {sale.status === 'completed' && '(Paid)'}
                        </span>
                        <span className={`font-semibold ${sale.status === 'completed' ? 'line-through text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
                          {formatCurrency(
                            sale.status === 'completed'
                              ? (sale.total_amount - (sale.down_payment ?? 0))
                              : (sale.remaining_balance ?? 0),
                            currency
                          )}
                        </span>
                      </div>
                    ) : null}
                  </>
                )}

                <div className="flex justify-between text-sm pt-1">
                  <span className="text-muted-foreground font-medium">Net Profit</span>
                  <span className={`font-bold text-base ${sale.net_profit < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                    {formatCurrency(sale.net_profit, currency)}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Shipping Information */}
          {(sale.shipping_address || sale.shipping_city || sale.shipping_country || sale.shipping_notes) && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.15 }}
            >
              <div className="rounded-xl border bg-card overflow-hidden">
                <div className="px-4 py-3 border-b bg-muted/30">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Truck className="h-4 w-4 text-muted-foreground" />
                    Shipping Information
                  </h3>
                </div>
                <div className="p-4 space-y-2">
                  {sale.shipping_address && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Address</span>
                      <span className="font-medium text-foreground text-right max-w-[60%]">{sale.shipping_address}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Location</span>
                    <span className="font-medium text-foreground text-right">
                      {[sale.shipping_city, sale.shipping_state, sale.shipping_zip, sale.shipping_country]
                        .filter(Boolean)
                        .join(', ')}
                    </span>
                  </div>
                  {sale.shipping_notes && (
                    <div className="pt-1">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
                      <div className="text-sm text-foreground bg-muted/30 rounded-lg p-2.5">
                        {sale.shipping_notes}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Sold Items */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="px-4 py-3 border-b bg-muted/30">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  Sold Items
                </h3>
              </div>
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <Package className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">No items recorded</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {items.map((item, index) => {
                    const isPreorderItem = item.variant?.type === 'Pre-order';
                    const isDownpaymentItem = item.variant?.type === 'downpayment';
                    let identifier = '';
                    if (isPreorderItem || isDownpaymentItem) {
                      const preorderMatch = item.variant?.notes?.match(/pre-order #(\d+)/);
                      identifier = preorderMatch ? `PO #${preorderMatch[1]}` : 'N/A';
                    } else {
                      identifier = item.variant?.serialNumber ? `SN: ${item.variant.serialNumber}` : 'N/A';
                    }

                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: 0.25 + index * 0.04 }}
                        className="flex items-center gap-3 p-3 hover:bg-muted/20 transition-colors"
                      >
                        <Image
                          src={item.variant?.productImage || "/placeholder.svg?height=40&width=40"}
                          alt={item.variant?.productName || "Product"}
                          width={44}
                          height={44}
                          className="rounded-lg object-cover shrink-0 border bg-muted/30"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{item.variant?.productName || 'Unknown Product'}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground">{item.variant?.productBrand || 'Unknown'}</span>
                            <span className="text-muted-foreground/40">·</span>
                            <span className="text-xs text-muted-foreground">{item.variant?.size || 'N/A'}</span>
                            <span className="text-muted-foreground/40">·</span>
                            <span className="text-xs font-mono text-muted-foreground">{identifier}</span>
                          </div>
                          {item.variant?.notes && (
                            <p className="text-xs text-muted-foreground/70 mt-0.5 truncate" title={item.variant.notes}>{item.variant.notes}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold text-foreground">{formatCurrency(item.sold_price, currency)}</p>
                          <p className="text-xs text-muted-foreground">Cost: {formatCurrency(item.cost_price, currency)}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>

          {/* Profit Distribution */}
          {profitDistribution.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.25 }}
            >
              <div className="rounded-xl border bg-card overflow-hidden">
                <div className="px-4 py-3 border-b bg-muted/30">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    Profit Distribution
                  </h3>
                </div>
                <div className="divide-y divide-border">
                  {profitDistribution.map((dist, index) => (
                    <motion.div
                      key={dist.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: 0.3 + index * 0.04 }}
                      className="flex items-center justify-between p-3 hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {(dist.avatar?.name || 'U').charAt(0)}
                        </div>
                        <span className="text-sm font-medium text-foreground">{dist.avatar?.name || 'Unknown'}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">{dist.percentage.toFixed(1)}%</span>
                        <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(dist.amount, currency)}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
