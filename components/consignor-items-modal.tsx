"use client"

import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Package, Image as ImageIcon } from 'lucide-react'
import Image from 'next/image'
import { useCurrency } from '@/context/CurrencyContext'
import { getCurrencySymbol } from '@/lib/utils/currency'
import { createClient } from '@/lib/supabase/client'

// Helper function to format numbers with commas
const formatNumber = (num: number) => {
  return new Intl.NumberFormat().format(num)
}

interface ConsignorItem {
  id: string
  variant_sku: string
  size: string
  status: string
  location: string
  created_at: string
  products: {
    id: string
    name: string
    brand: string
    sku: string
    category: string
    sale_price: number
    image: string
  } | {
    id: string
    name: string
    brand: string
    sku: string
    category: string
    sale_price: number
    image: string
  }[]
}

interface ConsignorItemsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  consignor: {
    id: string
    name: string
  } | null
}

export function ConsignorItemsModal({ open, onOpenChange, consignor }: ConsignorItemsModalProps) {
  const [items, setItems] = React.useState<ConsignorItem[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [statusFilter, setStatusFilter] = React.useState<string>('available')
  
  const { currency } = useCurrency()
  const currencySymbol = getCurrencySymbol(currency)
  const supabase = createClient()

  // Helper function to safely get product data
  const getProduct = (item: ConsignorItem) => {
    return Array.isArray(item.products) ? item.products[0] : item.products
  }

  // Filter items based on status
  const filteredItems = React.useMemo(() => {
    if (statusFilter === 'all') return items
    return items.filter(item => 
      item.status?.toLowerCase() === statusFilter.toLowerCase()
    )
  }, [items, statusFilter])

  // Fetch consignor items when modal opens
  React.useEffect(() => {
    const fetchConsignorItems = async () => {
      if (!open || !consignor?.id) return

      setLoading(true)
      setError(null)

      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session?.access_token) {
          throw new Error('No authentication token')
        }

        console.log('Fetching items for consignor:', consignor.id)
        const response = await fetch(`/api/consignors/${consignor.id}/items`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        })
        
        console.log('Response status:', response.status)
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          console.error('API Error:', response.status, errorData)
          throw new Error(errorData.error || 'Failed to fetch consignor items')
        }

        const data = await response.json()
        console.log('Received data:', data)
        setItems(data.items || [])
      } catch (err: any) {
        console.error('Error fetching consignor items:', err)
        setError(err.message || 'Failed to load items')
      } finally {
        setLoading(false)
      }
    }

    fetchConsignorItems()
  }, [open, consignor?.id, supabase.auth])

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'available':
        return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">Available</Badge>
      case 'sold':
        return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800">Sold</Badge>
      case 'damaged':
        return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800">Damaged</Badge>
      case 'returned':
        return <Badge className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700">Returned</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Package className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            {consignor?.name}&apos;s Inventory
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading inventory...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-red-600 mb-2">Error loading inventory</p>
                <p className="text-muted-foreground text-sm">{error}</p>
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-2">No items found</p>
                <p className="text-sm text-muted-foreground">This consignor doesn't have any items in inventory</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl bg-muted/50 transition-all hover:bg-muted/70">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Items</p>
                  <p className="text-xl font-bold mt-1">{filteredItems.length}</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/50 transition-all hover:bg-muted/70">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Available</p>
                  <p className="text-xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                    {filteredItems.filter(item => item.status?.toLowerCase() === 'available').length}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-muted/50 transition-all hover:bg-muted/70">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Value</p>
                  <p className="text-xl font-bold mt-1">
                    {currencySymbol}{formatNumber(filteredItems.reduce((sum, item) => sum + (getProduct(item)?.sale_price || 0), 0))}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-muted/50 transition-all hover:bg-muted/70">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Available Value</p>
                  <p className="text-xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                    {currencySymbol}{formatNumber(filteredItems
                      .filter(item => item.status?.toLowerCase() === 'available')
                      .reduce((sum, item) => sum + (getProduct(item)?.sale_price || 0), 0))}
                  </p>
                </div>
              </div>

              {/* Items Table */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-lg">Item Details</CardTitle>
                      <CardDescription>
                        Complete inventory list with product details
                      </CardDescription>
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="sold">Sold</SelectItem>
                        <SelectItem value="all">All Items</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableHead className="w-[80px] font-semibold">Image</TableHead>
                          <TableHead className="font-semibold">Product</TableHead>
                          <TableHead className="font-semibold">SKU</TableHead>
                          <TableHead className="font-semibold">Size</TableHead>
                          <TableHead className="font-semibold">Category</TableHead>
                          <TableHead className="font-semibold">Price</TableHead>
                          <TableHead className="font-semibold">Status</TableHead>
                          <TableHead className="font-semibold">Location</TableHead>
                          <TableHead className="font-semibold">Added</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredItems.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center py-8">
                              <div className="flex flex-col items-center space-y-2">
                                <Package className="h-8 w-8 text-muted-foreground" />
                                <p className="text-muted-foreground">
                                  No {statusFilter === 'all' ? '' : statusFilter} items found
                                </p>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredItems.map((item) => (
                          <TableRow key={item.id} className="transition-colors duration-150 hover:bg-muted/30">
                            <TableCell>
                              <div className="w-20 h-20 bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                                {getProduct(item)?.image ? (
                                  <Image
                                    src={getProduct(item)?.image}
                                    alt={getProduct(item)?.name || 'Product image'}
                                    width={80}
                                    height={80}
                                    className="object-contain w-full h-full"
                                  />
                                ) : (
                                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="min-w-[200px]">
                                <div className="font-medium">
                                  {getProduct(item)?.brand}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {getProduct(item)?.name}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <code className="text-xs bg-muted px-2 py-1 rounded">
                                {item.variant_sku || '-'}
                              </code>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-mono">
                                {item.size || '-'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {getProduct(item)?.category || 'Uncategorized'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">
                                {currencySymbol}{formatNumber(getProduct(item)?.sale_price || 0)}
                              </div>
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(item.status)}
                            </TableCell>
                            <TableCell>
                              <span className="text-sm">
                                {item.location || 'Not specified'}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-muted-foreground">
                                {formatDate(item.created_at)}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
