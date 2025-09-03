'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Eye, EyeOff, DollarSign, Package, TrendingUp, Clock } from 'lucide-react'
import Image from 'next/image'

// Local currency formatter to work around import issues
const formatPrice = (amount: number, currency: string = "USD") => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

// Helper function to format dates
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

interface ConsignorData {
  consignor: {
    id: string
    name: string
    email: string
    commission_rate: number
    payment_method: string
  }
  currency: string // Add currency field
  stats: {
    total_sales: number
    total_earnings: number
    pending_payout: number
    paid_payout: number
    available_items: number
    sold_items: number
    total_items: number
  }
  sales: Array<{
    id: string
    sale_price: number
    consignor_payout: number
    payout_status: string
    created_at: string
    variants: {
      id: string
      size: string
      variant_sku: string
      products: {
        name: string
        brand: string
        image: string
      }
    }
  }>
  current_inventory: Array<{
    id: string
    size: string
    variant_sku: string
    status: string
    location: string
    created_at: string
    products: {
      name: string
      brand: string
      image: string
      sale_price: number
    }
  }>
}

export default function PublicConsignorPortal() {
  const searchParams = useSearchParams()
  const consignorId = searchParams.get('id')
  
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<ConsignorData | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!consignorId || !password) {
      setError('Please enter your password')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/consignors/public', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ consignorId, password }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Authentication failed')
      }

      setData(result)
      setIsAuthenticated(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (!consignorId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">Invalid Link</CardTitle>
            <CardDescription>
              This consignor portal link is invalid or missing required information.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Consignor Portal</CardTitle>
            <CardDescription>
              Enter your password to access your consignor dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your portal password"
                    disabled={loading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              
              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                  {error}
                </div>
              )}
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading || !password}
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  // Helper function to format currency with the user's preferred currency
  const formatCurrencyWithUserCurrency = (amount: number) => formatPrice(amount, data.currency)

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 pb-6 border-b border-gray-200">
          <h1 className="text-2xl font-semibold text-gray-900">Welcome, {data.consignor.name}</h1>
          <p className="text-gray-600 mt-1">Your consignor dashboard</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Earnings</CardTitle>
              <DollarSign className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-gray-900">
                {formatCurrencyWithUserCurrency(data.stats.total_earnings)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                From {data.stats.sold_items} sold items
              </p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Pending Payout</CardTitle>
              <Clock className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-amber-600">
                {formatCurrencyWithUserCurrency(data.stats.pending_payout)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Awaiting payment
              </p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Available Items</CardTitle>
              <Package className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-gray-900">
                {data.stats.available_items}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Currently in store
              </p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Commission Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-gray-900">
                {data.consignor.commission_rate}%
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Your earnings rate
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="sales" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-gray-100 p-1">
            <TabsTrigger value="sales" className="text-sm">Sales History</TabsTrigger>
            <TabsTrigger value="payouts" className="text-sm">Payout History</TabsTrigger>
            <TabsTrigger value="inventory" className="text-sm">Current Inventory</TabsTrigger>
          </TabsList>

          <TabsContent value="sales">
            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-medium text-gray-900">Sales History</CardTitle>
                <CardDescription className="text-gray-600">
                  Your recent sales and earnings
                </CardDescription>
              </CardHeader>
              <CardContent>
                {data.sales.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No sales yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Sale Price</TableHead>
                        <TableHead>Your Earnings</TableHead>
                        <TableHead>Payout Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.sales.map((sale) => (
                        <TableRow key={sale.id}>
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <Image
                                src={sale.variants.products.image || '/placeholder-shoe.jpg'}
                                alt={sale.variants.products.name}
                                width={40}
                                height={40}
                                className="rounded object-cover"
                              />
                              <div>
                                <div className="font-medium">
                                  {sale.variants.products.brand} {sale.variants.products.name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  SKU: {sale.variants.variant_sku}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{sale.variants.size}</TableCell>
                          <TableCell>{formatCurrencyWithUserCurrency(sale.sale_price)}</TableCell>
                          <TableCell className="font-medium text-green-600">
                            {formatCurrencyWithUserCurrency(sale.consignor_payout)}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={sale.payout_status === 'paid' ? 'default' : 'secondary'}
                              className={sale.payout_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}
                            >
                              {sale.payout_status === 'paid' ? 'Paid' : 'Pending'}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(sale.created_at)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payouts">
            <Card>
              <CardHeader>
                <CardTitle>Payout History</CardTitle>
                <CardDescription>
                  Your payment history and payout details
                </CardDescription>
              </CardHeader>
              <CardContent>
                {data.sales.filter(sale => sale.payout_status === 'paid').length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No payouts received yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Payout Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Items Included</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.sales
                        .filter(sale => sale.payout_status === 'paid')
                        .reduce((payouts: any[], sale: any) => {
                          // Group by payout date and method
                          const existing = payouts.find(p => 
                            p.payout_date === sale.payout_date && 
                            p.payout_method === sale.payout_method
                          )
                          
                          if (existing) {
                            existing.amount += sale.consignor_payout
                            existing.items.push(sale)
                          } else {
                            payouts.push({
                              payout_date: sale.payout_date || sale.created_at,
                              payout_method: sale.payout_method || 'Not specified',
                              amount: sale.consignor_payout,
                              items: [sale],
                              notes: sale.notes
                            })
                          }
                          
                          return payouts
                        }, [])
                        .map((payout, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <div className="font-medium">
                                {formatDate(payout.payout_date)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium text-green-600">
                                {formatCurrencyWithUserCurrency(payout.amount)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                {payout.payout_method}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {payout.items.length} item{payout.items.length > 1 ? 's' : ''}
                              </div>
                              <div className="text-xs text-gray-500">
                                {payout.items.slice(0, 2).map((item: any) => 
                                  `${item.variants.products.brand} ${item.variants.products.name}`
                                ).join(', ')}
                                {payout.items.length > 2 && ` +${payout.items.length - 2} more`}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm text-gray-600">
                                {payout.notes || '-'}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inventory">
            <Card>
              <CardHeader>
                <CardTitle>Current Inventory</CardTitle>
                <CardDescription>
                  Items currently available in the store
                </CardDescription>
              </CardHeader>
              <CardContent>
                {data.current_inventory.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No items in inventory</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Date Added</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.current_inventory.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <Image
                                src={item.products.image || '/placeholder-shoe.jpg'}
                                alt={item.products.name}
                                width={40}
                                height={40}
                                className="rounded object-cover"
                              />
                              <div>
                                <div className="font-medium">
                                  {item.products.brand} {item.products.name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  SKU: {item.variant_sku}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{item.size}</TableCell>
                          <TableCell>{formatCurrencyWithUserCurrency(item.products.sale_price)}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={item.status === 'Available' ? 'default' : 'secondary'}
                              className={item.status === 'Available' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                            >
                              {item.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{item.location || 'Not specified'}</TableCell>
                          <TableCell>{formatDate(item.created_at)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
