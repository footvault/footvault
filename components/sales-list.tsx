"use client"

import { useState, useMemo, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { MoreHorizontal, Eye, Trash2, RotateCcw, Filter, X, Search, Printer, Download, Star, Lock, Check } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import type { Sale } from "@/lib/types"
import { SaleDetailModal } from "./sale-detail-modal"
import { ConfirmationModal } from "./confirmation-modal"
import { ReceiptGenerator } from "./receipt-generator"
import { formatCurrency } from "@/lib/utils/currency"
import { useCurrency } from "@/context/CurrencyContext"
import { useTimezone } from "@/context/TimezoneContext"
import type { DateRange } from "react-day-picker"
import { useToast } from "@/hooks/use-toast"
import PremiumFeatureModal from "@/components/PremiumFeatureModal"

interface SalesListProps {
  sales: Sale[]
  onRefunded?: () => void
  onDeleted?: () => void
  onCompleted?: () => void
  onVoided?: () => void
}

const SalesList: React.FC<SalesListProps> = ({ sales, onRefunded, onDeleted, onCompleted, onVoided }) => {
  const { currency } = useCurrency()
  const { formatDateInTimezone } = useTimezone()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
  const [saleToDelete, setSaleToDelete] = useState<string | null>(null)
  const [saleToRefund, setSaleToRefund] = useState<string | null>(null)
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false)
  const [isRefunding, setIsRefunding] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [saleToComplete, setSaleToComplete] = useState<string | null>(null)
  const [saleToVoid, setSaleToVoid] = useState<string | null>(null)
  
  // Receipt generation state
  const [receiptSaleId, setReceiptSaleId] = useState<string | null>(null)
  const [isGeneratingReceipt, setIsGeneratingReceipt] = useState(false)
  
  // Filter states
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)

  // Export states
  const [userPlan, setUserPlan] = useState<string>('free')
  const [showPremiumModal, setShowPremiumModal] = useState(false)
  const [premiumFeatureName, setPremiumFeatureName] = useState('')
  const [exportModal, setExportModal] = useState(false)
  const [exportFilters, setExportFilters] = useState({
    paymentTypes: [] as string[],
    statuses: [] as string[],
    dateRange: undefined as DateRange | undefined
  })

  // Handle date range selection
  const handleDateRangeSelect = (range: DateRange | undefined) => {
    setDateRange(range);
  };
  
  const handleRefundClick = (saleId: string) => {
    setSaleToRefund(saleId)
    setIsRefundModalOpen(true)
  }

  // Helper function to check if a sale is from a pre-order
  const isPreOrderSale = (sale: Sale) => {
    const isDownPaymentStatus = sale.status === 'downpayment';
    const hasDownpaymentType = sale.items && sale.items.some((item: any) => 
      item.variant && item.variant.type === 'downpayment'
    );
    const hasPreOrderType = sale.items && sale.items.some((item: any) => 
      item.variant && item.variant.type === 'Pre-order'
    );
    return isDownPaymentStatus || hasDownpaymentType || hasPreOrderType;
  }

  // Get current sale being refunded for modal description
  const currentSaleToRefund = sales.find(sale => sale.id === saleToRefund);
  const isCurrentSalePreOrder = currentSaleToRefund ? isPreOrderSale(currentSaleToRefund) : false;

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
        console.log("[Refund Debug] Regular sale refund completed");
        
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

  // Fetch user plan
  const fetchUserPlan = async () => {
    try {
      const res = await fetch('/api/user-plan')
      const data = await res.json()
      if (data.success) {
        setUserPlan(data.plan.toLowerCase())
      }
    } catch (error) {
      console.error('Failed to fetch user plan:', error)
      setUserPlan('free')
    }
  }

  // Handle export modal opening
  const handleExportClick = () => {
    if (userPlan === 'free') {
      setPremiumFeatureName('Export Sales')
      setShowPremiumModal(true)
      return
    }
    // Set all filters to select all options by default
    setExportFilters({
      paymentTypes: [...uniquePaymentTypes],
      statuses: [...uniqueStatuses],
      dateRange: undefined
    })
    setExportModal(true)
  }

  // Handle export execution
  const handleExport = () => {
    // Filter sales based on selected criteria
    let dataToExport = sales.filter(sale => {
      // Payment type filtering
      let salePaymentType = ""
      if (sale.payment_type && typeof sale.payment_type === "object") {
        if (sale.payment_type.name) {
          salePaymentType = sale.payment_type.name
        } else if (sale.payment_type.type) {
          salePaymentType = "Cash"
        } else {
          salePaymentType = "Cash"
        }
      } else if (typeof sale.payment_type === "string" && sale.payment_type.toLowerCase() === "cash") {
        salePaymentType = "Cash"
      } else if (sale.payment_type_name) {
        salePaymentType = sale.payment_type_name
      } else if (!sale.payment_type) {
        salePaymentType = "Cash"
      } else {
        salePaymentType = typeof sale.payment_type === "string" ? sale.payment_type : "Cash"
      }

      const paymentTypeMatch = exportFilters.paymentTypes.length === 0 || exportFilters.paymentTypes.includes(salePaymentType)
      const statusMatch = exportFilters.statuses.length === 0 || exportFilters.statuses.includes(sale.status || '')
      
      // Date range filtering
      let dateMatch = true
      if (exportFilters.dateRange?.from || exportFilters.dateRange?.to) {
        const saleDate = new Date(sale.sale_date || sale.date)
        if (exportFilters.dateRange.from && saleDate < exportFilters.dateRange.from) {
          dateMatch = false
        }
        if (exportFilters.dateRange.to && saleDate > exportFilters.dateRange.to) {
          dateMatch = false
        }
      }

      return paymentTypeMatch && statusMatch && dateMatch
    })

    // Convert to CSV format with detailed item information
    const headers = ['Sale #', 'Date', 'Customer', 'Serial/Pre-Order', 'Payment Type', 'Status', 'Total', 'Profit', 'Item Name', 'Brand', 'Size', 'Type', 'Serial Number/Pre-Order #']
    
    // Flatten sales data to have one row per item
    const csvData: string[][] = []
    
    dataToExport.forEach(sale => {
      // Get payment type name
      let paymentTypeName = ""
      if (sale.payment_type && typeof sale.payment_type === "object") {
        if (sale.payment_type.name) {
          paymentTypeName = sale.payment_type.name
        } else if (sale.payment_type.type) {
          paymentTypeName = "Cash"
        } else {
          paymentTypeName = "Cash"
        }
      } else if (typeof sale.payment_type === "string" && sale.payment_type.toLowerCase() === "cash") {
        paymentTypeName = "Cash"
      } else if (sale.payment_type_name) {
        paymentTypeName = sale.payment_type_name
      } else if (!sale.payment_type) {
        paymentTypeName = "Cash"
      } else {
        paymentTypeName = typeof sale.payment_type === "string" ? sale.payment_type : "Cash"
      }

      // Get serial numbers/pre-order numbers for this sale
      const serialNumbers = sale.items && sale.items.length > 0 ? 
        sale.items.map((item: any) => {
          if (!item?.variant) return 'N/A';
          
          const isPreorderItem = (item.variant as any).type === 'Pre-order';
          const isDownpaymentItem = (item.variant as any).type === 'downpayment';
          
          if (isPreorderItem || isDownpaymentItem) {
            const preOrderMatch = (item.variant as any).notes?.match(/pre-order #(\d+)/);
            const preOrderNo = preOrderMatch?.[1] || 'N/A';
            return `PO #${preOrderNo}`;
          } else {
            const serialNo = item.variant.serialNumber || item.variant.serial_number || 'N/A';
            return `SN: ${serialNo}`;
          }
        }).join(', ') : '';

      // Common sale data
      const saleData = [
        formatSalesNo(sale.sales_no),
        formatDateInTimezone(sale.sale_date || sale.date),
        sale.customer_name || 'No name',
        serialNumbers,
        paymentTypeName,
        sale.status ? sale.status.charAt(0).toUpperCase() + sale.status.slice(1) : 'N/A',
        (sale.total_amount || sale.total || 0).toString(),
        (sale.net_profit || sale.profit || 0).toString()
      ]

      // Process each item in the sale
      if (sale.items && sale.items.length > 0) {
        sale.items.forEach((item: any) => {
          if (!item?.variant) {
            // Handle invalid items
            csvData.push([
              ...saleData,
              'Invalid item',
              '',
              '',
              '',
              ''
            ])
            return
          }

          const variant = item.variant
          const isPreorderItem = variant.type === 'Pre-order'
          const isDownpaymentItem = variant.type === 'downpayment'
          
          // Get identifier (serial number or pre-order number)
          let identifier = ''
          if (isPreorderItem || isDownpaymentItem) {
            const preOrderMatch = variant.notes?.match(/pre-order #(\d+)/)
            const preOrderNo = preOrderMatch?.[1] || 'N/A'
            identifier = `PO: #${preOrderNo}`
          } else {
            identifier = `SN: ${variant.serialNumber || 'N/A'}`
          }

          // Get item type
          let itemType = 'Regular'
          if (isPreorderItem) {
            itemType = 'Pre-order'
          } else if (isDownpaymentItem) {
            itemType = 'Down Payment'
          }

          csvData.push([
            ...saleData,
            variant.productName || '',
            variant.brand || '',
            variant.size || '',
            itemType,
            identifier
          ])
        })
      } else {
        // Sale with no items
        csvData.push([
          ...saleData,
          'No items',
          '',
          '',
          '',
          ''
        ])
      }
    })

    // Create CSV content
    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n')

    // Download CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `sales_export_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    setExportModal(false)
    // Reset filters
    setExportFilters({
      paymentTypes: [],
      statuses: [],
      dateRange: undefined
    })
  }

  // Export filter toggle functions
  const toggleExportFilter = (filterType: keyof typeof exportFilters, value: string) => {
    if (filterType === 'dateRange') return // Handle separately
    
    setExportFilters(prev => ({
      ...prev,
      [filterType]: (prev[filterType] as string[]).includes(value)
        ? (prev[filterType] as string[]).filter(item => item !== value)
        : [...(prev[filterType] as string[]), value]
    }))
  }

  const toggleAllExportFilters = (filterType: keyof typeof exportFilters, allOptions: string[]) => {
    if (filterType === 'dateRange') return // Handle separately
    
    setExportFilters(prev => ({
      ...prev,
      [filterType]: (prev[filterType] as string[]).length === allOptions.length ? [] : [...allOptions]
    }))
  }

  const [page, setPage] = useState(1)
  const pageSize = 10

  // Fetch user plan on component mount
  useEffect(() => {
    fetchUserPlan()
  }, [])
       
  const formatSalesNo = (n: number | null | undefined) => n != null ? `#${n.toString().padStart(3, "0")}` : "#---"
       


  // Sorting state: by sales_no (default), can toggle asc/desc
  const [sortBy, setSortBy] = useState<'sales_no' | 'date' | 'total' | 'profit'>('sales_no');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Get unique payment types from sales
  const uniquePaymentTypes = useMemo(() => {
    const types = new Set<string>();
    sales.forEach(sale => {
      let paymentType = "";
      if (sale.payment_type && typeof sale.payment_type === "object") {
        if (sale.payment_type.name) {
          paymentType = sale.payment_type.name;
        } else if (sale.payment_type.type) {
          // Handle new format from pre-order cancellation: {"type": "uuid"}
          paymentType = "Cash"; // Default fallback for new format
        } else {
          paymentType = "Cash"; // Default fallback
        }
      } else if (typeof sale.payment_type === "string" && sale.payment_type.toLowerCase() === "cash") {
        paymentType = "Cash";
      } else if (sale.payment_type_name) {
        paymentType = sale.payment_type_name;
      } else if (!sale.payment_type) {
        paymentType = "Cash";
      } else {
        // Last resort: convert to string safely
        paymentType = typeof sale.payment_type === "string" ? sale.payment_type : "Cash";
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
    setSearchTerm("");
    setPaymentTypeFilter("all");
    setStatusFilter("all");
    setDateRange(undefined);
  };

  // Check if any filters are active
  const hasActiveFilters = searchTerm || paymentTypeFilter !== "all" || statusFilter !== "all" || dateRange?.from || dateRange?.to;

  const filteredAndSortedSales = useMemo(() => {
    let filtered = sales;
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter((sale) => {
        const searchLower = searchTerm.toLowerCase();
        // Search in sale number
        const saleNo = formatSalesNo(sale.sales_no).toLowerCase();
        if (saleNo.includes(searchLower)) return true;
        
        // Search in customer name
        if (sale.customer_name?.toLowerCase().includes(searchLower)) return true;
        
        // Search in items (product name, serial number, pre-order number)
        if (sale.items?.some((item: any) => {
          // Search in product name
          if (item.variant?.productName?.toLowerCase().includes(searchLower)) return true;
          
          // Search in serial number
          if (String(item.variant?.serialNumber || item.variant?.serial_number || '').toLowerCase().includes(searchLower)) return true;
          
          // Search in pre-order number
          const isPreorderItem = (item.variant as any)?.type === 'Pre-order';
          const isDownpaymentItem = (item.variant as any)?.type === 'downpayment';
          if (isPreorderItem || isDownpaymentItem) {
            const preOrderMatch = (item.variant as any)?.notes?.match(/pre-order #(\d+)/);
            const preOrderNo = preOrderMatch?.[1] || '';
            if (preOrderNo.toLowerCase().includes(searchLower)) return true;
          }
          
          return false;
        })) return true;
        
        return false;
      });
    }
    
    // Payment type filter
    if (paymentTypeFilter !== "all") {
      filtered = filtered.filter((sale) => {
        let paymentType = "";
        if (sale.payment_type && typeof sale.payment_type === "object") {
          if (sale.payment_type.name) {
            paymentType = sale.payment_type.name;
          } else if (sale.payment_type.type) {
            // Handle new format from pre-order cancellation: {"type": "uuid"}
            paymentType = "Cash"; // Default fallback for new format
          } else {
            paymentType = "Cash"; // Default fallback
          }
        } else if (typeof sale.payment_type === "string" && sale.payment_type.toLowerCase() === "cash") {
          paymentType = "Cash";
        } else if (sale.payment_type_name) {
          paymentType = sale.payment_type_name;
        } else if (!sale.payment_type) {
          paymentType = "Cash";
        } else {
          // Last resort: convert to string safely
          paymentType = typeof sale.payment_type === "string" ? sale.payment_type : "Cash";
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

  const handlePrintReceipt = (saleId: string) => {
    setReceiptSaleId(saleId)
    setIsGeneratingReceipt(true)
  }

  const handleReceiptComplete = () => {
    setReceiptSaleId(null)
    setIsGeneratingReceipt(false)
  }

  const handleReceiptError = (error: string) => {
    console.error("Receipt generation error:", error)
    setReceiptSaleId(null)
    setIsGeneratingReceipt(false)
  }

  const handleConfirmDelete = async () => {
    if (!saleToDelete) return
    setIsDeleting(true)
    const supabase = createClient()
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        console.error("No user session or access token")
        toast({
          title: "Authentication Error",
          description: "No user session found. Please refresh and try again.",
          variant: "destructive",
        })
        return
      }
      
      console.log("Deleting sale:", saleToDelete)
      const res = await fetch("/api/delete-sale", {
        method: "DELETE",
        headers: { 
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ saleId: saleToDelete }),
      })
      
      console.log("Delete response status:", res.status)
      const result = await res.json()
      console.log("Delete response:", result)
      
      if (result.success) {
        console.log("Sale deleted successfully:", result.data)
        
        // Show success message based on deletion type
        const deletionType = result.data?.cleanup_type || 'regular_sale_cleanup'
        const isPreorderSale = deletionType === 'preorder_sale_cleanup'
        const preordersReverted = result.data?.preorders_reverted || 0
        const preordersRestored = result.data?.preorders_restored || 0
        
        let successMessage = "Sale deleted successfully."
        
        if (isPreorderSale) {
          if (preordersReverted > 0 && preordersRestored > 0) {
            // Both types restored
            successMessage = `Sale deleted successfully. ${preordersReverted + preordersRestored} pre-orders restored to pending status.`
          } else if (preordersReverted > 0) {
            // Completed pre-orders reverted
            const plural = preordersReverted > 1 ? 'pre-orders' : 'pre-order'
            successMessage = `Sale deleted successfully. ${preordersReverted} completed ${plural} restored to pending status.`
          } else if (preordersRestored > 0) {
            // Cancelled pre-orders restored
            const plural = preordersRestored > 1 ? 'pre-orders' : 'pre-order'
            successMessage = `Sale deleted successfully. ${preordersRestored} cancelled ${plural} restored to pending status.`
          }
        }
        
        toast({
          title: "Sale Deleted",
          description: successMessage,
        })
        
        // Call parent to refresh sales and wait for it to complete
        if (onDeleted) {
          // Small delay to ensure database changes are propagated
          await new Promise(resolve => setTimeout(resolve, 500))
          await onDeleted() // Wait for the refresh to complete
        }
      } else {
        console.error("Delete failed:", result.error)
        
        // Provide user-friendly error messages
        let errorMessage = "Unable to delete sale. Please try again."
        
        if (result.error?.includes('not found')) {
          errorMessage = "Sale not found. It may have already been deleted."
        } else if (result.error?.includes('Authentication')) {
          errorMessage = "Session expired. Please refresh the page and try again."
        } else if (result.error?.includes('permission')) {
          errorMessage = "You don't have permission to delete this sale."
        }
        
        toast({
          title: "Cannot Delete Sale",
          description: errorMessage,
          variant: "destructive",
        })
      }
    } catch (err) {
      console.error("Error deleting:", err)
      toast({
        title: "Connection Error",
        description: "Unable to connect to the server. Please check your internet connection and try again.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setIsConfirmModalOpen(false)
      setSaleToDelete(null)
    }
  }

  // Handler for completing pending sales
  const handleCompleteSale = async (saleId: string) => {
    setIsUpdating(true);
    
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      // Get the sale details
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .select('*')
        .eq('id', saleId)
        .single();

      if (saleError) throw saleError;

      if (sale.status !== 'pending') {
        toast({
          title: "Invalid Action",
          description: "This sale is not in pending status.",
          variant: "destructive",
        });
        return;
      }

      // Update sale to completed status
      const { error: updateError } = await supabase
        .from('sales')
        .update({ 
          status: 'completed',
          payment_received: sale.total_amount,
          remaining_balance: 0,
          change_amount: 0
        })
        .eq('id', saleId);

      if (updateError) throw updateError;

      toast({
        title: "Sale Completed",
        description: "The remaining balance has been collected and the sale is now complete.",
      });

      // Refresh the sales list
      if (onCompleted) {
        await onCompleted();
      }

    } catch (error) {
      console.error('Error completing sale:', error);
      toast({
        title: "Error",
        description: "Failed to complete sale. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Handler for voiding pending sales (refund down payment)
  const handleVoidPendingSale = async (saleId: string) => {
    setIsUpdating(true);
    
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Authentication required');
      }

      // Get the sale details
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .select('*')
        .eq('id', saleId)
        .single();

      if (saleError) throw saleError;

      if (sale.status !== 'pending') {
        toast({
          title: "Invalid Action", 
          description: "This sale is not in pending status.",
          variant: "destructive",
        });
        return;
      }

      // Update sale to voided status
      const { error: updateError } = await supabase
        .from('sales')
        .update({ 
          status: 'voided'
        })
        .eq('id', saleId);

      if (updateError) throw updateError;

      // Return variants to available status
      const { data: saleItems } = await supabase
        .from('sale_items')
        .select('variant_id')
        .eq('sale_id', saleId);

      if (saleItems) {
        for (const item of saleItems) {
          if (item.variant_id) {
            await supabase
              .from('variants')
              .update({ status: 'Available' })
              .eq('id', item.variant_id);
          }
        }
      }

      toast({
        title: "Sale Voided",
        description: "The down payment sale has been voided and items returned to inventory.",
      });

      // Refresh the sales list
      if (onVoided) {
        await onVoided();
      }

    } catch (error) {
      console.error('Error voiding sale:', error);
      toast({
        title: "Error",
        description: "Failed to void sale. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Filter Controls */}
      <div className="flex flex-col gap-4">
        {/* Search Bar */}
        <div className="relative mt-2 px-1">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search by sale ID, product, serial number, pre-order number, or customer name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filter Row */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Filters:</span>
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full sm:w-auto">
            {/* Payment Type Filter */}
            <Select value={paymentTypeFilter} onValueChange={setPaymentTypeFilter}>
              <SelectTrigger className="w-full sm:w-[140px]">
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
              <SelectTrigger className="w-full sm:w-[120px]">
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
                    "w-full sm:w-[240px] justify-start text-left font-normal",
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
                className="h-10 px-3 w-full sm:w-auto"
              >
                <X className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            )}

            {/* Export Button */}
            <Button
              size="sm"
              onClick={handleExportClick}
              className={`bg-black hover:bg-gray-800 text-white h-10 px-3 w-full sm:w-auto `}
            >
          
              <Download className="w-4 h-4 mr-2" />
              Export
       
              {userPlan === 'free' && <Star className="w-3 h-3 ml-2 fill-current" />}
            </Button>
          </div>
        </div>

        {/* Sales Count */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {paginatedSales.length} of {filteredAndSortedSales.length} filtered sales
          </div>
        </div>
      </div>

      {/* Mobile Card Layout - visible only on very small screens */}
      <div className="block sm:hidden space-y-3">
        {paginatedSales.length === 0 ? (
          <div className="text-center py-10 text-gray-500 border rounded-md">
            {hasActiveFilters ? "No sales match the current search or filters." : "No sales yet."}
          </div>
        ) : (
          paginatedSales.map((sale) => {
            // Get payment type name (using same logic as existing code)
            let paymentTypeName = "";
            if (sale.payment_type && typeof sale.payment_type === "object") {
              if (sale.payment_type.name) {
                paymentTypeName = sale.payment_type.name;
              } else if (sale.payment_type.type) {
                paymentTypeName = "Cash"; // Default fallback for new format
              } else {
                paymentTypeName = "Cash"; // Default fallback
              }
            } else if (typeof sale.payment_type === "string" && sale.payment_type.toLowerCase() === "cash") {
              paymentTypeName = "Cash";
            } else if (sale.payment_type_name) {
              paymentTypeName = sale.payment_type_name;
            } else if (!sale.payment_type) {
              paymentTypeName = "Cash";
            } else {
              paymentTypeName = typeof sale.payment_type === "string" ? sale.payment_type : "Cash";
            }
            
            return (
              <div key={sale.id} className="border rounded-lg p-4 bg-card space-y-3">
                {/* Header with Sale # and Actions Menu */}
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-semibold text-base">Sale {formatSalesNo(sale.sales_no)}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {formatDateInTimezone(sale.sale_date || sale.date)}
                    </div>
                  </div>
                  
                  {/* Three dots menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => handleViewDetails(sale)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handlePrintReceipt(sale.id)}>
                        <Printer className="mr-2 h-4 w-4" />
                        Print Receipt
                      </DropdownMenuItem>
                      
                      {/* Show Complete Sale for pending sales */}
                      {sale.status === 'pending' && (
                        <DropdownMenuItem
                          onClick={() => handleCompleteSale(sale.id)}
                          className="text-green-600"
                          disabled={isUpdating}
                        >
                          <Check className="mr-2 h-4 w-4" />
                          Complete Sale
                        </DropdownMenuItem>
                      )}
                      
                      {/* Show Void for pending sales */}
                      {sale.status === 'pending' && (
                        <DropdownMenuItem
                          onClick={() => handleVoidPendingSale(sale.id)}
                          className="text-orange-600"
                          disabled={isUpdating}
                        >
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Void & Refund
                        </DropdownMenuItem>
                      )}
                      
                      {/* Show Refund for completed non-preorder sales */}
                      {sale.status === 'completed' && !isPreOrderSale(sale) && (
                        <DropdownMenuItem
                          onClick={() => handleRefundClick(sale.id)}
                          className="text-orange-600"
                        >
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Refund Sale
                        </DropdownMenuItem>
                      )}
                      
                      <DropdownMenuItem
                        onClick={() => handleDeleteClick(sale.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Sale
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                {/* Customer info */}
                <div className="space-y-1">
                  <div className="text-sm">
                    <span className="font-medium text-gray-600">Customer:</span>{" "}
                    {sale.customer_name || <span className="text-gray-400 italic">No name</span>}
                  </div>
                  
                  {/* Serial Numbers / Pre-Order Numbers */}
                  {sale.items && sale.items.length > 0 && (
                    (() => {
                      // Create sorted badges data for mobile
                      const badgesData = sale.items
                        .filter((item: any) => item?.variant)
                        .map((item: any) => {
                          const isPreorderItem = (item.variant as any).type === 'Pre-order';
                          const isDownpaymentItem = (item.variant as any).type === 'downpayment';
                          
                          let badgeContent;
                          let badgeVariant: "default" | "secondary" | "destructive" | "outline" = "outline";
                          let sortValue = 0;
                          
                          if (isPreorderItem || isDownpaymentItem) {
                            const preOrderMatch = (item.variant as any).notes?.match(/pre-order #(\d+)/);
                            const preOrderNo = preOrderMatch?.[1] || '0';
                            badgeContent = `PO #${preOrderNo}`;
                            badgeVariant = "secondary";
                            sortValue = parseInt(preOrderNo, 10) || 0;
                          } else {
                            const serialNo = item.variant.serialNumber || item.variant.serial_number || 'N/A';
                            badgeContent = `SN: ${serialNo}`;
                            badgeVariant = "outline";
                            // Try to extract numeric part for sorting
                            const numMatch = String(serialNo).match(/\d+/);
                            sortValue = numMatch ? parseInt(numMatch[0], 10) : 999999;
                          }
                          
                          return {
                            id: item.id,
                            content: badgeContent,
                            variant: badgeVariant,
                            sortValue: sortValue
                          };
                        })
                        .sort((a, b) => a.sortValue - b.sortValue);

                      if (badgesData.length === 0) {
                        return null;
                      }

                      if (badgesData.length === 1) {
                        // Show single badge
                        const badge = badgesData[0];
                        return (
                          <div>
                            <Badge 
                              variant={badge.variant}
                              className="text-xs"
                            >
                              {badge.content}
                            </Badge>
                          </div>
                        );
                      }

                      // Multiple badges - show first one with expandable details
                      return (
                        <div className="space-y-1">
                          <Badge 
                            variant={badgesData[0].variant}
                            className="text-xs"
                          >
                            {badgesData[0].content}
                          </Badge>
                          <details className="text-xs">
                            <summary className="cursor-pointer hover:text-blue-600 text-muted-foreground">
                              +{badgesData.length - 1} more
                            </summary>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {badgesData.slice(1).map((badge) => (
                                <Badge 
                                  key={`mobile-${badge.id}`}
                                  variant={badge.variant}
                                  className="text-xs"
                                >
                                  {badge.content}
                                </Badge>
                              ))}
                            </div>
                          </details>
                        </div>
                      );
                    })()
                  )}
                </div>
                
                {/* Items with expandable view */}
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-600">Items:</div>
                  {sale.items && sale.items.length > 0 ? (
                    <div className="text-sm space-y-1">
                      {/* Show first item always */}
                      <div className="p-2 bg-gray-50 rounded">
                        {(() => {
                          const item = sale.items[0];
                          if (!item?.variant) return <span className="text-gray-400 italic">Invalid item</span>;
                          
                          const isPreorderItem = (item.variant as any).type === 'Pre-order';
                          const isDownpaymentItem = (item.variant as any).type === 'downpayment';
                          
                          let identifier;
                          if (isPreorderItem || isDownpaymentItem) {
                            const preOrderMatch = (item.variant as any).notes?.match(/pre-order #(\d+)/);
                            const preOrderNo = preOrderMatch?.[1] || 'N/A';
                            identifier = `PO: #${preOrderNo}`;
                          } else {
                            identifier = `SN: ${item.variant.serialNumber || 'N/A'}`;
                          }
                          
                          return (
                            <div>
                              <div className="font-medium">{item.variant.productName}</div>
                              <div className="text-xs text-muted-foreground">{identifier}</div>
                            </div>
                          );
                        })()}
                      </div>
                      
                      {/* Show item count and expandable details */}
                      {sale.items.length > 1 && (
                        <details className="text-sm">
                          <summary className="cursor-pointer hover:text-blue-600 text-blue-600 font-medium">
                            Show {sale.items.length - 1} more items
                          </summary>
                          <div className="mt-2 space-y-1">
                            {sale.items.slice(1).map((item: any) => {
                              if (!item?.variant) return null;
                              
                              const isPreorderItem = (item.variant as any).type === 'Pre-order';
                              const isDownpaymentItem = (item.variant as any).type === 'downpayment';
                              
                              let identifier;
                              if (isPreorderItem || isDownpaymentItem) {
                                const preOrderMatch = (item.variant as any).notes?.match(/pre-order #(\d+)/);
                                const preOrderNo = preOrderMatch?.[1] || 'N/A';
                                identifier = `PO: #${preOrderNo}`;
                              } else {
                                identifier = `SN: ${item.variant.serialNumber || 'N/A'}`;
                              }
                              
                              return (
                                <div key={item.id} className="p-2 bg-gray-50 rounded">
                                  <div className="font-medium text-sm">{item.variant.productName}</div>
                                  <div className="text-xs text-muted-foreground">{identifier}</div>
                                </div>
                              );
                            })}
                          </div>
                        </details>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-400 italic text-sm">No items</span>
                  )}
                </div>
                
                {/* Status and payment info */}
                <div className="space-y-1">
                  <div className="text-sm">
                    <span className="font-medium text-gray-600">Type:</span>{" "}
                    {(() => {
                      const isDownPaymentStatus = sale.status === 'downpayment';
                      const hasDownpaymentType = sale.items && sale.items.some((item: any) => 
                        item?.variant && (item.variant as any).type === 'downpayment'
                      );
                      const hasPreOrderType = sale.items && sale.items.some((item: any) => 
                        item?.variant && (item.variant as any).type === 'Pre-order'
                      );
                      
                      if (isDownPaymentStatus || hasDownpaymentType) {
                        return "Downpayment";
                      } else if (hasPreOrderType) {
                        return "Pre-order";
                      }
                      return "In Stock";
                    })()}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium text-gray-600">Payment:</span> {paymentTypeName}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium text-gray-600">Status:</span>{" "}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      sale.status === 'completed' ? 'bg-green-100 text-green-800' :
                      sale.status === 'downpayment' ? 'bg-yellow-100 text-yellow-800' :
                      sale.status === 'refunded' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {sale.status ? sale.status.charAt(0).toUpperCase() + sale.status.slice(1) : 'N/A'}
                    </span>
                  </div>
                </div>
                
                {/* Total and Profit at bottom */}
                <div className="pt-2 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <div className="text-left">
                      <div className="text-sm text-muted-foreground">Total</div>
                      <div className="text-lg font-bold">
                        {formatCurrency((sale.total_amount || sale.total || 0), currency)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Profit</div>
                      <div className="text-lg font-semibold text-green-600">
                        {formatCurrency((sale.net_profit || sale.profit || 0), currency)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      {/* Desktop Table Layout - hidden on very small screens */}
      <div className="hidden sm:block rounded-md border overflow-hidden">
        <div className="overflow-x-auto">
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
              <TableHead className="cursor-pointer select-none whitespace-nowrap" onClick={() => {
                if (sortBy === 'date') setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
                else { setSortBy('date'); setSortDir('desc'); }
              }}>
                Date
                {sortBy === 'date' && (
                  <span className="ml-1" style={{ fontWeight: 'bold' }}>{sortDir === 'asc' ? '▲' : '▼'}</span>
                )}
              </TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="hidden md:table-cell whitespace-nowrap">Serial/Pre-Order</TableHead>
              <TableHead>Items</TableHead>
              <TableHead className="hidden xl:table-cell">Type</TableHead>
              <TableHead className="hidden lg:table-cell">Payment</TableHead>
              <TableHead className="hidden lg:table-cell">Status</TableHead>
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
                <TableCell colSpan={9} className="text-center py-10 text-gray-500">
                  {hasActiveFilters ? "No sales match the current search or filters." : "No sales yet."}
                </TableCell>
              </TableRow>
            ) : (
              paginatedSales.map((sale) => {
                // Use sales_no for Sale #
                const customId = formatSalesNo(sale.sales_no);
                // Payment type name fallback logic
                let paymentTypeName = "";
                if (sale.payment_type && typeof sale.payment_type === "object") {
                  if (sale.payment_type.name) {
                    paymentTypeName = sale.payment_type.name;
                  } else if (sale.payment_type.type) {
                    // Handle new format from pre-order cancellation: {"type": "uuid"}
                    // We need to look up the payment type name, but for now use a fallback
                    paymentTypeName = "Cash"; // Default fallback for new format
                  } else {
                    paymentTypeName = "Cash"; // Default fallback
                  }
                } else if (typeof sale.payment_type === "string" && sale.payment_type.toLowerCase() === "cash") {
                  paymentTypeName = "Cash";
                } else if (sale.payment_type_name) {
                  paymentTypeName = sale.payment_type_name;
                } else if (!sale.payment_type) {
                  paymentTypeName = "Cash";
                } else {
                  // Last resort: convert to string safely
                  paymentTypeName = typeof sale.payment_type === "string" ? sale.payment_type : "Cash";
                }
                // Check if this sale has downpayment variant types for strikethrough
                const hasDownpaymentType = sale.items && sale.items.some((item: any) => 
                  item.variant && item.variant.type === 'downpayment'
                );
                
                return (
                  <TableRow key={sale.id}>
                    <TableCell className="font-mono text-sm">{customId}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDateInTimezone(sale.sale_date || sale.date)}</TableCell>
                    <TableCell>{sale.customer_name || <span className="text-gray-400 italic">No name</span>}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {sale.items && sale.items.length > 0 ? (
                        (() => {
                          // Create sorted badges data
                          const badgesData = sale.items
                            .filter((item: any) => item?.variant)
                            .map((item: any) => {
                              const isPreorderItem = (item.variant as any).type === 'Pre-order';
                              const isDownpaymentItem = (item.variant as any).type === 'downpayment';
                              
                              let badgeContent;
                              let badgeVariant: "default" | "secondary" | "destructive" | "outline" = "outline";
                              let sortValue = 0;
                              
                              if (isPreorderItem || isDownpaymentItem) {
                                const preOrderMatch = (item.variant as any).notes?.match(/pre-order #(\d+)/);
                                const preOrderNo = preOrderMatch?.[1] || '0';
                                badgeContent = `PO #${preOrderNo}`;
                                badgeVariant = "secondary";
                                sortValue = parseInt(preOrderNo, 10) || 0;
                              } else {
                                const serialNo = item.variant.serialNumber || item.variant.serial_number || 'N/A';
                                badgeContent = `SN: ${serialNo}`;
                                badgeVariant = "outline";
                                // Try to extract numeric part for sorting
                                const numMatch = String(serialNo).match(/\d+/);
                                sortValue = numMatch ? parseInt(numMatch[0], 10) : 999999;
                              }
                              
                              return {
                                id: item.id,
                                content: badgeContent,
                                variant: badgeVariant,
                                sortValue: sortValue
                              };
                            })
                            .sort((a, b) => a.sortValue - b.sortValue);

                          if (badgesData.length === 0) {
                            return <span className="text-gray-400 italic text-xs">No items</span>;
                          }

                          if (badgesData.length === 1) {
                            // Show single badge
                            const badge = badgesData[0];
                            return (
                              <Badge 
                                variant={badge.variant}
                                className="text-xs"
                              >
                                {badge.content}
                              </Badge>
                            );
                          }

                          // Multiple badges - show first one with expandable details
                          return (
                            <div className="space-y-1">
                              <Badge 
                                variant={badgesData[0].variant}
                                className="text-xs"
                              >
                                {badgesData[0].content}
                              </Badge>
                              <details className="text-xs">
                                <summary className="cursor-pointer hover:text-blue-600 text-muted-foreground">
                                  +{badgesData.length - 1} more
                                </summary>
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {badgesData.slice(1).map((badge) => (
                                    <Badge 
                                      key={badge.id}
                                      variant={badge.variant}
                                      className="text-xs"
                                    >
                                      {badge.content}
                                    </Badge>
                                  ))}
                                </div>
                              </details>
                            </div>
                          );
                        })()
                      ) : (
                        <span className="text-gray-400 italic text-xs">No items</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {sale.items && sale.items.length > 0 ? (
                        <div className="text-sm">
                          {/* Show first item always */}
                          <div className="mb-1">
                            {(() => {
                              const item = sale.items[0];
                              if (!item?.variant) return <span className="text-gray-400 italic">Invalid item</span>;
                              
                              const isPreorderItem = (item.variant as any).type === 'Pre-order';
                              const isDownpaymentItem = (item.variant as any).type === 'downpayment';
                              
                              let identifier;
                              if (isPreorderItem || isDownpaymentItem) {
                                const preOrderMatch = (item.variant as any).notes?.match(/pre-order #(\d+)/);
                                const preOrderNo = preOrderMatch?.[1] || 'N/A';
                                identifier = `PO: #${preOrderNo}`;
                              } else {
                                identifier = `SN: ${item.variant.serialNumber || 'N/A'}`;
                              }
                              
                              return (
                                <div className="truncate max-w-[200px]" title={`${item.variant.productName} (${identifier})`}>
                                  {item.variant.productName} <span className="text-xs text-muted-foreground">({identifier})</span>
                                </div>
                              );
                            })()}
                          </div>
                          
                          {/* Show item count and expandable details */}
                          {sale.items.length > 1 && (
                            <details className="text-xs text-muted-foreground">
                              <summary className="cursor-pointer hover:text-blue-600">
                                +{sale.items.length - 1} more items
                              </summary>
                              <div className="mt-2 space-y-1 ml-2 border-l-2 border-gray-100 pl-2">
                                {sale.items.slice(1).map((item: any) => {
                                  if (!item?.variant) return null;
                                  
                                  const isPreorderItem = (item.variant as any).type === 'Pre-order';
                                  const isDownpaymentItem = (item.variant as any).type === 'downpayment';
                                  
                                  let identifier;
                                  if (isPreorderItem || isDownpaymentItem) {
                                    const preOrderMatch = (item.variant as any).notes?.match(/pre-order #(\d+)/);
                                    const preOrderNo = preOrderMatch?.[1] || 'N/A';
                                    identifier = `PO: #${preOrderNo}`;
                                  } else {
                                    identifier = `SN: ${item.variant.serialNumber || 'N/A'}`;
                                  }
                                  
                                  return (
                                    <div key={item.id} className="text-xs">
                                      {item.variant.productName} <span className="text-muted-foreground">({identifier})</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </details>
                          )}
                          
                          {/* Mobile: Show important info inline on small screens */}
                          <div className="sm:hidden mt-1 space-y-1">
                            <div className="text-xs text-muted-foreground">
                              {(() => {
                                const isDownPaymentStatus = sale.status === 'downpayment';
                                const hasDownpaymentType = sale.items && sale.items.some((item: any) => 
                                  item?.variant && (item.variant as any).type === 'downpayment'
                                );
                                const hasPreOrderType = sale.items && sale.items.some((item: any) => 
                                  item?.variant && (item.variant as any).type === 'Pre-order'
                                );
                                
                                let typeLabel = "In Stock";
                                if (isDownPaymentStatus || hasDownpaymentType) {
                                  typeLabel = "Downpayment";
                                } else if (hasPreOrderType) {
                                  typeLabel = "Pre-order";
                                }
                                
                                const statusText = sale.status ? 
                                  sale.status.charAt(0).toUpperCase() + sale.status.slice(1) : 
                                  'N/A';
                                
                                return `${typeLabel} • ${paymentTypeName} • ${statusText}`;
                              })()}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">No items</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      {(() => {
                        // Check variant types to determine the appropriate badge:
                        // - "downpayment" type = from cancelled pre-orders
                        // - "Pre-order" type = from completed pre-orders  
                        // - status "downpayment" = original downpayment sales
                        const isDownPaymentStatus = sale.status === 'downpayment';
                        const hasDownpaymentType = sale.items && sale.items.some((item: any) => 
                          item.variant && item.variant.type === 'downpayment'
                        );
                        const hasPreOrderType = sale.items && sale.items.some((item: any) => 
                          item.variant && item.variant.type === 'Pre-order'
                        );
                        
                        // Determine the appropriate label and styling
                        if (isDownPaymentStatus || hasDownpaymentType) {
                          return (
                            <span className="px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-800 whitespace-nowrap">
                              Downpayment
                            </span>
                          );
                        } else if (hasPreOrderType) {
                          return (
                            <span className="px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-800 whitespace-nowrap">
                              Pre-order Completed
                            </span>
                          );
                        } else {
                          return (
                            <span className="px-2 py-1 rounded text-xs font-semibold bg-gray-100 text-gray-700 whitespace-nowrap">
                              In Stock
                            </span>
                          );
                        }
                      })()}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">{paymentTypeName}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {sale.status ? (
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          sale.status === 'completed' ? 'bg-green-100 text-green-800' :
                          sale.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          sale.status === 'refunded' ? 'bg-orange-100 text-orange-800' :
                          sale.status === 'voided' ? 'bg-gray-200 text-gray-700' :
                          sale.status === 'downpayment' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {sale.status === 'pending' && (sale as any).shipping_address ? 'Shipping Pending' : 
                           sale.status.charAt(0).toUpperCase() + sale.status.slice(1)}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">N/A</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <span className={hasDownpaymentType ? "line-through text-gray-500" : ""}>
                        {formatCurrency(sale.total_amount || sale.total || 0, currency)}
                      </span>
                    </TableCell>
                    <TableCell className={`text-right font-medium ${sale.net_profit < 0 ? "text-red-600" : "text-green-600"}`}>
                      {formatCurrency(sale.net_profit || sale.profit || 0, currency)}
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
                            onClick={() => handlePrintReceipt(sale.id)}
                            disabled={isGeneratingReceipt}
                          >
                            <Printer className="h-4 w-4 mr-2" />
                            {isGeneratingReceipt && receiptSaleId === sale.id ? "Generating..." : "Print Receipt"}
                          </DropdownMenuItem>
                          
                          {/* Show Complete Sale for pending sales */}
                          {sale.status === 'pending' && (
                            <DropdownMenuItem
                              onClick={() => handleCompleteSale(sale.id)}
                              className="text-green-600"
                              disabled={isUpdating}
                            >
                              <Check className="h-4 w-4 mr-2" />
                              Complete Sale
                            </DropdownMenuItem>
                          )}
                          
                          {/* Show Void for pending sales */}
                          {sale.status === 'pending' && (
                            <DropdownMenuItem
                              onClick={() => handleVoidPendingSale(sale.id)}
                              className="text-orange-600"
                              disabled={isUpdating}
                            >
                              <RotateCcw className="h-4 w-4 mr-2" />
                              Void & Refund
                            </DropdownMenuItem>
                          )}
                          
                          {/* Show Refund for completed non-preorder sales */}
                          {sale.status === 'completed' && !isPreOrderSale(sale) && (
                            <DropdownMenuItem
                              onClick={() => handleRefundClick(sale.id)}
                              className="text-yellow-600"
                            >
                              <RotateCcw className="h-4 w-4 mr-2" />
                              Refund Sale
                            </DropdownMenuItem>
                          )}
                          
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
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="w-full sm:w-auto"
          >
            Previous
          </Button>
          <span className="text-sm whitespace-nowrap">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="w-full sm:w-auto"
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
          sale={selectedSale as any} // Cast to any since the API returns transformed data structure
        />
      )}

      <ConfirmationModal
        open={isRefundModalOpen}
        onOpenChange={setIsRefundModalOpen}
        title="Confirm Refund"
        description={`Are you sure you want to refund this sale? ${
          isCurrentSalePreOrder 
            ? "This will convert the refunded item(s) back to their original state and may affect inventory." 
            : "This action will reverse the sale and may affect inventory."
        }`}
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

      {/* Receipt Generator */}
      {receiptSaleId && (
        <ReceiptGenerator
          saleId={receiptSaleId || undefined}
          onComplete={handleReceiptComplete}
          onError={handleReceiptError}
        />
      )}

      {/* Premium Feature Modal */}
      <PremiumFeatureModal
        open={showPremiumModal}
        onOpenChange={setShowPremiumModal}
        featureName={premiumFeatureName}
      />

      {/* Export Modal */}
      <Dialog open={exportModal} onOpenChange={setExportModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Export Sales</DialogTitle>
            <DialogDescription>
              Select the filters for the sales you want to export. Leave categories empty to export all sales.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-4">
            {/* Payment Type Filter */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Payment Type</label>
              <div className="flex items-center gap-2 mb-2">
                <Checkbox
                  id="all-payment-types"
                  checked={exportFilters.paymentTypes.length === uniquePaymentTypes.length}
                  onCheckedChange={() => toggleAllExportFilters('paymentTypes', uniquePaymentTypes)}
                />
                <label htmlFor="all-payment-types" className="text-sm cursor-pointer">Select All</label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {uniquePaymentTypes.map(paymentType => (
                  <div key={paymentType} className="flex items-center gap-2">
                    <Checkbox
                      id={`payment-${paymentType}`}
                      checked={exportFilters.paymentTypes.includes(paymentType)}
                      onCheckedChange={() => toggleExportFilter('paymentTypes', paymentType)}
                    />
                    <label htmlFor={`payment-${paymentType}`} className="text-sm cursor-pointer">{paymentType}</label>
                  </div>
                ))}
              </div>
            </div>

            {/* Status Filter */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Status</label>
              <div className="flex items-center gap-2 mb-2">
                <Checkbox
                  id="all-statuses-export"
                  checked={exportFilters.statuses.length === uniqueStatuses.length}
                  onCheckedChange={() => toggleAllExportFilters('statuses', uniqueStatuses)}
                />
                <label htmlFor="all-statuses-export" className="text-sm cursor-pointer">Select All</label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {uniqueStatuses.map(status => (
                  <div key={status} className="flex items-center gap-2">
                    <Checkbox
                      id={`status-export-${status}`}
                      checked={exportFilters.statuses.includes(status)}
                      onCheckedChange={() => toggleExportFilter('statuses', status)}
                    />
                    <label htmlFor={`status-export-${status}`} className="text-sm cursor-pointer">
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Date Range Filter */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Date Range (Optional)</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !exportFilters.dateRange?.from && !exportFilters.dateRange?.to && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {exportFilters.dateRange?.from ? (
                      exportFilters.dateRange.to ? (
                        <>
                          {format(exportFilters.dateRange.from, "LLL dd, y")} -{" "}
                          {format(exportFilters.dateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(exportFilters.dateRange.from, "LLL dd, y")
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
                    defaultMonth={exportFilters.dateRange?.from}
                    selected={exportFilters.dateRange}
                    onSelect={(range) => setExportFilters(prev => ({ ...prev, dateRange: range }))}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
              {exportFilters.dateRange?.from && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExportFilters(prev => ({ ...prev, dateRange: undefined }))}
                  className="w-full"
                >
                  Clear Date Range
                </Button>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setExportModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SalesList
