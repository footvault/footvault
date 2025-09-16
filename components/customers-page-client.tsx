"use client"

import { useState, useMemo, useEffect } from "react"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Plus, Phone, Mail, MapPin, User, Calendar, DollarSign, Eye, Edit, Archive, ArrowUpDown, ArrowUp, ArrowDown, MoreHorizontal, Trash2, Filter } from "lucide-react"
import { AddCustomerModal } from "./add-customer-modal" 
import { EditCustomerModal } from "./edit-customer-modal" 
import { CustomerDetailModal } from "./customer-detail-modal" 
import { CustomerDeleteModal } from "./customer-delete-modal"
import { CustomerStatsCard } from "./customer-stats-card"
import { formatCurrency } from "@/lib/utils/currency"
import { useCurrency } from "@/context/CurrencyContext"
import { useTimezone } from "@/context/TimezoneContext"
import { format } from "date-fns"

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

export function CustomersPageClient({ initialCustomers, error }: CustomersPageClientProps) {
  const { currency } = useCurrency();
  const { formatDateInTimezone } = useTimezone();
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [searchTerm, setSearchTerm] = useState("");
  const [customerTypeFilter, setCustomerTypeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  
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

  // Filter and sort customers
  const filteredAndSortedCustomers = useMemo(() => {
    let filtered = customers.filter(customer => {
      const matchesSearch = searchTerm === "" || 
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone?.includes(searchTerm);
      
      const matchesType = customerTypeFilter === "all" || customer.customerType === customerTypeFilter;
      
      return matchesSearch && matchesType;
    });

    // Sort customers
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

    return filtered;
  }, [customers, searchTerm, customerTypeFilter, sortBy, sortOrder]);

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
    // Remove customer from local state
    setCustomers(customers.filter(c => c.id !== customerId));
    setShowDeleteModal(false);
    setSelectedCustomer(null);
  };

  const handleDeleteClick = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowDeleteModal(true);
  };

  const getCustomerTypeColor = (type: string) => {
    switch (type) {
      case "vip": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "wholesale": return "bg-purple-100 text-purple-800 border-purple-200";
      default: return "bg-blue-100 text-blue-800 border-blue-200"; // regular
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
      return <ArrowUpDown className="h-4 w-4" />;
    }
    return sortOrder === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  if (error) {
    return (
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1 bg-white md:bg-transparent" />
          <Separator orientation="vertical" className="mr-2 h-4 hidden md:block" />
          <h1 className="text-xl font-semibold">Customers</h1>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="container mx-auto py-8 text-center text-red-500">
            <h1 className="text-3xl font-bold mb-4">Error Loading Customers</h1>
            <p>There was an issue fetching customer data. Please try again later.</p>
            <p className="text-sm text-gray-600">Details: {error}</p>
          </div>
        </div>
      </SidebarInset>
    );
  }

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1 bg-white md:bg-transparent" />
        <Separator orientation="vertical" className="mr-2 h-4 hidden md:block" />
        <h1 className="text-xl font-semibold">Customers</h1>
      </header>
      
      <div className="flex flex-1 flex-col gap-4 p-4">
        {/* Stats Cards */}
        <CustomerStatsCard
          totalCustomers={customers.length}
          vipCustomers={customers.filter(c => c.customerType === 'vip').length}
          wholesaleCustomers={customers.filter(c => c.customerType === 'wholesale').length}
        />

        {/* Header with add button */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-2xl font-bold">Customer Management</h2>
          <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Customer
          </Button>
        </div>

        {/* Search and filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search customers by name, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={customerTypeFilter} onValueChange={setCustomerTypeFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Customer Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="regular">Regular</SelectItem>
                  <SelectItem value="vip">VIP</SelectItem>
                  <SelectItem value="wholesale">Wholesale</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="totalSpent">Total Spent</SelectItem>
                  <SelectItem value="totalOrders">Total Orders</SelectItem>
                  <SelectItem value="lastOrderDate">Last Order</SelectItem>
                  <SelectItem value="createdAt">Date Added</SelectItem>
                  <SelectItem value="customerType">Customer Type</SelectItem>
                </SelectContent>
              </Select>

              <Button 
                variant="outline" 
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                className="w-full sm:w-auto"
              >
                {sortOrder === "asc" ? "↑" : "↓"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Customer table */}
        <div className="rounded-md border">
          {filteredAndSortedCustomers.length === 0 ? (
            <div className="p-8 text-center">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No customers found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || customerTypeFilter !== "all" 
                  ? "Try adjusting your search or filters"
                  : "Get started by adding your first customer"
                }
              </p>
              {!searchTerm && customerTypeFilter === "all" && (
                <Button onClick={() => setShowAddModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Customer
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              {isMobile ? (
                <div className="space-y-4 p-4">
                  {filteredAndSortedCustomers.map((customer) => (
                    <Card key={customer.id} className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-medium text-lg">{customer.name}</h3>
                          <Badge className={getCustomerTypeColor(customer.customerType)}>
                            {customer.customerType.toUpperCase()}
                          </Badge>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost">
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
                            <DropdownMenuItem onClick={() => handleDeleteClick(customer)}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <span>{customer.phone || "No phone"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span className="truncate">{customer.email || "No email"}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t">
                          <div className="text-center">
                            <div className="font-medium">{customer.totalOrders}</div>
                            <div className="text-xs text-gray-500">Orders</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium">{formatCurrency(customer.totalSpent, currency)}</div>
                            <div className="text-xs text-gray-500">Total Spent</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs">
                              {customer.lastOrderDate ? formatDateInTimezone(customer.lastOrderDate) : "No orders"}
                            </div>
                            <div className="text-xs text-gray-500">Last Order</div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                /* Desktop Table View */
                <div className="overflow-x-auto">
                  <Table className="w-full">
                    <TableHeader className="bg-muted sticky top-0 z-10">
                      <TableRow>
                        <TableHead 
                          className="cursor-pointer select-none whitespace-nowrap"
                          onClick={() => handleSort("name")}
                        >
                          <div className="flex items-center gap-2">
                            Customer
                            {getSortIcon("name")}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer select-none whitespace-nowrap"
                          onClick={() => handleSort("customerType")}
                        >
                          <div className="flex items-center gap-2">
                            Type
                            {getSortIcon("customerType")}
                          </div>
                        </TableHead>
                        {!isTablet && <TableHead className="whitespace-nowrap">Phone</TableHead>}
                        {!isTablet && <TableHead className="whitespace-nowrap">Email</TableHead>}
                        <TableHead 
                          className="cursor-pointer select-none text-right whitespace-nowrap"
                          onClick={() => handleSort("totalOrders")}
                        >
                          <div className="flex items-center justify-end gap-2">
                            Orders
                            {getSortIcon("totalOrders")}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer select-none text-right whitespace-nowrap"
                          onClick={() => handleSort("totalSpent")}
                        >
                          <div className="flex items-center justify-end gap-2">
                            Total Spent
                            {getSortIcon("totalSpent")}
                          </div>
                        </TableHead>
                        {!isTablet && (
                          <TableHead 
                            className="cursor-pointer select-none whitespace-nowrap"
                            onClick={() => handleSort("lastOrderDate")}
                          >
                            <div className="flex items-center gap-2">
                              Last Order
                              {getSortIcon("lastOrderDate")}
                            </div>
                          </TableHead>
                        )}
                        <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAndSortedCustomers.map((customer) => (
                        <TableRow key={customer.id} className="hover:bg-gray-50">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div>
                                <div className="font-medium">{customer.name}</div>
                                {/* Show phone/email on tablet when columns are hidden */}
                                {isTablet && (
                                  <div className="text-xs text-gray-500 space-y-1">
                                    {customer.phone && <div>{customer.phone}</div>}
                                    {customer.email && <div className="truncate max-w-[150px]">{customer.email}</div>}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getCustomerTypeColor(customer.customerType)}>
                              {customer.customerType.toUpperCase()}
                            </Badge>
                          </TableCell>
                          {!isTablet && (
                            <TableCell>
                              {customer.phone || <span className="text-gray-400 italic">No phone</span>}
                            </TableCell>
                          )}
                          {!isTablet && (
                            <TableCell>
                              {customer.email ? (
                                <span className="truncate max-w-[150px]">{customer.email}</span>
                              ) : (
                                <span className="text-gray-400 italic">No email</span>
                              )}
                            </TableCell>
                          )}
                          <TableCell className="text-right">
                            <div className="font-medium">{customer.totalOrders}</div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="font-medium">{formatCurrency(customer.totalSpent, currency)}</div>
                          </TableCell>
                          {!isTablet && (
                            <TableCell className="whitespace-nowrap">
                              {customer.lastOrderDate ? (
                                <div className="text-sm">
                                  {formatDateInTimezone(customer.lastOrderDate)}
                                </div>
                              ) : (
                                <div className="text-sm text-gray-400">No orders</div>
                              )}
                            </TableCell>
                          )}
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="icon" variant="ghost" className="visible">
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
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteClick(customer)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
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
      </div>
    </SidebarInset>
  );
}
