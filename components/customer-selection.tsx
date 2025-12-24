"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, User, UserPlus, Phone, Filter } from "lucide-react"
import { toast } from "sonner"

interface Customer {
  id: number;
  name: string;
  email: string | null;
  phone: string;
  customer_type: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  country?: string | null;
}

interface CustomerSelectionProps {
  selectedCustomerId?: number | null;
  onCustomerSelect: (customer: Customer | null) => void;
  manualCustomerName?: string;
  manualCustomerPhone?: string;
  manualCustomerType?: string;
  onManualCustomerChange?: (name: string, phone: string, customerType?: string) => void;
  showManualEntry?: boolean;
  onSaveCustomer?: (customerData: { name: string; phone: string; customer_type: string }) => void;
}

export function CustomerSelection({
  selectedCustomerId,
  onCustomerSelect,
  manualCustomerName = "",
  manualCustomerPhone = "",
  manualCustomerType = "regular",
  onManualCustomerChange,
  showManualEntry = true,
  onSaveCustomer
}: CustomerSelectionProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [customerTypeFilter, setCustomerTypeFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("existing");
  
  // Manual entry form state
  const [manualName, setManualName] = useState(manualCustomerName);
  const [manualPhone, setManualPhone] = useState(manualCustomerPhone);

  const [manualType, setManualType] = useState(manualCustomerType);

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    setManualName(manualCustomerName);
    setManualPhone(manualCustomerPhone);
    setManualType(manualCustomerType);
  }, [manualCustomerName, manualCustomerPhone, manualCustomerType]);

  useEffect(() => {
    // Filter customers based on search term and type filter
    let filtered = customers.filter(customer =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm) ||
      (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Apply type filter
    if (customerTypeFilter !== "all") {
      filtered = filtered.filter(customer => customer.customer_type === customerTypeFilter);
    }

    // Limit results for performance: show 50 by default, or all if actively searching
    const limit = searchTerm.length > 0 ? 100 : 50;
    setFilteredCustomers(filtered.slice(0, limit));
  }, [customers, searchTerm, customerTypeFilter]);

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers/list');
      if (response.ok) {
        const data = await response.json();
        setCustomers(data);
        setFilteredCustomers(data);
      } else {
        toast.error('Failed to fetch customers');
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Failed to fetch customers');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAsCustomer = async () => {
    if (!manualName.trim() || !manualPhone.trim()) {
      toast.error('Name and phone number are required');
      return;
    }

    // Use the callback to save customer data for later use during checkout
    const customerData = {
      name: manualName.trim(),
      phone: manualPhone.trim(),
      customer_type: manualType,
    };
    
    onSaveCustomer?.(customerData);
  };

  const handleManualEntryChange = (name: string, phone: string, customerType: string = "regular") => {
    setManualName(name);
    setManualPhone(phone);
    setManualType(customerType);
    onManualCustomerChange?.(name, phone, customerType);
    
    // Automatically prepare customer data for saving during checkout
    if (name.trim() && phone.trim()) {
      const customerData = {
        name: name.trim(),
        phone: phone.trim(),
        customer_type: customerType,
      };
      console.log('Preparing customer data for saving:', customerData);
      onSaveCustomer?.(customerData);
    }
  };

  const getCustomerTypeColor = (type: string) => {
    switch (type) {
      case "vip": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "wholesale": return "bg-purple-100 text-purple-800 border-purple-200";
      default: return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="existing" className="flex items-center gap-2">
          <User className="h-4 w-4" />
          Select Existing
        </TabsTrigger>
        <TabsTrigger value="manual" className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Manual Entry
        </TabsTrigger>
      </TabsList>

      <TabsContent value="existing" className="space-y-4">
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search customers by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={customerTypeFilter} onValueChange={setCustomerTypeFilter}>
              <SelectTrigger className="w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="regular">Regular</SelectItem>
                <SelectItem value="vip">VIP</SelectItem>
                <SelectItem value="wholesale">Wholesale</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="text-center py-4 text-gray-500">Loading customers...</div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              {searchTerm || customerTypeFilter !== "all" ? "No customers found matching your criteria" : "No customers available"}
            </div>
          ) : (
            <>
              <div className="max-h-48 overflow-y-auto overflow-x-hidden space-y-2">
                {filteredCustomers.map((customer) => (
                  <Card
                    key={customer.id}
                    className={`cursor-pointer transition-colors hover:bg-gray-50 ${
                      selectedCustomerId === customer.id ? 'border-blue-500 bg-blue-50' : ''
                    }`}
                    onClick={() => onCustomerSelect(customer)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <User className="h-4 w-4 text-gray-500" />
                          <div>
                            <div className="font-medium truncate">{customer.name}</div>
                            <div className="text-sm text-gray-500 flex items-center gap-2 truncate">
                              <Phone className="h-3 w-3" />
                              <span className="truncate">{customer.phone}</span>
                            </div>
                          </div>
                        </div>
                        <Badge className={getCustomerTypeColor(customer.customer_type)}>
                          {customer.customer_type.toUpperCase()}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {(() => {
                const totalMatches = customers.filter(customer => {
                  let matches = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    customer.phone.includes(searchTerm) ||
                    (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase()));
                  if (customerTypeFilter !== "all") {
                    matches = matches && customer.customer_type === customerTypeFilter;
                  }
                  return matches;
                }).length;
                const showing = filteredCustomers.length;
                
                if (totalMatches > showing) {
                  return (
                    <div className="text-center text-sm text-gray-500 py-2">
                      Showing {showing} of {totalMatches} customers. {searchTerm.length === 0 ? 'Use search to find specific customers.' : 'Refine your search to see more specific results.'}
                    </div>
                  );
                }
                return null;
              })()}
            </>
          )}
        </div>
      </TabsContent>

      <TabsContent value="manual" className="space-y-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="manual-name">Customer Name *</Label>
            <Input
              id="manual-name"
              value={manualName}
              onChange={(e) => handleManualEntryChange(e.target.value, manualPhone, manualType)}
              placeholder="Enter customer name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="manual-phone">Phone Number *</Label>
            <Input
              id="manual-phone"
              value={manualPhone}
              onChange={(e) => handleManualEntryChange(manualName, e.target.value, manualType)}
              placeholder="Enter phone number"
              type="tel"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="manual-type">Customer Type</Label>
            <Select value={manualType} onValueChange={(value) => handleManualEntryChange(manualName, manualPhone, value)}>
              <SelectTrigger id="manual-type">
                <SelectValue placeholder="Select customer type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="regular">Regular</SelectItem>
                <SelectItem value="vip">VIP</SelectItem>
                <SelectItem value="wholesale">Wholesale</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm text-gray-500 bg-blue-50 p-3 rounded-lg border border-blue-200">
            💡 Customer will be automatically saved when you complete the checkout.
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
