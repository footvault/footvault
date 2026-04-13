"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { ArrowUpDown, ArrowUp, ArrowDown, Search, Package, User, Phone, Mail, MapPin, Calendar, Edit, Loader2 } from "lucide-react"
import { formatCurrency } from "@/lib/utils/currency"
import { useCurrency } from "@/context/CurrencyContext"
import { format } from "date-fns"
import { PurchaseHistoryStats } from "./purchase-history-stats"

interface Customer {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  country: string | null;
  customerType: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  isArchived: boolean;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: string | null;
}

interface CustomerDetailModalProps {
  customer: Customer;
  onClose: () => void;
  onEdit: () => void;
}

interface PurchaseItem {
  id: string;
  productName: string;
  size: string;
  price: number;
  quantity?: number;
  discountAmount?: number;
  saleDate: string;
  soldBy: string;
  type: string; // Changed to allow any string
  preorderNo?: string;
  saleNo?: string;
  image?: string;
  serialNumber?: string;
  isTemplate?: boolean;
}

export function CustomerDetailModal({ customer, onClose, onEdit }: CustomerDetailModalProps) {
  const { currency } = useCurrency();
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("saleDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  
  // Calculate stats from purchase items (excluding downpayments)
  const [calculatedStats, setCalculatedStats] = useState({
    totalOrders: 0,
    totalSpent: 0,
    totalItems: 0,
    averageOrder: 0
  });

  useEffect(() => {
    const fetchPurchaseHistory = async () => {
      try {
        const response = await fetch(`/api/customers/${customer.id}/purchase-history`);
        if (response.ok) {
          const items = await response.json();
          setPurchaseItems(items);
        }
      } catch (error) {
        console.error('Failed to fetch purchase history:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPurchaseHistory();
  }, [customer.id]);

  // Calculate stats from purchase items (excluding downpayments)
  useEffect(() => {
    const nonDownpaymentItems = purchaseItems.filter(item => item.type !== 'Downpayment');
    
    // Group items by sale to count orders
    const salesMap = new Map();
    let totalSpent = 0;
    let totalItems = 0;
    
    nonDownpaymentItems.forEach(item => {
      // Use saleNo or date as a way to group items from the same sale
      const saleKey = `${item.saleDate}-${item.saleNo || 'unknown'}`;
      if (!salesMap.has(saleKey)) {
        salesMap.set(saleKey, true);
      }
      totalSpent += item.price || 0;
      totalItems += item.quantity || 1;
    });
    
    const totalOrders = salesMap.size;
    const averageOrder = totalOrders > 0 ? totalSpent / totalOrders : 0;
    
    setCalculatedStats({
      totalOrders,
      totalSpent,
      totalItems,
      averageOrder
    });
  }, [purchaseItems]);

  const filteredAndSortedItems = purchaseItems.filter(item => {
    const matchesSearch = searchTerm === "" || 
      item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.size.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.preorderNo?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === "all" || item.type === typeFilter;
    
    return matchesSearch && matchesType;
  }).sort((a, b) => {
    let aValue: any, bValue: any;
    
    switch (sortBy) {
      case "productName":
        aValue = a.productName.toLowerCase();
        bValue = b.productName.toLowerCase();
        break;
      case "price":
        aValue = a.price;
        bValue = b.price;
        break;
      case "saleDate":
        aValue = new Date(a.saleDate);
        bValue = new Date(b.saleDate);
        break;
      case "type":
        aValue = a.type;
        bValue = b.type;
        break;
      default:
        aValue = new Date(a.saleDate);
        bValue = new Date(b.saleDate);
    }

    if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
    if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const getSortIcon = (column: string) => {
    if (sortBy !== column) {
      return <ArrowUpDown className="h-4 w-4" />;
    }
    return sortOrder === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  const getCustomerTypeBadge = (type: string) => {
    switch (type) {
      case "vip":
        return <Badge variant="outline" className="border-amber-400/60 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold text-xs">VIP</Badge>;
      case "wholesale":
        return <Badge variant="outline" className="border-violet-400/60 bg-violet-500/10 text-violet-600 dark:text-violet-400 font-semibold text-xs">WHOLESALE</Badge>;
      default:
        return <Badge variant="outline" className="border-blue-400/60 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold text-xs">REGULAR</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "preorder": 
      case "Pre-order": 
        return <Badge variant="outline" className="border-blue-400/50 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs">Pre-order</Badge>;
      case "downpayment":
      case "Downpayment":
        return <Badge variant="outline" className="border-amber-400/50 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs">Downpayment</Badge>;
      case "in-stock": 
      case "In Stock":
        return <Badge variant="outline" className="border-emerald-400/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs">In Stock</Badge>;
      default: 
        return <Badge variant="outline" className="border-border bg-secondary/50 text-muted-foreground text-xs">{type}</Badge>;
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-[1200px] max-h-[90vh] overflow-y-auto m-2 sm:m-4 p-0 gap-0 border-border/60">
        {/* Customer Header */}
        <div className="relative overflow-hidden">
          {/* Gradient accent bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-violet-500 to-emerald-500" />
          
          <div className="p-5 sm:p-6">
            <DialogHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500/20 via-violet-500/20 to-emerald-500/20 border border-border/60 flex items-center justify-center text-sm font-bold text-foreground"
                  >
                    {getInitials(customer.name)}
                  </motion.div>
                  <div>
                    <DialogTitle className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-lg">{customer.name}</span>
                      {getCustomerTypeBadge(customer.customerType)}
                    </DialogTitle>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        Customer since {format(new Date(customer.createdAt), 'MMM d, yyyy')}
                      </span>
                      {customer.phone && (
                        <span className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5" />
                          {customer.phone}
                        </span>
                      )}
                      {customer.email && (
                        <span className="flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5" />
                          {customer.email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={onEdit} className="gap-1.5 shrink-0">
                  <Edit className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Edit</span>
                </Button>
              </div>
            </DialogHeader>
          </div>
        </div>

        <div className="px-5 sm:px-6 pb-5 sm:pb-6 space-y-5">
          {/* Purchase History Stats */}
          <PurchaseHistoryStats
            totalOrders={calculatedStats.totalOrders}
            totalSpent={calculatedStats.totalSpent}
            totalItems={calculatedStats.totalItems}
            averageOrderValue={calculatedStats.averageOrder}
            loading={isLoading}
          />

          {/* Search and Filters */}
          <Card className="border-border/60">
            <CardContent className="p-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground/50 h-4 w-4" />
                  <Input
                    placeholder="Search items by name, size, serial number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-9 bg-secondary/30 border-border/60 focus:bg-background transition-colors"
                  />
                </div>
                
                <div className="flex gap-2">
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-full sm:w-40 h-9">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="in-stock">In Stock</SelectItem>
                      <SelectItem value="preorder">Pre-order</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                    className="h-9 w-9 shrink-0"
                  >
                    {sortOrder === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Purchase History */}
          <div className="w-full">
            {isLoading ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-12"
              >
                <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-3" />
                <p className="text-sm text-muted-foreground">Loading purchase history...</p>
              </motion.div>
            ) : filteredAndSortedItems.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center justify-center py-12"
              >
                <div className="rounded-full bg-muted w-16 h-16 flex items-center justify-center mb-3">
                  <Package className="h-8 w-8 text-muted-foreground/60" />
                </div>
                <h3 className="text-base font-semibold mb-1">No Items Found</h3>
                <p className="text-sm text-muted-foreground text-center max-w-xs">
                  {searchTerm || typeFilter !== "all" 
                    ? "Try adjusting your search or filters"
                    : "This customer hasn't purchased any items yet"
                  }
                </p>
              </motion.div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden lg:block w-full">
                  <Card className="border-border/60 overflow-hidden">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/40 hover:bg-muted/40">
                            <TableHead className="w-16">Image</TableHead>
                            <TableHead 
                              className="cursor-pointer select-none min-w-[200px]"
                              onClick={() => handleSort("productName")}
                            >
                              <div className="flex items-center gap-1.5">
                                Product Name
                                {getSortIcon("productName")}
                              </div>
                            </TableHead>
                            <TableHead 
                              className="cursor-pointer select-none w-24"
                              onClick={() => handleSort("type")}
                            >
                              <div className="flex items-center gap-1.5">
                                Type
                                {getSortIcon("type")}
                              </div>
                            </TableHead>
                            <TableHead 
                              className="cursor-pointer select-none text-right w-28"
                              onClick={() => handleSort("price")}
                            >
                              <div className="flex items-center justify-end gap-1.5">
                                Price
                                {getSortIcon("price")}
                              </div>
                            </TableHead>
                            <TableHead className="text-right w-24">Discount</TableHead>
                            <TableHead 
                              className="cursor-pointer select-none w-28"
                              onClick={() => handleSort("saleDate")}
                            >
                              <div className="flex items-center gap-1.5">
                                Date
                                {getSortIcon("saleDate")}
                              </div>
                            </TableHead>
                            <TableHead className="w-24">Sold By</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <AnimatePresence mode="popLayout">
                            {filteredAndSortedItems.map((item, index) => (
                              <motion.tr
                                key={item.id}
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2, delay: index * 0.02 }}
                                className="group border-b border-border/40 hover:bg-muted/30 transition-colors"
                              >
                                <TableCell className="p-2">
                                  <div className="w-12 h-12 bg-secondary/50 rounded-lg flex items-center justify-center overflow-hidden">
                                    {item.image ? (
                                      <img 
                                        src={item.image} 
                                        alt={item.productName}
                                        className="w-12 h-12 object-cover rounded-lg"
                                      />
                                    ) : (
                                      <Package className="h-5 w-5 text-muted-foreground/40" />
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="p-2">
                                  <div className="max-w-[200px]">
                                    <div className="font-medium text-sm truncate">{item.productName}</div>
                                    <div className="text-xs text-muted-foreground">Size: {item.size}</div>
                                    {item.serialNumber && (
                                      <div className="text-xs text-muted-foreground/60 truncate">SN: {item.serialNumber}</div>
                                    )}
                                    {item.preorderNo && (
                                      <div className="text-xs text-muted-foreground/60">PO: #{item.preorderNo}</div>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="p-2">
                                  {getTypeBadge(item.type)}
                                </TableCell>
                                <TableCell className="text-right font-medium text-sm p-2 tabular-nums">
                                  {formatCurrency(item.price, currency)}
                                </TableCell>
                                <TableCell className="text-right p-2">
                                  {item.discountAmount ? (
                                    <span className="text-rose-500 dark:text-rose-400 text-xs font-medium tabular-nums">
                                      -{formatCurrency(item.discountAmount, currency)}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground/40 text-xs">-</span>
                                  )}
                                </TableCell>
                                <TableCell className="p-2">
                                  <div className="text-xs text-muted-foreground">
                                    {format(new Date(item.saleDate), 'MMM d, yyyy')}
                                  </div>
                                </TableCell>
                                <TableCell className="p-2">
                                  <div className="text-xs text-muted-foreground truncate max-w-[80px]">
                                    {item.soldBy}
                                    {item.isTemplate && (
                                      <div className="text-muted-foreground/50">Template</div>
                                    )}
                                  </div>
                                </TableCell>
                              </motion.tr>
                            ))}
                          </AnimatePresence>
                        </TableBody>
                      </Table>
                    </div>
                  </Card>
                </div>

                {/* Tablet Card View */}
                <div className="hidden md:block lg:hidden space-y-3">
                  {filteredAndSortedItems.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: index * 0.03 }}
                    >
                      <Card className="border-border/60 hover:border-border hover:shadow-sm transition-all duration-200">
                        <CardContent className="p-4">
                          <div className="flex gap-4">
                            <div className="w-16 h-16 bg-secondary/50 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                              {item.image ? (
                                <img 
                                  src={item.image} 
                                  alt={item.productName}
                                  className="w-16 h-16 object-cover rounded-lg"
                                />
                              ) : (
                                <Package className="h-7 w-7 text-muted-foreground/40" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1 min-w-0 pr-3">
                                  <h4 className="font-medium truncate">{item.productName}</h4>
                                  <p className="text-sm text-muted-foreground">Size: {item.size}</p>
                                  {item.serialNumber && (
                                    <p className="text-xs text-muted-foreground/60 truncate">SN: {item.serialNumber}</p>
                                  )}
                                  {item.preorderNo && (
                                    <p className="text-xs text-muted-foreground/60">PO: #{item.preorderNo}</p>
                                  )}
                                </div>
                                {getTypeBadge(item.type)}
                              </div>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <div className="font-medium tabular-nums">{formatCurrency(item.price, currency)}</div>
                                  {item.discountAmount && (
                                    <div className="text-rose-500 dark:text-rose-400 text-xs tabular-nums">
                                      -{formatCurrency(item.discountAmount, currency)} discount
                                    </div>
                                  )}
                                </div>
                                <div className="text-right">
                                  <div className="text-xs text-muted-foreground">
                                    {format(new Date(item.saleDate), 'MMM d, yyyy')}
                                  </div>
                                  <div className="text-xs text-muted-foreground/60">By: {item.soldBy}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-2.5">
                  {filteredAndSortedItems.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.25, delay: index * 0.03 }}
                    >
                      <Card className="border-border/60 hover:border-border transition-colors duration-200">
                        <CardContent className="p-3">
                          <div className="flex gap-3 w-full min-w-0">
                            <div className="w-12 h-12 bg-secondary/50 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                              {item.image ? (
                                <img 
                                  src={item.image} 
                                  alt={item.productName}
                                  className="w-12 h-12 object-cover rounded-lg"
                                />
                              ) : (
                                <Package className="h-5 w-5 text-muted-foreground/40" />
                              )}
                            </div>
                            
                            <div className="flex-1 min-w-0 w-0">
                              <div className="flex items-start justify-between mb-2 gap-2">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-sm truncate">{item.productName}</h4>
                                  <p className="text-xs text-muted-foreground">Size: {item.size}</p>
                                  {item.serialNumber && (
                                    <p className="text-xs text-muted-foreground/60 truncate">SN: {item.serialNumber}</p>
                                  )}
                                  {item.preorderNo && (
                                    <p className="text-xs text-muted-foreground/60 truncate">PO: #{item.preorderNo}</p>
                                  )}
                                </div>
                                {getTypeBadge(item.type)}
                              </div>
                              
                              <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <div className="font-medium text-sm tabular-nums">{formatCurrency(item.price, currency)}</div>
                                  <div className="text-xs text-muted-foreground flex-shrink-0">
                                    {format(new Date(item.saleDate), 'MMM d')}
                                  </div>
                                </div>
                                
                                <div className="flex items-center justify-between text-xs">
                                  <div className="min-w-0 flex-1">
                                    {item.discountAmount && (
                                      <span className="text-rose-500 dark:text-rose-400 tabular-nums">
                                        -{formatCurrency(item.discountAmount, currency)}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-muted-foreground/60 flex-shrink-0 ml-2 truncate max-w-[80px]">
                                    {item.soldBy}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
