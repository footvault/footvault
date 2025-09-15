"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { ArrowUpDown, ArrowUp, ArrowDown, Search, Package, X, User } from "lucide-react"
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

  const getCustomerTypeColor = (type: string) => {
    switch (type) {
      case "vip": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "wholesale": return "bg-purple-100 text-purple-800 border-purple-200";
      default: return "bg-blue-100 text-blue-800 border-blue-200"; // regular
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "preorder": 
      case "Pre-order": 
        return "bg-blue-100 text-blue-800";
      case "downpayment":
      case "Downpayment":
        return "bg-orange-100 text-orange-800";
      case "in-stock": 
      case "In Stock":
        return "bg-green-100 text-green-800";
      default: 
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[1200px] max-h-[90vh] overflow-y-auto m-4 sm:m-6">
        <DialogHeader>
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle className="flex items-center gap-3">
                <User className="h-5 w-5" />
                {customer.name}
                <Badge className={getCustomerTypeColor(customer.customerType)}>
                  {customer.customerType.toUpperCase()}
                </Badge>
              </DialogTitle>
              <p className="text-sm text-gray-600 mt-1">
                Customer since {format(new Date(customer.createdAt), 'MMM d, yyyy')}
              </p>
            </div>
            <Button variant="outline" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Purchase History Stats */}
          <PurchaseHistoryStats
            totalOrders={calculatedStats.totalOrders}
            totalSpent={calculatedStats.totalSpent}
            totalItems={calculatedStats.totalItems}
            averageOrderValue={calculatedStats.averageOrder}
            loading={isLoading}
          />

          {/* Search and Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search items by name, size, serial number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="in-stock">In Stock</SelectItem>
                    <SelectItem value="preorder">Pre-order</SelectItem>
                  </SelectContent>
                </Select>

                <Button 
                  variant="outline" 
                  onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                  className="w-full sm:w-auto"
                >
                  {sortOrder === "asc" ? "↑" : "↓"} Sort
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Purchase History Table */}
          <div className="overflow-x-auto rounded-md border">
            <div className="min-w-[800px]">
              {isLoading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading purchase history...</p>
                </div>
              ) : filteredAndSortedItems.length === 0 ? (
                <div className="p-8 text-center">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Items Found</h3>
                  <p className="text-gray-600">
                    {searchTerm || typeFilter !== "all" 
                      ? "Try adjusting your search or filters"
                      : "This customer hasn't purchased any items yet"
                    }
                  </p>
                </div>
              ) : (
                <Table className="w-full">
                  <TableHeader className="bg-muted sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Image</TableHead>
                      <TableHead 
                        className="cursor-pointer select-none whitespace-nowrap"
                        onClick={() => handleSort("productName")}
                      >
                        <div className="flex items-center gap-2">
                          Product Name
                          {getSortIcon("productName")}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer select-none whitespace-nowrap"
                        onClick={() => handleSort("type")}
                      >
                        <div className="flex items-center gap-2">
                          Type
                          {getSortIcon("type")}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer select-none text-right whitespace-nowrap"
                        onClick={() => handleSort("price")}
                      >
                        <div className="flex items-center justify-end gap-2">
                          Sale Price
                          {getSortIcon("price")}
                        </div>
                      </TableHead>
                      <TableHead className="text-right whitespace-nowrap">Discount</TableHead>
                      <TableHead 
                        className="cursor-pointer select-none whitespace-nowrap"
                        onClick={() => handleSort("saleDate")}
                      >
                        <div className="flex items-center gap-2">
                          Date Sold
                          {getSortIcon("saleDate")}
                        </div>
                      </TableHead>
                      <TableHead className="whitespace-nowrap">Sold By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedItems.map((item) => (
                      <TableRow key={item.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="w-12 h-12 bg-gray-100 rounded-md flex items-center justify-center">
                            {item.image ? (
                              <img 
                                src={item.image} 
                                alt={item.productName}
                                className="w-12 h-12 object-cover rounded-md"
                              />
                            ) : (
                              <Package className="h-6 w-6 text-gray-400" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.productName}</div>
                            <div className="text-sm text-gray-500">Size: {item.size}</div>
                            {item.serialNumber && (
                              <div className="text-xs text-gray-400">SN: {item.serialNumber}</div>
                            )}
                            {item.preorderNo && (
                              <div className="text-xs text-gray-400">PO: #{item.preorderNo}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getTypeColor(item.type)}>
                            {item.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.price, currency)}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.discountAmount ? (
                            <span className="text-red-600">
                              -{formatCurrency(item.discountAmount, currency)}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {format(new Date(item.saleDate), 'MMM d, yyyy')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {item.soldBy}
                            {item.isTemplate && (
                              <div className="text-xs text-gray-400">Template</div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
