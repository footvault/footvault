"use client"

import { useState, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Eye, Trash2, RotateCcw, Filter, X } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import type { Sale } from "@/lib/types"
import { SaleDetailModal } from "./sale-detail-modal"
import { ConfirmationModal } from "./confirmation-modal"
import { formatCurrency } from "@/lib/utils/currency"
import { useCurrency } from "@/context/CurrencyContext"
import type { DateRange } from "react-day-picker"

interface SalesListProps {
  sales: Sale[]
  onRefunded?: () => void // Optional callback to refresh sales after refund
  onDeleted?: () => void // Optional callback to refresh sales after deletion
}

const SalesList: React.FC<SalesListProps> = ({ sales, onRefunded, onDeleted }) => {
  const { currency } = useCurrency()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
  const [saleToDelete, setSaleToDelete] = useState<string | null>(null)
  const [saleToRefund, setSaleToRefund] = useState<string | null>(null)
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false)
  const [isRefunding, setIsRefunding] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Filter states
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)

  // Handle date range selection
  const handleDateRangeSelect = (range: DateRange | undefined) => {
    setDateRange(range);
  };
  
  const handleRefundClick = (saleId: string) => {
    setSaleToRefund(saleId)
    setIsRefundModalOpen(true)
  }

  const handleConfirmRefund = async () => {
    if (!saleToRefund) return;
    setIsRefunding(true);
    const supabase = createClient();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.error("[Refund Debug] No user session or access token");
        return;
      }
      const res = await fetch("/api/refund-sale", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ saleId: saleToRefund }),
      });
      const result = await res.json();
      console.log("[Refund Debug] API response:", result); // Debug log
      if (result.success) {
        // Optionally log the updated sale status if returned
        if (result.sale) {
          console.log("[Refund Debug] Updated sale:", result.sale);
        }
        // Call parent to refresh sales and wait for it to complete
        if (onRefunded) {
          // Small delay to ensure database changes are propagated
          await new Promise(resolve => setTimeout(resolve, 500));
          await onRefunded(); // Wait for the refresh to complete
        }
      } else {
        console.error("[Refund Debug] Failed:", result.error);
      }
    } catch (err) {
      console.error("[Refund Debug] Error refunding:", err);
    } finally {
      setIsRefunding(false);
      setIsRefundModalOpen(false);
      setSaleToRefund(null);
    }
  }

  const [page, setPage] = useState(1)
  const pageSize = 10
       
  const formatSalesNo = (n: number | null | undefined) => n != null ? `#${n.toString().padStart(3, "0")}` : "#---";

  // Sorting state: by sales_no (default), can toggle asc/desc
  const [sortBy, setSortBy] = useState<'sales_no' | 'date' | 'total' | 'profit'>('sales_no');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Get unique payment types from sales
  const uniquePaymentTypes = useMemo(() => {
    const types = new Set<string>();
    sales.forEach(sale => {
      let paymentType = "";
      if (sale.payment_type && typeof sale.payment_type === "object" && sale.payment_type.name) {
        paymentType = sale.payment_type.name;
      } else if (typeof sale.payment_type === "string" && sale.payment_type.toLowerCase() === "cash") {
        paymentType = "Cash";
      } else if (sale.payment_type_name) {
        paymentType = sale.payment_type_name;
      } else if (!sale.payment_type) {
        paymentType = "Cash";
      } else {
        paymentType = sale.payment_type;
      }
      if (paymentType) types.add(paymentType);
    });
    return Array.from(types).sort();
  }, [sales]);

  // Get unique statuses from sales
  const uniqueStatuses = useMemo(() => {
    const statuses = new Set<string>();
    sales.forEach(sale => {
      if (sale.status) {
        statuses.add(sale.status);
      }
    });
    return Array.from(statuses).sort();
  }, [sales]);

  // Clear all filters
  const clearFilters = () => {
    setPaymentTypeFilter("all");
    setStatusFilter("all");
    setDateRange(undefined);
    setSearchTerm("");
  };

  // Check if any filters are active
  const hasActiveFilters = paymentTypeFilter !== "all" || statusFilter !== "all" || dateRange?.from || dateRange?.to || searchTerm;

  const filteredAndSortedSales = useMemo(() => {
    let filtered = sales;
    
    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((sale) =>
        sale.id.toLowerCase().includes(term) ||
        new Date(sale.sale_date).toLocaleDateString().toLowerCase().includes(term) ||
        sale.customer_name?.toLowerCase().includes(term) ||
        sale.customer_phone?.toLowerCase().includes(term) ||
        sale.items.some((item: any) =>
          item.variant.productName.toLowerCase().includes(term) ||
          item.variant.serialNumber.toLowerCase().includes(term)
        )
      );
    }

    // Payment type filter
    if (paymentTypeFilter !== "all") {
      filtered = filtered.filter((sale) => {
        let paymentType = "";
        if (sale.payment_type && typeof sale.payment_type === "object" && sale.payment_type.name) {
          paymentType = sale.payment_type.name;
        } else if (typeof sale.payment_type === "string" && sale.payment_type.toLowerCase() === "cash") {
          paymentType = "Cash";
        } else if (sale.payment_type_name) {
          paymentType = sale.payment_type_name;
        } else if (!sale.payment_type) {
          paymentType = "Cash";
        } else {
          paymentType = sale.payment_type;
        }
        return paymentType === paymentTypeFilter;
      });
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((sale) => sale.status === statusFilter);
    }

    // Date range filter
    if (dateRange?.from || dateRange?.to) {
      filtered = filtered.filter((sale) => {
        const saleDate = new Date(sale.sale_date);
        const isAfterFrom = !dateRange.from || saleDate >= dateRange.from;
        const isBeforeTo = !dateRange.to || saleDate <= dateRange.to;
        return isAfterFrom && isBeforeTo;
      });
    }

    // Sort by selected column
    return [...filtered].sort((a, b) => {
      if (sortBy === 'sales_no') {
        if (a.sales_no == null && b.sales_no == null) return 0;
        if (a.sales_no == null) return 1;
        if (b.sales_no == null) return -1;
        return sortDir === 'desc' ? b.sales_no - a.sales_no : a.sales_no - b.sales_no;
      } else if (sortBy === 'date') {
        return sortDir === 'desc'
          ? new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime()
          : new Date(a.sale_date).getTime() - new Date(b.sale_date).getTime();
      } else if (sortBy === 'total') {
        return sortDir === 'desc'
          ? (b.total_amount ?? 0) - (a.total_amount ?? 0)
          : (a.total_amount ?? 0) - (b.total_amount ?? 0);
      } else if (sortBy === 'profit') {
        return sortDir === 'desc'
          ? (b.net_profit ?? 0) - (a.net_profit ?? 0)
          : (a.net_profit ?? 0) - (b.net_profit ?? 0);
      }
      return 0;
    });
  }, [sales, searchTerm, paymentTypeFilter, statusFilter, dateRange, sortBy, sortDir]);

  const totalPages = Math.ceil(filteredAndSortedSales.length / pageSize);
  const paginatedSales = filteredAndSortedSales.slice((page - 1) * pageSize, page * pageSize);

  const handleViewDetails = (sale: Sale) => {
    setSelectedSale(sale)
    setIsDetailModalOpen(true)
  }

  const handleDeleteClick = (saleId: string) => {
    setSaleToDelete(saleId)
    setIsConfirmModalOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!saleToDelete) return
    setIsDeleting(true)
    const supabase = createClient()
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        console.error("No user session or access token")
        return
      }
      const res = await fetch("/api/delete-sale", {
        method: "DELETE",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ saleId: saleToDelete }),
      })
      const result = await res.json()
      if (result.success) {
        console.log("Deleted!")
        // Call parent to refresh sales and wait for it to complete
        if (onDeleted) {
          // Small delay to ensure database changes are propagated
          await new Promise(resolve => setTimeout(resolve, 500))
          await onDeleted() // Wait for the refresh to complete
        }
      } else {
        console.error("Failed:", result.error)
      }
    } catch (err) {
      console.error("Error deleting:", err)
    } finally {
      setIsDeleting(false)
      setIsConfirmModalOpen(false)
      setSaleToDelete(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter Controls */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {paginatedSales.length} of {filteredAndSortedSales.length} filtered sales
          </div>
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search sales..."
            className="input"
          />
        </div>

        {/* Filter Row */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Filters:</span>
          </div>

          {/* Payment Type Filter */}
          <Select value={paymentTypeFilter} onValueChange={setPaymentTypeFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Payment Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Payment Types</SelectItem>
              {uniquePaymentTypes.map((type) => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {uniqueStatuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date Range Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-[240px] justify-start text-left font-normal",
                  !dateRange?.from && !dateRange?.to && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "LLL dd, y")} -{" "}
                      {format(dateRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(dateRange.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={handleDateRangeSelect}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="h-8 px-2 lg:px-3"
            >
              <X className="h-4 w-4 mr-1" />
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
            <TableHead className="cursor-pointer select-none" onClick={() => {
                if (sortBy === 'sales_no') setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
                else { setSortBy('sales_no'); setSortDir('desc'); }
              }}>
                Sale #
                {sortBy === 'sales_no' && (
                  <span className="ml-1" style={{ fontWeight: 'bold' }}>{sortDir === 'asc' ? '▲' : '▼'}</span>
                )}
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => {
                if (sortBy === 'date') setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
                else { setSortBy('date'); setSortDir('desc'); }
              }}>
                Date
                {sortBy === 'date' && (
                  <span className="ml-1" style={{ fontWeight: 'bold' }}>{sortDir === 'asc' ? '▲' : '▼'}</span>
                )}
              </TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Payment Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right cursor-pointer select-none" onClick={() => {
                if (sortBy === 'total') setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
                else { setSortBy('total'); setSortDir('desc'); }
              }}>
                Total
                {sortBy === 'total' && (
                  <span className="ml-1" style={{ fontWeight: 'bold' }}>{sortDir === 'asc' ? '▲' : '▼'}</span>
                )}
              </TableHead>
              <TableHead className="text-right cursor-pointer select-none" onClick={() => {
                if (sortBy === 'profit') setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
                else { setSortBy('profit'); setSortDir('desc'); }
              }}>
                Profit
                {sortBy === 'profit' && (
                  <span className="ml-1" style={{ fontWeight: 'bold' }}>{sortDir === 'asc' ? '▲' : '▼'}</span>
                )}
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedSales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-gray-500">
                  {searchTerm ? "No results for that search." : "No sales yet."}
                </TableCell>
              </TableRow>
            ) : (
              paginatedSales.map((sale) => {
                // Use sales_no for Sale #
                const customId = formatSalesNo(sale.sales_no);
                // Payment type name fallback logic
                let paymentTypeName = "";
                if (sale.payment_type && typeof sale.payment_type === "object" && sale.payment_type.name) {
                  paymentTypeName = sale.payment_type.name;
                } else if (typeof sale.payment_type === "string" && sale.payment_type.toLowerCase() === "cash") {
                  paymentTypeName = "Cash";
                } else if (sale.payment_type_name) {
                  paymentTypeName = sale.payment_type_name;
                } else if (!sale.payment_type) {
                  paymentTypeName = "Cash";
                } else {
                  paymentTypeName = sale.payment_type;
                }
                return (
                  <TableRow key={sale.id}>
                    <TableCell className="font-mono text-sm">{customId}</TableCell>
                    <TableCell>{new Date(sale.sale_date).toLocaleDateString()}</TableCell>
                    <TableCell>{sale.customer_name || <span className="text-gray-400 italic">No name</span>}</TableCell>
                    <TableCell>{sale.customer_phone || <span className="text-gray-400 italic">No phone</span>}</TableCell>
                    <TableCell>
                      {sale.items?.length > 0 ? (
                        <ul className="text-sm">
                          {sale.items.slice(0, 2).map((item: any) => (
                            <li key={item.id}>
                              {item.variant.productName} <span className="text-xs text-muted-foreground">(SN: {item.variant.serialNumber})</span>
                            </li>
                          ))}
                          {sale.items.length > 2 && (
                            <div className="text-xs text-muted-foreground">
                              +{sale.items.length - 2} more items
                            </div>
                          )}
                        </ul>
                      ) : (
                        <span className="text-gray-400 italic">No items</span>
                      )}
                    </TableCell>
                    <TableCell>{paymentTypeName}</TableCell>
                    <TableCell>
                      {sale.status ? (
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          sale.status === 'completed' ? 'bg-green-100 text-green-800' :
                          sale.status === 'refunded' ? 'bg-yellow-100 text-yellow-800' :
                          sale.status === 'voided' ? 'bg-gray-200 text-gray-700' :
                          sale.status === 'downpayment' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {sale.status.charAt(0).toUpperCase() + sale.status.slice(1)}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">N/A</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(sale.total_amount, currency)}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${sale.net_profit < 0 ? "text-red-600" : "text-green-600"}`}>
                      {formatCurrency(sale.net_profit, currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="visible">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewDetails(sale)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleRefundClick(sale.id)}
                            className="text-yellow-600"
                          >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Refund Sale
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteClick(sale.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Sale
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="text-sm">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {/* Modals */}
      {selectedSale && (
        <SaleDetailModal
          open={isDetailModalOpen}
          onOpenChange={setIsDetailModalOpen}
          sale={{ ...selectedSale, items: selectedSale.items || [] }}
        />
      )}

      <ConfirmationModal
        open={isRefundModalOpen}
        onOpenChange={setIsRefundModalOpen}
        title="Confirm Refund"
        description="Are you sure you want to refund this sale? This will mark the sale as refunded, return items to inventory, and remove profit distributions. This action cannot be undone."
        onConfirm={handleConfirmRefund}
        isConfirming={isRefunding}
      />
      <ConfirmationModal
        open={isConfirmModalOpen}
        onOpenChange={setIsConfirmModalOpen}
        title="Confirm Deletion"
        description="Are you sure you want to delete this sale? This action cannot be undone."
        onConfirm={handleConfirmDelete}
        isConfirming={isDeleting}
      />
    </div>
  )
}

export default SalesList
