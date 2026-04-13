"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Plus, Phone, Mail, User, Eye, Edit, ArrowUpDown, ArrowUp, ArrowDown, MoreHorizontal, Trash2, ChevronLeft, ChevronRight, UserPlus, Users } from "lucide-react"
import { AddCustomerModal } from "./add-customer-modal" 
import { EditCustomerModal } from "./edit-customer-modal" 
import { CustomerDetailModal } from "./customer-detail-modal" 
import { CustomerDeleteModal } from "./customer-delete-modal"
import { CustomerStatsCard } from "./customer-stats-card"
import { formatCurrency } from "@/lib/utils/currency"
import { useCurrency } from "@/context/CurrencyContext"
import { useTimezone } from "@/context/TimezoneContext"

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

interface CustomersPageClientProps {
  initialCustomers: Customer[]
  error?: string
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.1 },
  },
};

const rowVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] },
  },
  exit: { opacity: 0, x: 8, transition: { duration: 0.2 } },
};

const fadeIn = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

export function CustomersPageClient({ initialCustomers, error }: CustomersPageClientProps) {
  const { currency } = useCurrency();
  const { formatDateInTimezone } = useTimezone();
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [searchTerm, setSearchTerm] = useState("");
  const [customerTypeFilter, setCustomerTypeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Responsive design
  const [screenWidth, setScreenWidth] = useState<number>(typeof window !== 'undefined' ? window.innerWidth : 1024);

  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = screenWidth < 640;
  const isTablet = screenWidth < 768;

  // Reset to page 1 when filters change
  useEffect(() => { setCurrentPage(1); }, [searchTerm, customerTypeFilter, sortBy, sortOrder]);

  const { paginatedCustomers, totalPages, totalFiltered } = useMemo(() => {
    let filtered = customers.filter(customer => {
      const matchesSearch = searchTerm === "" || 
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone?.includes(searchTerm);
      
      const matchesType = customerTypeFilter === "all" || customer.customerType === customerTypeFilter;
      
      return matchesSearch && matchesType;
    });

    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "totalSpent":
          aValue = a.totalSpent;
          bValue = b.totalSpent;
          break;
        case "totalOrders":
          aValue = a.totalOrders;
          bValue = b.totalOrders;
          break;
        case "lastOrderDate":
          aValue = a.lastOrderDate ? new Date(a.lastOrderDate) : new Date(0);
          bValue = b.lastOrderDate ? new Date(b.lastOrderDate) : new Date(0);
          break;
        case "createdAt":
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }

      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    const totalFiltered = filtered.length;
    const totalPages = Math.ceil(totalFiltered / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedCustomers = filtered.slice(startIndex, startIndex + itemsPerPage);
    
    return { paginatedCustomers, totalPages, totalFiltered };
  }, [customers, searchTerm, customerTypeFilter, sortBy, sortOrder, currentPage, itemsPerPage]);

  const handleAddCustomer = (newCustomer: Customer) => {
    setCustomers([newCustomer, ...customers]);
    setShowAddModal(false);
  };

  const handleEditCustomer = (updatedCustomer: Customer) => {
    setCustomers(customers.map(c => c.id === updatedCustomer.id ? updatedCustomer : c));
    setShowEditModal(false);
    setSelectedCustomer(null);
  };

  const handleViewCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowDetailModal(true);
  };

  const handleEditClick = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowEditModal(true);
  };

  const handleDeleteCustomer = async (customerId: number) => {
    setCustomers(customers.filter(c => c.id !== customerId));
    setShowDeleteModal(false);
    setSelectedCustomer(null);
  };

  const handleDeleteClick = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowDeleteModal(true);
  };

  const getCustomerTypeBadge = (type: string) => {
    switch (type) {
      case "vip":
        return <Badge variant="outline" className="border-amber-400/60 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold">VIP</Badge>;
      case "wholesale":
        return <Badge variant="outline" className="border-violet-400/60 bg-violet-500/10 text-violet-600 dark:text-violet-400 font-semibold">WHOLESALE</Badge>;
      default:
        return <Badge variant="outline" className="border-blue-400/40 bg-blue-500/5 text-blue-600 dark:text-blue-400 font-medium">REGULAR</Badge>;
    }
  };

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
      return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />;
    }
    return sortOrder === "asc" 
      ? <ArrowUp className="h-3.5 w-3.5 text-foreground" /> 
      : <ArrowDown className="h-3.5 w-3.5 text-foreground" />;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (error) {
    return (
      <SidebarInset>
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 backdrop-blur-sm px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4 hidden md:block" />
          <h1 className="text-lg font-semibold">Customers</h1>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center p-8">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-md">
            <div className="rounded-full bg-destructive/10 w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Error Loading Customers</h2>
            <p className="text-muted-foreground mb-1">There was an issue fetching customer data.</p>
            <p className="text-sm text-muted-foreground/70">{error}</p>
          </motion.div>
        </div>
      </SidebarInset>
    );
  }

  return (
    <SidebarInset>
      {/* Sticky header with backdrop blur */}
      <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 backdrop-blur-sm px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4 hidden md:block" />
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold">Customers</h1>
            {totalFiltered > 0 && (
              <Badge variant="secondary" className="text-xs tabular-nums">
                {totalFiltered}
              </Badge>
            )}
          </div>
          <Button onClick={() => setShowAddModal(true)} size="sm" className="gap-1.5">
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Customer</span>
          </Button>
        </div>
      </header>
      
      <div className="flex flex-1 flex-col gap-4 p-4">
        {/* Stats Cards */}
        <CustomerStatsCard
          totalCustomers={customers.length}
          vipCustomers={customers.filter(c => c.customerType === 'vip').length}
          wholesaleCustomers={customers.filter(c => c.customerType === 'wholesale').length}
        />

        {/* Search and filters */}
        <motion.div variants={fadeIn} initial="hidden" animate="visible">
          <Card className="border-border/60">
            <CardContent className="p-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground/50 h-4 w-4" />
                  <Input
                    placeholder="Search by name, email, or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-9 bg-secondary/30 border-border/60 focus:bg-background transition-colors"
                  />
                </div>
                
                <div className="flex gap-2">
                  <Select value={customerTypeFilter} onValueChange={setCustomerTypeFilter}>
                    <SelectTrigger className="w-full sm:w-40 h-9">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="regular">Regular</SelectItem>
                      <SelectItem value="vip">VIP</SelectItem>
                      <SelectItem value="wholesale">Wholesale</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-full sm:w-40 h-9">
                      <SelectValue placeholder="Sort" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="totalSpent">Total Spent</SelectItem>
                      <SelectItem value="totalOrders">Total Orders</SelectItem>
                      <SelectItem value="lastOrderDate">Last Order</SelectItem>
                      <SelectItem value="createdAt">Date Added</SelectItem>
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
        </motion.div>

        {/* Customer list */}
        <AnimatePresence mode="wait">
          {paginatedCustomers.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center justify-center py-16 px-4"
            >
              <div className="rounded-full bg-muted w-20 h-20 flex items-center justify-center mb-4">
                <User className="h-10 w-10 text-muted-foreground/60" />
              </div>
              <h3 className="text-lg font-semibold mb-1">No customers found</h3>
              <p className="text-muted-foreground text-sm text-center max-w-sm mb-4">
                {searchTerm || customerTypeFilter !== "all" 
                  ? "Try adjusting your search or filters"
                  : "Get started by adding your first customer"
                }
              </p>
              {!searchTerm && customerTypeFilter === "all" && (
                <Button onClick={() => setShowAddModal(true)} size="sm" className="gap-1.5">
                  <Plus className="h-4 w-4" />
                  Add Customer
                </Button>
              )}
            </motion.div>
          ) : isMobile ? (
            /* Mobile Card View */
            <motion.div
              key="mobile-list"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-3"
            >
              {paginatedCustomers.map((customer: Customer) => (
                <motion.div key={customer.id} variants={rowVariants} layout>
                  <Card className="border-border/60 hover:border-border hover:shadow-sm transition-all duration-200 active:scale-[0.99]">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/15 via-violet-500/15 to-emerald-500/15 border border-border/40 flex items-center justify-center text-sm font-semibold text-foreground shrink-0">
                            {getInitials(customer.name)}
                          </div>
                          <div>
                            <h3 className="font-medium leading-tight">{customer.name}</h3>
                            <div className="mt-1">{getCustomerTypeBadge(customer.customerType)}</div>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewCustomer(customer)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Purchase History
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditClick(customer)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDeleteClick(customer)} className="text-destructive focus:text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      
                      <div className="space-y-1.5 text-sm text-muted-foreground mb-3">
                        {customer.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5" />
                            <span>{customer.phone}</span>
                          </div>
                        )}
                        {customer.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-3.5 w-3.5" />
                            <span className="truncate">{customer.email}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex justify-between items-center pt-3 border-t border-border/60">
                        <div className="text-center">
                          <div className="font-semibold text-foreground tabular-nums">{customer.totalOrders}</div>
                          <div className="text-[11px] text-muted-foreground">Orders</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-foreground tabular-nums">{formatCurrency(customer.totalSpent, currency)}</div>
                          <div className="text-[11px] text-muted-foreground">Spent</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-foreground">
                            {customer.lastOrderDate ? formatDateInTimezone(customer.lastOrderDate) : "—"}
                          </div>
                          <div className="text-[11px] text-muted-foreground">Last Order</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            /* Desktop Table View */
            <motion.div
              key="desktop-table"
              variants={fadeIn}
              initial="hidden"
              animate="visible"
            >
              <Card className="border-border/60 overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead 
                          className="cursor-pointer select-none whitespace-nowrap"
                          onClick={() => handleSort("name")}
                        >
                          <div className="flex items-center gap-1.5">
                            Customer
                            {getSortIcon("name")}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer select-none whitespace-nowrap"
                          onClick={() => handleSort("customerType")}
                        >
                          <div className="flex items-center gap-1.5">
                            Type
                            {getSortIcon("customerType")}
                          </div>
                        </TableHead>
                        {!isTablet && <TableHead className="whitespace-nowrap">Contact</TableHead>}
                        <TableHead 
                          className="cursor-pointer select-none text-right whitespace-nowrap"
                          onClick={() => handleSort("totalOrders")}
                        >
                          <div className="flex items-center justify-end gap-1.5">
                            Orders
                            {getSortIcon("totalOrders")}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer select-none text-right whitespace-nowrap"
                          onClick={() => handleSort("totalSpent")}
                        >
                          <div className="flex items-center justify-end gap-1.5">
                            Total Spent
                            {getSortIcon("totalSpent")}
                          </div>
                        </TableHead>
                        {!isTablet && (
                          <TableHead 
                            className="cursor-pointer select-none whitespace-nowrap"
                            onClick={() => handleSort("lastOrderDate")}
                          >
                            <div className="flex items-center gap-1.5">
                              Last Order
                              {getSortIcon("lastOrderDate")}
                            </div>
                          </TableHead>
                        )}
                        <TableHead className="text-right w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <AnimatePresence mode="popLayout">
                        {paginatedCustomers.map((customer: Customer, index: number) => (
                          <motion.tr
                            key={customer.id}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.25, delay: index * 0.03 }}
                            className="group border-b border-border/40 hover:bg-muted/30 transition-colors cursor-pointer"
                            onClick={() => handleViewCustomer(customer)}
                          >
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500/15 via-violet-500/15 to-emerald-500/15 border border-border/40 flex items-center justify-center text-xs font-semibold text-foreground shrink-0 group-hover:from-blue-500/25 group-hover:via-violet-500/25 group-hover:to-emerald-500/25 transition-all duration-200">
                                  {getInitials(customer.name)}
                                </div>
                                <div>
                                  <div className="font-medium">{customer.name}</div>
                                  {isTablet && (
                                    <div className="text-xs text-muted-foreground mt-0.5">
                                      {customer.phone || customer.email || "No contact"}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              {getCustomerTypeBadge(customer.customerType)}
                            </TableCell>
                            {!isTablet && (
                              <TableCell>
                                <div className="space-y-0.5">
                                  {customer.phone ? (
                                    <div className="flex items-center gap-1.5 text-sm">
                                      <Phone className="h-3 w-3 text-muted-foreground/60" />
                                      {customer.phone}
                                    </div>
                                  ) : null}
                                  {customer.email ? (
                                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                      <Mail className="h-3 w-3 text-muted-foreground/60" />
                                      <span className="truncate max-w-[180px]">{customer.email}</span>
                                    </div>
                                  ) : null}
                                  {!customer.phone && !customer.email && (
                                    <span className="text-sm text-muted-foreground/50 italic">No contact</span>
                                  )}
                                </div>
                              </TableCell>
                            )}
                            <TableCell className="text-right">
                              <span className="font-medium tabular-nums">{customer.totalOrders}</span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="font-medium tabular-nums">{formatCurrency(customer.totalSpent, currency)}</span>
                            </TableCell>
                            {!isTablet && (
                              <TableCell className="whitespace-nowrap">
                                {customer.lastOrderDate ? (
                                  <span className="text-sm text-muted-foreground">{formatDateInTimezone(customer.lastOrderDate)}</span>
                                ) : (
                                  <span className="text-sm text-muted-foreground/50">—</span>
                                )}
                              </TableCell>
                            )}
                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="h-8 w-8 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleViewCustomer(customer)}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    Purchase History
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleEditClick(customer)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    onClick={() => handleDeleteClick(customer)}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-border/40 bg-muted/20">
                    <p className="text-sm text-muted-foreground tabular-nums">
                      {((currentPage - 1) * itemsPerPage) + 1}–{Math.min(currentPage * itemsPerPage, totalFiltered)} of {totalFiltered}
                    </p>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(currentPage - 1)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                        let page: number;
                        if (totalPages <= 5) {
                          page = i + 1;
                        } else if (currentPage <= 3) {
                          page = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          page = totalPages - 4 + i;
                        } else {
                          page = currentPage - 2 + i;
                        }
                        return (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "ghost"}
                            size="icon"
                            className="h-8 w-8 text-xs"
                            onClick={() => setCurrentPage(page)}
                          >
                            {page}
                          </Button>
                        );
                      })}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(currentPage + 1)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile pagination */}
        {isMobile && totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-muted-foreground tabular-nums">
              Page {currentPage} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddCustomerModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddCustomer}
        />
      )}
      
      {showEditModal && selectedCustomer && (
        <EditCustomerModal
          customer={selectedCustomer}
          onClose={() => {
            setShowEditModal(false);
            setSelectedCustomer(null);
          }}
          onSave={handleEditCustomer}
        />
      )}
      
      {showDetailModal && selectedCustomer && (
        <CustomerDetailModal
          customer={selectedCustomer}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedCustomer(null);
          }}
          onEdit={() => {
            setShowDetailModal(false);
            setShowEditModal(true);
          }}
        />
      )}

      <CustomerDeleteModal
        customer={selectedCustomer}
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedCustomer(null);
        }}
        onDelete={handleDeleteCustomer}
      />
    </SidebarInset>
  );
}
