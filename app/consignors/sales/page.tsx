"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  Plus, 
  Search, 
  Filter, 
  Download,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  ArrowLeft
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'
import { useCurrency } from '@/context/CurrencyContext'
import { getCurrencySymbol } from '@/lib/utils/currency'
import { ConsignmentSale, Consignor } from '@/lib/types/consignor'

export default function ConsignmentSalesPage() {
  const [sales, setSales] = useState<ConsignmentSale[]>([])
  const [consignors, setConsignors] = useState<Consignor[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [consignorFilter, setConsignorFilter] = useState('all')
  const [payoutStatusFilter, setPayoutStatusFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const { currency } = useCurrency()
  const currencySymbol = getCurrencySymbol(currency)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [consignorFilter, payoutStatusFilter, dateFrom, dateTo])

  const fetchData = async () => {
    try {
      setLoading(true)
      await Promise.all([fetchSales(), fetchConsignors()])
    } catch (error) {
      console.error('Error fetching data:', error)
      toast({
        title: "Error",
        description: "Failed to load consignment data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchSales = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        console.warn('No session found')
        return
      }

      const params = new URLSearchParams()
      if (consignorFilter !== 'all') params.append('consignor_id', consignorFilter)
      if (payoutStatusFilter !== 'all') params.append('payout_status', payoutStatusFilter)
      if (dateFrom) params.append('date_from', dateFrom)
      if (dateTo) params.append('date_to', dateTo)
      params.append('limit', '100')

      const response = await fetch(`/api/consignment-sales?${params}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('API Error:', response.status, errorText)
        let errorMessage = `Failed to fetch consignment sales: ${response.status}`
        try {
          const errorData = JSON.parse(errorText)
          if (errorData.error) {
            errorMessage = errorData.error
          }
        } catch (e) {
          // If not JSON, use the raw text
          if (errorText) {
            errorMessage = errorText
          }
        }
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        })
        return
      }

      const data = await response.json()
      setSales(data.sales || [])

    } catch (error) {
      console.error('Error fetching sales:', error)
      toast({
        title: "Error",
        description: "Failed to fetch consignment sales. Please try again.",
        variant: "destructive",
      })
    }
  }

  const fetchConsignors = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        return
      }

      const response = await fetch('/api/consignors?limit=100', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch consignors')
      }

      const data = await response.json()
      setConsignors(data.consignors || [])

    } catch (error) {
      console.error('Error fetching consignors:', error)
      throw error
    }
  }

  // Filter sales by search term
  const filteredSales = sales.filter(sale => {
    if (!searchTerm) return true
    
    const searchLower = searchTerm.toLowerCase()
    return (
      sale.consignor?.name.toLowerCase().includes(searchLower) ||
      sale.variant?.product?.name.toLowerCase().includes(searchLower) ||
      sale.variant?.product?.brand.toLowerCase().includes(searchLower) ||
      sale.variant?.product?.sku.toLowerCase().includes(searchLower)
    )
  })

  // Calculate stats
  const totalSales = filteredSales.length
  const totalAmount = filteredSales.reduce((sum, sale) => sum + sale.sale_price, 0)
  const totalCommission = filteredSales.reduce((sum, sale) => sum + sale.store_commission, 0)
  const paidSales = filteredSales.filter(sale => sale.payout_status === 'paid')
  const totalPayout = paidSales.reduce((sum, sale) => sum + sale.consignor_payout, 0) // Only count paid payouts
  const pendingSales = filteredSales.filter(sale => sale.payout_status === 'pending')
  const pendingPayout = pendingSales.reduce((sum, sale) => sum + sale.consignor_payout, 0)

  const getPayoutStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>
      case 'paid':
        return <Badge className="bg-green-100 text-green-800">Paid</Badge>
      case 'disputed':
        return <Badge variant="destructive">Disputed</Badge>
      case 'cancelled':
        return <Badge variant="outline">Cancelled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const handleExportCSV = () => {
    const csvData = filteredSales.map(sale => ({
      'Sale Date': new Date(sale.created_at).toLocaleDateString(),
      'Consignor': sale.consignor?.name || '',
      'Product': sale.variant?.product?.name || '',
      'Brand': sale.variant?.product?.brand || '',
      'SKU': sale.variant?.product?.sku || '',
      'Size': sale.variant?.size || '',
      'Sale Price': sale.sale_price,
      'Commission Rate': `${sale.commission_rate}%`,
      'Commission Amount': sale.store_commission,
      'Consignor Payout': sale.consignor_payout,
      'Payout Status': sale.payout_status,
      'Payout Date': sale.payout_date || ''
    }))

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `consignment-sales-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1 bg-white md:bg-transparent" />
        <Separator orientation="vertical" className="mr-2 h-4 hidden md:block" />
        <h1 className="text-xl font-semibold">Consignment Sales</h1>
      </header>
      <div className="max-w-7xl mx-auto px-2 py-8 w-full">
        <div className="container mx-auto py-8">
          <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 gap-4">
            <div>
              <p className="text-muted-foreground">
                Track all consignment sales and manage payouts
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.push('/consignors')} className="w-full sm:w-auto">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Consignors
              </Button>
              <Button variant="outline" onClick={handleExportCSV} className="w-full sm:w-auto">
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSales}</div>
            <p className="text-xs text-muted-foreground">
              {currencySymbol}{totalAmount.toFixed(2)} total value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commission Earned</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currencySymbol}{totalCommission.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Store revenue from consignments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payouts</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currencySymbol}{pendingPayout.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {pendingSales.length} sales awaiting payout
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payouts</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currencySymbol}{totalPayout.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Paid to consignors
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Consignment Sales</CardTitle>
          <CardDescription>
            View and manage all consignment sales transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by consignor, product, brand, or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={consignorFilter} onValueChange={setConsignorFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter by consignor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Consignors</SelectItem>
                {consignors.map((consignor) => (
                  <SelectItem key={consignor.id} value={consignor.id.toString()}>
                    {consignor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={payoutStatusFilter} onValueChange={setPayoutStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="disputed">Disputed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">From Date</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full sm:w-[160px]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">To Date</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full sm:w-[160px]"
              />
            </div>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sale Date</TableHead>
                    <TableHead>Consignor</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="hidden sm:table-cell">Size</TableHead>
                    <TableHead>Sale Price</TableHead>
                    <TableHead className="hidden md:table-cell">Commission</TableHead>
                    <TableHead className="hidden lg:table-cell">Payout</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden lg:table-cell">Payout Date</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      Loading consignment sales...
                    </TableCell>
                  </TableRow>
                ) : filteredSales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <div className="text-muted-foreground">
                        <TrendingUp className="mx-auto h-8 w-8 mb-2" />
                        <p>No consignment sales found</p>
                        <p className="text-sm">Sales from consignment products will appear here</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell>
                        {new Date(sale.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-medium">
                        {sale.consignor?.name || 'Unknown'}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{sale.variant?.product?.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {sale.variant?.product?.brand} - {sale.variant?.product?.sku}
                          </div>
                          {/* Show size on mobile when size column is hidden */}
                          <div className="text-xs text-muted-foreground sm:hidden mt-1">
                            Size: {sale.variant?.size_label} {sale.variant?.size}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {sale.variant?.size_label} {sale.variant?.size}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div>{currencySymbol}{sale.sale_price.toFixed(2)}</div>
                          {/* Show commission on mobile when commission column is hidden */}
                          <div className="text-xs text-muted-foreground md:hidden">
                            Commission: {currencySymbol}{sale.store_commission.toFixed(2)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div>
                          <div>{currencySymbol}{sale.store_commission.toFixed(2)}</div>
                          <div className="text-xs text-muted-foreground">
                            {sale.commission_rate}%
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {currencySymbol}{sale.consignor_payout.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div>{getPayoutStatusBadge(sale.payout_status)}</div>
                          {/* Show payout amount on mobile when payout column is hidden */}
                          <div className="text-xs text-muted-foreground lg:hidden mt-1">
                            Payout: {currencySymbol}{sale.consignor_payout.toFixed(2)}
                          </div>
                          {/* Show payout date on mobile when payout date column is hidden */}
                          <div className="text-xs text-muted-foreground lg:hidden">
                            {sale.payout_date ? `Paid: ${new Date(sale.payout_date).toLocaleDateString()}` : 'Not paid'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {sale.payout_date ? new Date(sale.payout_date).toLocaleDateString() : '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            </div>
          </div>
        </CardContent>
      </Card>
          </div>
        </div>
      </div>
    </SidebarInset>
  )
}
