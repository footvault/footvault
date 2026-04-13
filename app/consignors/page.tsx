"use client"

import { useState, useEffect, useCallback } from 'react'
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
  MoreHorizontal, 
  Eye, 
  Edit, 
  Trash2,
  RotateCcw,
  DollarSign,
  Users,
  TrendingUp,
  Package,
  BarChart3,
  Archive,
  ArrowUpRight,
  Wallet,
  ShoppingBag
} from 'lucide-react'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'
import { useCurrency } from '@/context/CurrencyContext'
import { getCurrencySymbol } from '@/lib/utils/currency'
import { ConsignorDashboardStats, Consignor } from '@/lib/types/consignor'
import { AddConsignorModal } from '@/components/add-consignor-modal' 
import { EditConsignorModal } from '@/components/edit-consignor-modal' 
import { ProcessPayoutModal } from '@/components/process-payout-modal'
import { ConsignorItemsModal } from '@/components/consignor-items-modal'
import { ConfirmationModal } from '@/components/confirmation-modal'

export default function ConsignorsPage() {
  const [consignors, setConsignors] = useState<ConsignorDashboardStats[]>([])
  const [summaryStats, setSummaryStats] = useState({
    total_consignors: 0,
    active_consignors: 0,
    total_sales_amount: 0,
    total_pending_payouts: 0,
    total_paid_payouts: 0,
    total_variants: 0,
    available_variants: 0,
    sold_variants: 0
  })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showArchived, setShowArchived] = useState(false)
  const [hasArchivedConsignors, setHasArchivedConsignors] = useState(false)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editModal, setEditModal] = useState<{ open: boolean; consignor?: ConsignorDashboardStats }>({ open: false })
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; consignor?: ConsignorDashboardStats }>({ open: false })
  const [permanentDeleteModal, setPermanentDeleteModal] = useState<{ open: boolean; consignor?: ConsignorDashboardStats }>({ open: false })
  const [viewModal, setViewModal] = useState<{ open: boolean; consignor?: ConsignorDashboardStats }>({ open: false })
  const [payoutModal, setPayoutModal] = useState<{ open: boolean; consignor?: ConsignorDashboardStats }>({ open: false })
  const [itemsModal, setItemsModal] = useState<{ open: boolean; consignor?: ConsignorDashboardStats }>({ open: false })
  const [lastFetchTime, setLastFetchTime] = useState<number>(0)

  const router = useRouter()
  const { currency } = useCurrency()
  const currencySymbol = getCurrencySymbol(currency)
  const supabase = createClient()

  useEffect(() => {
    // Debounce the fetch to avoid excessive API calls
    const timeoutId = setTimeout(() => {
      fetchConsignors()
      if (!showArchived) {
        checkArchivedConsignors()
      }
    }, 500); // 500ms debounce
    
    return () => clearTimeout(timeoutId);
  }, [searchTerm, statusFilter, showArchived, lastFetchTime])

  const fetchConsignors = async () => {
    // Only fetch if it's been more than 30 seconds since last fetch
    const now = Date.now();
    if (now - lastFetchTime < 30000) return;
    
    try {
      setLoading(true)
      console.time('fetchConsignors');
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        toast({
          title: "Authentication Error",
          description: "Please log in to view consignors.",
          variant: "destructive",
        })
        return
      }

      // Use the new stats API
      const response = await fetch(`/api/consignors/stats?archived=${showArchived}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('API Error:', response.status, errorText)
        throw new Error(`Failed to fetch consignor stats: ${response.status} ${errorText}`)
      }

      const result = await response.json()
      console.log('✅ Consignors with stats loaded:', result)

      setConsignors(result.consignors || [])
      setSummaryStats(result.summary || {})
      setLastFetchTime(now);
    } catch (error) {
      console.error('❌ Error fetching consignors:', error)
      toast({
        title: "Error",
        description: "Failed to load consignors. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      console.timeEnd('fetchConsignors');
    }
  }

  const checkArchivedConsignors = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        return
      }

      // Check if there are any archived consignors
      const response = await fetch(`/api/consignors/stats?archived=true`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (response.ok) {
        const result = await response.json()
        setHasArchivedConsignors((result.consignors || []).length > 0)
      }
    } catch (error) {
      console.error('Error checking archived consignors:', error)
    }
  }

  const handleDeleteConsignor = async () => {
    if (!deleteModal.consignor) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch(`/api/consignors/${deleteModal.consignor.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete consignor')
      }

      toast({
        title: "Success",
        description: "Consignor archived successfully.",
      })

      fetchConsignors()
      setDeleteModal({ open: false })

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleRestoreConsignor = async () => {
    if (!deleteModal.consignor) return

    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        toast({
          title: "Authentication Error",
          description: "Please log in to restore consignors.",
          variant: "destructive",
        })
        return
      }

      const response = await fetch(`/api/consignors/${deleteModal.consignor.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'restore' }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to restore consignor')
      }

      toast({
        title: "Success",
        description: "Consignor restored successfully.",
      })

      setDeleteModal({ open: false })
      fetchConsignors()

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handlePermanentDeleteConsignor = async () => {
    if (!permanentDeleteModal.consignor) return

    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        toast({
          title: "Authentication Error",
          description: "Please log in to delete consignors.",
          variant: "destructive",
        })
        return
      }

      const response = await fetch(`/api/consignors/${permanentDeleteModal.consignor.id}?permanent=true`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to permanently delete consignor')
      }

      toast({
        title: "Success",
        description: "Consignor permanently deleted. Connected shoes are now owned by the store.",
      })

      setPermanentDeleteModal({ open: false })
      fetchConsignors()

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  // Filter consignors based on search and status
  const filteredConsignors = consignors.filter(consignor => {
    const matchesSearch = !searchTerm || 
      consignor.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      consignor.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      consignor.phone?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || consignor.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">Active</Badge>
      case 'inactive':
        return <Badge className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700">Inactive</Badge>
      case 'suspended':
        return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800">Suspended</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getPayoutMethodLabel = (consignor: ConsignorDashboardStats) => {
    if (consignor.payout_method === 'cost_price') return 'Cost Only'
    if (consignor.payout_method === 'cost_plus_fixed') return `Cost + ${currencySymbol}${consignor.fixed_markup || 0}`
    if (consignor.payout_method === 'cost_plus_percentage') return `Cost + ${consignor.markup_percentage || 0}%`
    return '% Split'
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
      'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',
      'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
      'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400',
      'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-400',
    ]
    const index = name.charCodeAt(0) % colors.length
    return colors[index]
  }

  return (
    <SidebarInset>
      {/* Sticky Header */}
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 sticky top-0 z-20 bg-background/95 backdrop-blur-sm">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4 hidden md:block" />
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold">Consignors</h1>
            {!loading && (
              <Badge variant="secondary" className="animate-in fade-in duration-300 text-xs">
                {filteredConsignors.length} {showArchived ? 'archived' : 'total'}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline"
              size="sm"
              onClick={() => router.push('/consignors/sales')}
              className="hidden sm:flex transition-colors duration-200"
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              View Sales
            </Button>
            <Button size="sm" onClick={() => setAddModalOpen(true)} className="transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]">
              <Plus className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Add Consignor</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="w-full px-4 sm:px-6 py-6">
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Stats Cards */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <Card className="animate-in fade-in duration-300 transition-all hover:shadow-md group" style={{ animationDelay: '0ms' }}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                    <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  {summaryStats.active_consignors > 0 && (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-0.5">
                      <ArrowUpRight className="h-3 w-3" />
                      {summaryStats.active_consignors} active
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground font-medium">Total Consignors</p>
                <p className="text-2xl font-bold tracking-tight mt-0.5">{summaryStats.total_consignors}</p>
              </CardContent>
            </Card>

            <Card className="animate-in fade-in duration-300 transition-all hover:shadow-md group" style={{ animationDelay: '50ms' }}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                    <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground font-medium">Total Sales</p>
                <p className="text-2xl font-bold tracking-tight mt-0.5">{currencySymbol}{summaryStats.total_sales_amount.toFixed(2)}</p>
              </CardContent>
            </Card>

            <Card className="animate-in fade-in duration-300 transition-all hover:shadow-md group" style={{ animationDelay: '100ms' }}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                    <Wallet className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  {summaryStats.total_pending_payouts > 0 && (
                    <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Awaiting</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground font-medium">Pending Payouts</p>
                <p className="text-2xl font-bold tracking-tight mt-0.5">{currencySymbol}{summaryStats.total_pending_payouts.toFixed(2)}</p>
              </CardContent>
            </Card>

            <Card className="animate-in fade-in duration-300 transition-all hover:shadow-md group" style={{ animationDelay: '150ms' }}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="h-10 w-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                    <ShoppingBag className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground font-medium">Total Items</p>
                <p className="text-2xl font-bold tracking-tight mt-0.5">{summaryStats.total_variants}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {summaryStats.available_variants} available · {summaryStats.sold_variants} sold
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Filters & Search Bar */}
          <div className="flex flex-col sm:flex-row gap-3 animate-in fade-in duration-300" style={{ animationDelay: '200ms' }}>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 transition-shadow duration-200 focus:shadow-md"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[160px] h-10">
                <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
            {(hasArchivedConsignors || showArchived) && (
              <Button
                variant={showArchived ? "default" : "outline"}
                onClick={() => setShowArchived(!showArchived)}
                className="whitespace-nowrap h-10 transition-all duration-200"
                size="sm"
              >
                <Archive className="mr-2 h-4 w-4" />
                {showArchived ? "Show Active" : "Archived"}
              </Button>
            )}
            <Button 
              variant="outline"
              size="sm"
              onClick={() => router.push('/consignors/sales')}
              className="sm:hidden h-10"
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              Sales
            </Button>
          </div>

          {/* Main Content */}
          <div className="animate-in fade-in duration-300" style={{ animationDelay: '250ms' }}>
            {loading ? (
              /* Loading Skeleton */
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-xl border bg-card animate-pulse" style={{ animationDelay: `${i * 75}ms` }}>
                    <div className="h-10 w-10 rounded-full bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-32 bg-muted rounded" />
                      <div className="h-3 w-48 bg-muted rounded" />
                    </div>
                    <div className="hidden md:flex gap-8">
                      <div className="h-4 w-16 bg-muted rounded" />
                      <div className="h-4 w-20 bg-muted rounded" />
                      <div className="h-4 w-16 bg-muted rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredConsignors.length === 0 ? (
              /* Empty State */
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                    <Users className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-1">No consignors found</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mb-6">
                    {searchTerm || statusFilter !== 'all' 
                      ? 'Try adjusting your search or filters to find what you\'re looking for.'
                      : 'Add your first consignment partner to start tracking inventory and payouts.'}
                  </p>
                  {!searchTerm && statusFilter === 'all' && (
                    <Button onClick={() => setAddModalOpen(true)} className="transition-all duration-200 hover:scale-[1.02]">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Your First Consignor
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block">
                  <Card>
                    <div className="rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50 hover:bg-muted/50">
                            <TableHead className="font-semibold">Consignor</TableHead>
                            <TableHead className="font-semibold">Commission</TableHead>
                            <TableHead className="font-semibold">Payout Method</TableHead>
                            <TableHead className="font-semibold">Items</TableHead>
                            <TableHead className="font-semibold">Sales</TableHead>
                            <TableHead className="font-semibold">Pending Payout</TableHead>
                            <TableHead className="font-semibold">Status</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredConsignors.map((consignor, index) => (
                            <TableRow 
                              key={consignor.id} 
                              className="group cursor-pointer transition-colors duration-150 hover:bg-muted/30"
                              onClick={() => setViewModal({ open: true, consignor })}
                              style={{ animationDelay: `${index * 30}ms` }}
                            >
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-transform duration-200 group-hover:scale-105 ${getAvatarColor(consignor.name)}`}>
                                    {getInitials(consignor.name)}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-medium truncate">{consignor.name}</p>
                                    <p className="text-xs text-muted-foreground truncate">{consignor.email || consignor.phone || 'No contact'}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="font-medium">{consignor.commission_rate}%</span>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="font-normal text-xs">
                                  {getPayoutMethodLabel(consignor)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <span className="font-medium">{consignor.available_variants}</span>
                                  <span className="text-muted-foreground"> / {consignor.total_variants}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <p className="font-medium">{currencySymbol}{(consignor.total_sales_amount || 0).toFixed(2)}</p>
                                  <p className="text-xs text-muted-foreground">{consignor.total_sales} sales</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className={`font-semibold ${(consignor.pending_payout || 0) > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
                                  {currencySymbol}{(consignor.pending_payout || 0).toFixed(2)}
                                </span>
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(consignor.status)}
                              </TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setViewModal({ open: true, consignor }) }}>
                                      <Eye className="mr-2 h-4 w-4" />
                                      View Details
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setItemsModal({ open: true, consignor }) }}>
                                      <Package className="mr-2 h-4 w-4" />
                                      View Items
                                    </DropdownMenuItem>
                                    {(consignor.pending_payout || 0) > 0 && (
                                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setPayoutModal({ open: true, consignor }) }}>
                                        <DollarSign className="mr-2 h-4 w-4" />
                                        Process Payout
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditModal({ open: true, consignor }) }}>
                                      <Edit className="mr-2 h-4 w-4" />
                                      Edit
                                    </DropdownMenuItem>
                                    {showArchived && (
                                      <DropdownMenuItem 
                                        onClick={(e) => { e.stopPropagation(); setPermanentDeleteModal({ open: true, consignor }) }}
                                        className="text-red-600 dark:text-red-400"
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete Permanently
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem 
                                      onClick={(e) => { e.stopPropagation(); setDeleteModal({ open: true, consignor }) }}
                                      className={showArchived ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}
                                    >
                                      {showArchived ? <RotateCcw className="mr-2 h-4 w-4" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                      {showArchived ? "Restore" : "Archive"}
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </Card>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-3">
                  {filteredConsignors.map((consignor, index) => (
                    <Card 
                      key={consignor.id} 
                      className="animate-in fade-in duration-300 transition-all hover:shadow-md active:scale-[0.99] cursor-pointer"
                      style={{ animationDelay: `${index * 40}ms` }}
                      onClick={() => setViewModal({ open: true, consignor })}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${getAvatarColor(consignor.name)}`}>
                              {getInitials(consignor.name)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold truncate">{consignor.name}</p>
                                {getStatusBadge(consignor.status)}
                              </div>
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {consignor.email || consignor.phone || 'No contact info'}
                              </p>
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setViewModal({ open: true, consignor }) }}>
                                <Eye className="mr-2 h-4 w-4" />View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setItemsModal({ open: true, consignor }) }}>
                                <Package className="mr-2 h-4 w-4" />View Items
                              </DropdownMenuItem>
                              {(consignor.pending_payout || 0) > 0 && (
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setPayoutModal({ open: true, consignor }) }}>
                                  <DollarSign className="mr-2 h-4 w-4" />Process Payout
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditModal({ open: true, consignor }) }}>
                                <Edit className="mr-2 h-4 w-4" />Edit
                              </DropdownMenuItem>
                              {showArchived && (
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setPermanentDeleteModal({ open: true, consignor }) }} className="text-red-600 dark:text-red-400">
                                  <Trash2 className="mr-2 h-4 w-4" />Delete Permanently
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem 
                                onClick={(e) => { e.stopPropagation(); setDeleteModal({ open: true, consignor }) }}
                                className={showArchived ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}
                              >
                                {showArchived ? <RotateCcw className="mr-2 h-4 w-4" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                {showArchived ? "Restore" : "Archive"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Mobile stats row */}
                        <div className="grid grid-cols-3 gap-3 mt-4 pt-3 border-t">
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Items</p>
                            <p className="text-sm font-semibold mt-0.5">{consignor.available_variants} <span className="text-muted-foreground font-normal">/ {consignor.total_variants}</span></p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Sales</p>
                            <p className="text-sm font-semibold mt-0.5">{currencySymbol}{(consignor.total_sales_amount || 0).toFixed(0)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Pending</p>
                            <p className={`text-sm font-semibold mt-0.5 ${(consignor.pending_payout || 0) > 0 ? 'text-amber-600 dark:text-amber-400' : ''}`}>
                              {currencySymbol}{(consignor.pending_payout || 0).toFixed(0)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Results count */}
                <p className="text-xs text-muted-foreground text-center pt-2">
                  Showing {filteredConsignors.length} consignor{filteredConsignors.length !== 1 ? 's' : ''}
                  {(searchTerm || statusFilter !== 'all') && ' (filtered)'}
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Add Consignor Modal */}
      <AddConsignorModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        onConsignorAdded={fetchConsignors}
      />

      {/* Edit Consignor Modal */}
      <EditConsignorModal
        open={editModal.open}
        consignor={editModal.consignor as unknown as Consignor}
        onOpenChange={(open: boolean) => setEditModal({ open, consignor: open ? editModal.consignor : undefined })}
        onConsignorUpdated={fetchConsignors}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        open={deleteModal.open}
        onOpenChange={(open) => setDeleteModal({ open, consignor: open ? deleteModal.consignor : undefined })}
        title={showArchived ? "Restore Consignor" : "Archive Consignor"}
        description={showArchived 
          ? `Are you sure you want to restore "${deleteModal.consignor?.name}"? This will make them active again and visible in the main list.`
          : `Are you sure you want to archive "${deleteModal.consignor?.name}"? This will hide them from the active list but preserve all sales history.`
        }
        isConfirming={false}
        onConfirm={showArchived ? handleRestoreConsignor : handleDeleteConsignor}
      />

      {/* Permanent Delete Confirmation Modal */}
      <ConfirmationModal
        open={permanentDeleteModal.open}
        onOpenChange={(open) => setPermanentDeleteModal({ open, consignor: open ? permanentDeleteModal.consignor : undefined })}
        title="Permanently Delete Consignor"
        description={`Are you sure you want to permanently delete "${permanentDeleteModal.consignor?.name}"? This action cannot be undone. All connected shoes will be transferred to store ownership, but sales history will be preserved.`}
        isConfirming={false}
        onConfirm={handlePermanentDeleteConsignor}
      />

      {/* View Consignor Details Modal */}
      {viewModal.open && viewModal.consignor && (
        <Dialog open={viewModal.open} onOpenChange={(open) => setViewModal({ open, consignor: open ? viewModal.consignor : undefined })}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className={`h-12 w-12 rounded-full flex items-center justify-center text-sm font-bold ${getAvatarColor(viewModal.consignor.name)}`}>
                  {getInitials(viewModal.consignor.name)}
                </div>
                <div>
                  <DialogTitle className="text-xl">{viewModal.consignor.name}</DialogTitle>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {viewModal.consignor.email || viewModal.consignor.phone || 'No contact info'}
                  </p>
                </div>
              </div>
            </DialogHeader>
            <div className="space-y-5 mt-2">
              {/* Quick Info Badges */}
              <div className="flex flex-wrap gap-2">
                {getStatusBadge(viewModal.consignor.status)}
                <Badge variant="outline" className="text-xs">
                  {viewModal.consignor.commission_rate}% commission
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {getPayoutMethodLabel(viewModal.consignor)}
                </Badge>
              </div>

              {/* Contact Details */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-muted/50">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Email</p>
                  <p className="text-sm font-medium mt-1">{viewModal.consignor.email || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Phone</p>
                  <p className="text-sm font-medium mt-1">{viewModal.consignor.phone || 'Not provided'}</p>
                </div>
              </div>

              {/* Performance Stats */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="border-0 bg-muted/30">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <p className="text-sm font-semibold">Inventory</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Total Items</span>
                        <span className="text-sm font-semibold">{viewModal.consignor.total_variants}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Available</span>
                        <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{viewModal.consignor.available_variants}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Products</span>
                        <span className="text-sm font-semibold">{viewModal.consignor.total_products}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 bg-muted/30">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      <p className="text-sm font-semibold">Sales & Payouts</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Total Sales</span>
                        <span className="text-sm font-semibold">{currencySymbol}{(viewModal.consignor.total_sales_amount || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Total Earned</span>
                        <span className="text-sm font-semibold">{currencySymbol}{(viewModal.consignor.total_earned || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Pending</span>
                        <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">{currencySymbol}{(viewModal.consignor.pending_payout || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Paid Out</span>
                        <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{currencySymbol}{(viewModal.consignor.paid_out || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 pt-4 border-t">
                {(viewModal.consignor.pending_payout || 0) > 0 && (
                  <Button 
                    onClick={() => {
                      setPayoutModal({ open: true, consignor: viewModal.consignor })
                      setViewModal({ open: false })
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 transition-colors duration-200"
                  >
                    <DollarSign className="mr-2 h-4 w-4" />
                    Process Payout ({currencySymbol}{(viewModal.consignor.pending_payout || 0).toFixed(2)})
                  </Button>
                )}
                <Button 
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation()
                    setItemsModal({ open: true, consignor: viewModal.consignor })
                    setViewModal({ open: false })
                  }}
                  className="transition-colors duration-200"
                >
                  <Package className="mr-2 h-4 w-4" />
                  View Items
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    const consignor = viewModal.consignor
                    if (!consignor) return
                    
                    if (!consignor.portal_password) {
                      toast({
                        title: "Portal Not Configured",
                        description: "This consignor doesn't have portal access configured. Please edit their details to add a portal password.",
                        variant: "destructive",
                      })
                      return
                    }
                    
                    const portalUrl = `${window.location.origin}/consignors/portal?id=${consignor.id}`
                    
                    navigator.clipboard.writeText(portalUrl).then(() => {
                      toast({
                        title: "Portal Link Copied",
                        description: `Portal link has been copied to clipboard. Share this link with ${consignor.name} along with their password.`,
                      })
                    }).catch(() => {
                      const textArea = document.createElement('textarea')
                      textArea.value = portalUrl
                      document.body.appendChild(textArea)
                      textArea.select()
                      document.execCommand('copy')
                      document.body.removeChild(textArea)
                      
                      toast({
                        title: "Portal Link Ready",
                        description: `Portal link: ${portalUrl}`,
                      })
                    })
                  }}
                  className="transition-colors duration-200"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Share Portal Link
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setEditModal({ open: true, consignor: viewModal.consignor })
                    setViewModal({ open: false })
                  }}
                  className="transition-colors duration-200"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Process Payout Modal */}
      <ProcessPayoutModal
        open={payoutModal.open}
        onOpenChange={(open) => setPayoutModal({ open })}
        consignor={payoutModal.consignor || null}
        onPayoutProcessed={fetchConsignors}
      />

      {/* Consignor Items Modal */}
      <ConsignorItemsModal
        open={itemsModal.open}
        onOpenChange={(open) => setItemsModal({ open, consignor: open ? itemsModal.consignor : undefined })}
        consignor={itemsModal.consignor ? { id: itemsModal.consignor.id.toString(), name: itemsModal.consignor.name } : null}
      />
    </SidebarInset>
  )
}