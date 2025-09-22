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
  MoreHorizontal, 
  Eye, 
  Edit, 
  Trash2,
  RotateCcw,
  DollarSign,
  Users,
  TrendingUp,
  Package,
  BarChart3
} from 'lucide-react'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
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
        return <Badge className="bg-green-100 text-green-800">Active</Badge>
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>
      case 'suspended':
        return <Badge variant="destructive">Suspended</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1 bg-white md:bg-transparent" />
        <Separator orientation="vertical" className="mr-2 h-4 hidden md:block" />
        <h1 className="text-xl font-semibold">Consignors</h1>
      </header>
      <div className="w-full px-2 py-8">
        <div className="container py-8 w-full">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-muted-foreground">
                  Manage your consignment partners and track their inventory
                </p>
              </div>
            </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Consignors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.total_consignors}</div>
            <p className="text-xs text-muted-foreground">
              {summaryStats.active_consignors} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currencySymbol}{summaryStats.total_sales_amount.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              All-time consignment sales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payouts</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currencySymbol}{summaryStats.total_pending_payouts.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting payment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summaryStats.total_variants}
            </div>
            <p className="text-xs text-muted-foreground">
              {summaryStats.available_variants} available • {summaryStats.sold_variants} sold
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Consignor List</CardTitle>
          <CardDescription>
            Manage your consignment partners and view their performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search consignors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by status" />
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
                className="whitespace-nowrap"
              >
                {showArchived ? "Show Active" : "Show Archived"}
              </Button>
            )}
            <Button 
              variant="outline"
              onClick={() => router.push('/consignors/sales')}
              className="whitespace-nowrap"
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              View Sales
            </Button>
            <Button onClick={() => setAddModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add New Consignor
            </Button>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Sales</TableHead>
                  <TableHead>Pending Payout</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[70px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Loading consignors...
                    </TableCell>
                  </TableRow>
                ) : filteredConsignors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="text-muted-foreground">
                        <Users className="mx-auto h-8 w-8 mb-2" />
                        <p>No consignors found</p>
                        <p className="text-sm">Add your first consignor to get started</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredConsignors.map((consignor) => (
                    <TableRow key={consignor.id}>
                      <TableCell className="font-medium">
                        {consignor.name}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{consignor.email || '-'}</div>
                          <div className="text-muted-foreground">{consignor.phone || '-'}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {consignor.commission_rate}%
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{consignor.available_variants} available</div>
                          <div className="text-muted-foreground">{consignor.total_variants} total</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{currencySymbol}{(consignor.total_sales_amount || 0).toFixed(2)}</div>
                          <div className="text-muted-foreground">{consignor.total_sales} sales</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {currencySymbol}{(consignor.pending_payout || 0).toFixed(2)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(consignor.status)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setViewModal({ open: true, consignor })}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setItemsModal({ open: true, consignor })}>
                              <Package className="mr-2 h-4 w-4" />
                              View Items
                            </DropdownMenuItem>
                            {(consignor.pending_payout || 0) > 0 && (
                              <DropdownMenuItem onClick={() => setPayoutModal({ open: true, consignor })}>
                                <DollarSign className="mr-2 h-4 w-4" />
                                Process Payout
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => setEditModal({ open: true, consignor })}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            {showArchived && (
                              <DropdownMenuItem 
                                onClick={() => setPermanentDeleteModal({ open: true, consignor })}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Permanently
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              onClick={() => setDeleteModal({ open: true, consignor })}
                              className={showArchived ? "text-green-600" : "text-red-600"}
                            >
                              {showArchived ? (
                                <RotateCcw className="mr-2 h-4 w-4" />
                              ) : (
                                <Trash2 className="mr-2 h-4 w-4" />
                              )}
                              {showArchived ? "Restore" : "Archive"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

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
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Consignor Details - {viewModal.consignor.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p>{viewModal.consignor.email || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Phone</label>
                  <p>{viewModal.consignor.phone || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Commission Rate</label>
                  <p>{viewModal.consignor.commission_rate}%</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div className="mt-1">{getStatusBadge(viewModal.consignor.status)}</div>
                </div>
              </div>

              {/* Performance Stats */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Inventory</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Items:</span>
                      <span className="font-medium">{viewModal.consignor.total_variants}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Available:</span>
                      <span className="font-medium">{viewModal.consignor.available_variants}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Products:</span>
                      <span className="font-medium">{viewModal.consignor.total_products}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Sales & Payouts</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Sales:</span>
                      <span className="font-medium">{currencySymbol}{(viewModal.consignor.total_sales_amount || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Earned:</span>
                      <span className="font-medium">{currencySymbol}{(viewModal.consignor.total_earned || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pending Payout:</span>
                      <span className="font-medium text-orange-600">{currencySymbol}{(viewModal.consignor.pending_payout || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Paid Out:</span>
                      <span className="font-medium text-green-600">{currencySymbol}{(viewModal.consignor.paid_out || 0).toFixed(2)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t">
                {(viewModal.consignor.pending_payout || 0) > 0 && (
                  <Button 
                    onClick={() => {
                      setPayoutModal({ open: true, consignor: viewModal.consignor })
                      setViewModal({ open: false })
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <DollarSign className="mr-2 h-4 w-4" />
                    Process Payout ({currencySymbol}{(viewModal.consignor.pending_payout || 0).toFixed(2)})
                  </Button>
                )}
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
                      // Fallback for older browsers
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
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Share Portal Link
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
          </div>
        </div>
      </div>
    </SidebarInset>
  )
}