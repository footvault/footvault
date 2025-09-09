"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Mail, Phone, MapPin, Calendar, DollarSign, Package, Edit, Loader2 } from "lucide-react"
import { formatCurrency } from "@/lib/utils/currency"
import { useCurrency } from "@/context/CurrencyContext"
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

interface CustomerDetailModalProps {
  customer: Customer;
  onClose: () => void;
  onEdit: () => void;
}

interface OrderHistory {
  id: string;
  saleDate: string;
  totalAmount: number;
  items: Array<{
    productName: string;
    size: string;
    price: number;
  }>;
}

export function CustomerDetailModal({ customer, onClose, onEdit }: CustomerDetailModalProps) {
  const { currency } = useCurrency();
  const [orderHistory, setOrderHistory] = useState<OrderHistory[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);

  useEffect(() => {
    const fetchOrderHistory = async () => {
      try {
        const response = await fetch(`/api/customers/${customer.id}/orders`);
        if (response.ok) {
          const orders = await response.json();
          setOrderHistory(orders);
        }
      } catch (error) {
        console.error('Failed to fetch order history:', error);
      } finally {
        setIsLoadingOrders(false);
      }
    };

    fetchOrderHistory();
  }, [customer.id]);

  const getCustomerTypeColor = (type: string) => {
    switch (type) {
      case "vip": return "bg-purple-100 text-purple-800 border-purple-200";
      case "wholesale": return "bg-blue-100 text-blue-800 border-blue-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const formatAddress = () => {
    const parts = [customer.address, customer.city, customer.state, customer.zipCode, customer.country]
      .filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle className="flex items-center gap-3">
                {customer.name}
                <Badge className={getCustomerTypeColor(customer.customerType)}>
                  {customer.customerType.toUpperCase()}
                </Badge>
              </DialogTitle>
              <p className="text-sm text-gray-600 mt-1">
                Customer since {format(new Date(customer.createdAt), 'MMM d, yyyy')}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Customer Details</TabsTrigger>
            <TabsTrigger value="orders">Order History ({customer.totalOrders})</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {customer.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span>{customer.email}</span>
                  </div>
                )}
                {customer.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span>{customer.phone}</span>
                  </div>
                )}
                {formatAddress() && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                    <span>{formatAddress()}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Purchase Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Purchase Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{customer.totalOrders}</div>
                    <div className="text-sm text-gray-600">Total Orders</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(customer.totalSpent, currency)}
                    </div>
                    <div className="text-sm text-gray-600">Total Spent</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {customer.totalOrders > 0 
                        ? formatCurrency(customer.totalSpent / customer.totalOrders, currency)
                        : formatCurrency(0, currency)
                      }
                    </div>
                    <div className="text-sm text-gray-600">Average Order</div>
                  </div>
                </div>
                {customer.lastOrderDate && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      Last order: {format(new Date(customer.lastOrderDate), 'MMM d, yyyy')}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            {customer.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 whitespace-pre-wrap">{customer.notes}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="orders" className="space-y-4">
            {isLoadingOrders ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-600">Loading order history...</span>
              </div>
            ) : orderHistory.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Orders Yet</h3>
                  <p className="text-gray-600">This customer hasn't placed any orders.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {orderHistory.map((order) => (
                  <Card key={order.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold">Order #{order.id}</h4>
                          <p className="text-sm text-gray-600">
                            {format(new Date(order.saleDate), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-lg">
                            {formatCurrency(order.totalAmount, currency)}
                          </div>
                          <div className="text-sm text-gray-600">
                            {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {order.items.map((item, index) => (
                          <div key={index} className="flex justify-between items-center text-sm border-t pt-2">
                            <span>{item.productName} - Size {item.size}</span>
                            <span className="font-medium">{formatCurrency(item.price, currency)}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
