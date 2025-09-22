"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Search, Plus, Package, Calendar as CalendarIcon, DollarSign, Eye, Edit, Clock, CheckCircle, XCircle, User, TrendingUp, CreditCard, AlertCircle, ArrowUpDown, ArrowUp, ArrowDown, MoreHorizontal, Trash2, Download, AlertTriangle, Ban, RotateCcw } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { formatCurrency } from "@/lib/utils/currency"
import { useCurrency } from "@/context/CurrencyContext"
import { format } from "date-fns"
import { createClient } from "@/lib/supabase/client"
import { toast } from "@/hooks/use-toast"
import Image from "next/image"
import { cn } from "@/lib/utils"

interface Preorder {
  id: number;
  customer_id: number;
  product_id: number;
  variant_id: number | null;
  size: string | null;
  size_label: string | null;
  status: string;
  cost_price: number;
  total_amount: number;
  down_payment: number | null;
  remaining_balance: number;
  expected_delivery_date: string | null;
  completed_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  pre_order_no: number; // Add pre-order number field
  customer: {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    zip_code: string | null;
    country: string | null;
  };
  product: {
    name: string;
    brand: string;
    sku: string;
    image: string | null;
  };
}

interface ProfitDistributionTemplate {
  id: string;
  name: string;
  description: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

interface PaymentType {
  id: string;
  name: string;
  fee_type: string;
  fee_value: number;
  applies_to: string;
}

interface Avatar {
  image_url: string
  id: string;
  name: string;
  image?: string;
  type: string;
  user_id: string;
  default_percentage: number;
}

interface PreordersPageClientProps {
  initialPreorders: Preorder[]
  error?: string
}

export function PreordersPageClient({ initialPreorders, error }: PreordersPageClientProps) {
  const { currency } = useCurrency();
  const router = useRouter();
  const [preorders, setPreorders] = useState<Preorder[]>(initialPreorders);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  
  // Date filtering states
  const [dateFilter, setDateFilter] = useState<string>("thisMonth");
  const [customDateFrom, setCustomDateFrom] = useState<Date | undefined>();
  const [customDateTo, setCustomDateTo] = useState<Date | undefined>();
  
  const [showDatePicker, setShowDatePicker] = useState(false);

  // State for caching data fetches
  const [lastDataFetchTime, setLastDataFetchTime] = useState<number>(0);

  // Fetch profit distribution templates and payment types with caching
  useEffect(() => {
    const fetchData = async () => {
      // Only fetch if it's been more than 60 seconds since last fetch
      const now = Date.now();
      if (now - lastDataFetchTime < 60000) return;
      
      console.time('fetchPreorderData');
      const supabase = createClient();
      
      try {
        // Get the current user first
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          console.error('No authenticated user found:', userError);
          return;
        }

        // Batch all queries for better performance
        const [templatesResult, paymentsResult, avatarsResult] = await Promise.all([
          supabase
            .from('profit_distribution_templates')
            .select(`
              *,
              profit_template_items (
                id,
                avatar_id,
                percentage,
                avatars (
                  id,
                  name,
                  image,
                  type
                )
              )
            `)
            .eq('user_id', user.id)
            .order('name', { ascending: true }),
          
          supabase
            .from('payment_types')
            .select('*')
            .order('name', { ascending: true }),
          
          supabase
            .from('avatars')
            .select('*')
            .eq('user_id', user.id)
            .order('type', { ascending: true })
        ]);

        if (templatesResult.error) throw templatesResult.error;
        if (paymentsResult.error) throw paymentsResult.error;
        if (avatarsResult.error) throw avatarsResult.error;

        setProfitTemplates(templatesResult.data || []);
        setPaymentTypes(paymentsResult.data || []);
        setAvatars(avatarsResult.data || []);
        setLastDataFetchTime(now);
        
        console.log('Preorder data loaded:', {
          templates: templatesResult.data?.length,
          payments: paymentsResult.data?.length,
          avatars: avatarsResult.data?.length
        });
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        console.timeEnd('fetchPreorderData');
      }
    };

    fetchData();
  }, [lastDataFetchTime]);
  
  // Modal states
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [editingPreorder, setEditingPreorder] = useState<Preorder | null>(null);
  const [selectedPreorder, setSelectedPreorder] = useState<Preorder | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Preorder['customer'] | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // New states for profit distribution and payment type
  const [profitTemplates, setProfitTemplates] = useState<ProfitDistributionTemplate[]>([]);
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [cancelForm, setCancelForm] = useState({
    paymentType: '',
    profitTemplateId: 'main',
    notes: ''
  });
  
  // Manual distribution state
  const [manualDistribution, setManualDistribution] = useState<Record<string, number>>({});
  
  // Reset manual distribution when template changes
  useEffect(() => {
    if (cancelForm.profitTemplateId === 'manual') {
      // Initialize with equal distribution
      const equalPercentage = avatars.length > 0 ? 100 / avatars.length : 0;
      const initialDistribution: Record<string, number> = {};
      avatars.forEach(avatar => {
        initialDistribution[avatar.id] = equalPercentage;
      });
      setManualDistribution(initialDistribution);
    } else {
      setManualDistribution({});
    }
  }, [cancelForm.profitTemplateId, avatars]);
  
  // Calculate total percentage for manual distribution
  const totalManualPercentage = Object.values(manualDistribution).reduce((sum, percentage) => sum + (percentage || 0), 0);
  
  // Update manual distribution percentage
  const updateManualPercentage = (avatarId: string, percentage: number) => {
    setManualDistribution(prev => ({
      ...prev,
      [avatarId]: Math.max(0, Math.min(100, percentage || 0)) // Clamp between 0-100
    }));
  };
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    total_amount: 0,
    down_payment: 0,
    remaining_balance: 0,
    expected_delivery_date: '',
    notes: ''
  });
  
  // Status update form
  const [statusForm, setStatusForm] = useState({
    status: "",
    notes: ""
  });

  // Date filter helper function
  const getDateRange = (filter: string): { from: Date; to: Date } | null => {
    const now = new Date();
    const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const endOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

    switch (filter) {
      case "thisMonth":
        return {
          from: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)),
          to: endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0))
        };
      case "3months":
        return {
          from: startOfDay(new Date(now.getFullYear(), now.getMonth() - 2, 1)),
          to: endOfDay(now)
        };
      case "year":
        return {
          from: startOfDay(new Date(now.getFullYear(), 0, 1)),
          to: endOfDay(new Date(now.getFullYear(), 11, 31))
        };
      case "custom":
        if (customDateFrom && customDateTo) {
          return {
            from: startOfDay(customDateFrom),
            to: endOfDay(customDateTo)
          };
        }
        return null;
      default:
        return null;
    }
  };

  // Filter preorders by date
  const getFilteredPreordersByDate = (preorders: Preorder[]) => {
    if (dateFilter === "all") return preorders;
    
    const dateRange = getDateRange(dateFilter);
    if (!dateRange) return preorders;

    return preorders.filter(preorder => {
      const createdAt = new Date(preorder.created_at);
      return createdAt >= dateRange.from && createdAt <= dateRange.to;
    });
  };
  const handleCustomerClick = (customer: Preorder['customer']) => {
    setSelectedCustomer(customer);
    setShowCustomerModal(true);
  };

  const handleStatusUpdate = (preorder: Preorder) => {
    setSelectedPreorder(preorder);
    setStatusForm({
      status: preorder.status,
      notes: preorder.notes || ""
    });
    setShowStatusModal(true);
  };

  const handleEdit = (preorder: Preorder) => {
    setSelectedPreorder(preorder);
    setEditForm({
      total_amount: preorder.total_amount,
      down_payment: preorder.down_payment || 0,
      remaining_balance: preorder.remaining_balance,
      expected_delivery_date: preorder.expected_delivery_date || '',
      notes: preorder.notes || ''
    });
    setShowEditModal(true);
  };

  const handleDelete = (preorder: Preorder) => {
    // Check if pre-order can be deleted
    if (preorder.status === 'completed') {
      toast({
        title: "Cannot Delete",
        description: "Completed pre-orders cannot be deleted. Please delete the associated sale first.",
        variant: "destructive",
      });
      return;
    }
    
    // Also prevent deletion of cancelled orders
    if (preorder.status === 'canceled') {
      toast({
        title: "Cannot Delete",
        description: "Cancelled pre-orders cannot be deleted as they have been converted to sales.",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedPreorder(preorder);
    setShowDeleteModal(true);
  };

  const handleVoid = (preorder: Preorder) => {
    setSelectedPreorder(preorder);
    setShowVoidModal(true);
  };

  const handleRestore = (preorder: Preorder) => {
    setSelectedPreorder(preorder);
    setShowRestoreModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedPreorder) return;
    
    setIsDeleting(true);
    const supabase = createClient();
    
    try {
      const { error } = await supabase
        .from('pre_orders')
        .delete()
        .eq('id', selectedPreorder.id);

      if (error) throw error;

      // Remove from local state
      setPreorders(prev => prev.filter(p => p.id !== selectedPreorder.id));
      
      toast({
        title: "Pre-order Deleted",
        description: "Pre-order has been successfully deleted.",
      });

      setShowDeleteModal(false);
      setSelectedPreorder(null);
    } catch (error) {
      console.error('Error deleting pre-order:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete pre-order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmVoid = async () => {
    if (!selectedPreorder) return;
    
    setIsUpdating(true);
    
    try {
      await updatePreOrderStatus(selectedPreorder.id, 'voided', 'Pre-order voided');
      
      // Update local state
      setPreorders(prev => prev.map(p => 
        p.id === selectedPreorder.id 
          ? { ...p, status: 'voided', notes: 'Pre-order voided' }
          : p
      ));

      toast({
        title: "Pre-order Voided",
        description: "Pre-order has been voided successfully.",
      });

      setShowVoidModal(false);
      setSelectedPreorder(null);
    } catch (error) {
      console.error('Error voiding pre-order:', error);
      toast({
        title: "Void Failed",
        description: "Failed to void pre-order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const confirmRestore = async () => {
    if (!selectedPreorder) return;
    
    setIsUpdating(true);
    const supabase = createClient();
    
    try {
      console.log('Starting restore for pre-order:', selectedPreorder.id);
      
      // Get the current user for authentication
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Authentication required');
      }

      // Check if this is a cancelled pre-order that created a sale
      if (selectedPreorder.status === 'canceled') {
        console.log('Restoring cancelled pre-order - need to clean up sale and variant');
        
        // Find the sale created from this cancelled pre-order
        // Look for sales that have variants with notes mentioning this pre-order number
        const { data: salesWithVariants, error: salesError } = await supabase
          .from('sales')
          .select(`
            id,
            sale_items!inner (
              id,
              variant:variants!inner (
                id,
                type,
                notes
              )
            )
          `)
          .eq('user_id', user.id);

        if (salesError) {
          console.error('Error finding sales:', salesError);
          throw salesError;
        }

        // Find the sale that was created from this cancelled pre-order
        const relatedSale = salesWithVariants?.find(sale =>
          sale.sale_items.some((item: any) =>
            item.variant.type === 'downpayment' &&
            item.variant.notes?.includes(`pre-order #${selectedPreorder.pre_order_no}`)
          )
        );

        if (relatedSale) {
          console.log('Found related sale to delete:', relatedSale.id);
          
          // Get the variant ID from the sale item
          const variantToDelete = relatedSale.sale_items.find((item: any) =>
            item.variant.type === 'downpayment' &&
            item.variant.notes?.includes(`pre-order #${selectedPreorder.pre_order_no}`)
          )?.variant;

          if (variantToDelete) {
            // If variantToDelete is an array, get the first element
            // Explicitly type variantToDelete as any to avoid TS 'never' error
            const variantToDeleteTyped = variantToDelete as any;
            const variantId = Array.isArray(variantToDeleteTyped) ? variantToDeleteTyped[0]?.id : variantToDeleteTyped.id;
            console.log('Found variant to delete:', variantId);
            
            // Delete in proper order to respect foreign key constraints:
            // 1. Delete sale_items first (they reference variants)
            console.log('Deleting sale_items...');
            const { error: saleItemsDeleteError } = await supabase
              .from('sale_items')
              .delete()
              .eq('sale_id', relatedSale.id);

            if (saleItemsDeleteError) {
              console.error('Error deleting sale_items:', saleItemsDeleteError);
              throw saleItemsDeleteError;
            }
            console.log('Sale items deleted successfully');

            // 2. Delete profit distributions
            console.log('Deleting profit distributions...');
            const { error: profitDistDeleteError } = await supabase
              .from('sale_profit_distributions')
              .delete()
              .eq('sale_id', relatedSale.id);

            if (profitDistDeleteError) {
              console.error('Error deleting profit distributions:', profitDistDeleteError);
              throw profitDistDeleteError;
            }
            console.log('Profit distributions deleted successfully');

            // 3. Delete the sale
            console.log('Deleting sale...');
            const { error: saleDeleteError } = await supabase
              .from('sales')
              .delete()
              .eq('id', relatedSale.id);

            if (saleDeleteError) {
              console.error('Error deleting sale:', saleDeleteError);
              throw saleDeleteError;
            }
            console.log('Sale deleted successfully');

            // 4. Finally delete the variant
            console.log('Deleting variant...');
            const { error: variantDeleteError } = await supabase
              .from('variants')
              .delete()
              .eq('id', variantId);

            if (variantDeleteError) {
              console.error('Error deleting variant:', variantDeleteError);
              throw variantDeleteError;
            }
            console.log('Variant deleted successfully');
          }
        } else {
          console.log('No related sale found for this cancelled pre-order');
        }
      }

      // Update pre-order status back to pending
      await updatePreOrderStatus(selectedPreorder.id, 'pending', 'Pre-order restored from cancelled status');
      
      // Update local state
      setPreorders(prev => prev.map(p => 
        p.id === selectedPreorder.id 
          ? { ...p, status: 'pending', notes: 'Pre-order restored from cancelled status' }
          : p
      ));

      toast({
        title: "Pre-order Restored",
        description: selectedPreorder.status === 'canceled' 
          ? "Cancelled pre-order has been restored to pending status. Associated sale and variant have been cleaned up."
          : "Pre-order has been restored to pending status.",
      });

      setShowRestoreModal(false);
      setSelectedPreorder(null);
    } catch (error) {
      console.error('Error restoring pre-order:', error);
      toast({
        title: "Restore Failed",
        description: "Failed to restore pre-order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const submitEdit = async () => {
    if (!selectedPreorder) return;
    
    setIsUpdating(true);
    const supabase = createClient();
    
    try {
      // Calculate remaining balance for local state only (DB will auto-calculate)
      const remaining_balance = editForm.total_amount - editForm.down_payment;
      
      const { error } = await supabase
        .from('pre_orders')
        .update({
          total_amount: editForm.total_amount,
          down_payment: editForm.down_payment,
          // Remove remaining_balance from update - it's a generated column
          expected_delivery_date: editForm.expected_delivery_date || null,
          notes: editForm.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedPreorder.id);

      if (error) throw error;

      // Update local state
      setPreorders(prev => prev.map(p => 
        p.id === selectedPreorder.id 
          ? { 
              ...p, 
              total_amount: editForm.total_amount,
              down_payment: editForm.down_payment,
              remaining_balance: remaining_balance,
              expected_delivery_date: editForm.expected_delivery_date || null,
              notes: editForm.notes
            }
          : p
      ));

      toast({
        title: "Pre-order Updated",
        description: "Pre-order has been successfully updated.",
      });

      setShowEditModal(false);
      setSelectedPreorder(null);
    } catch (error) {
      console.error('Error updating pre-order:', error);
      console.error('Full error details:', JSON.stringify(error, null, 2));
      toast({
        title: "Update Failed",
        description: (typeof error === "object" && error !== null && "message" in error)
          ? (error as any).message
          : "Failed to update pre-order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const submitStatusUpdate = async () => {
    if (!selectedPreorder) return;
    
    setIsUpdating(true);
    const supabase = createClient();
    
    try {
      console.log('Updating status from:', selectedPreorder.status, 'to:', statusForm.status);
      
      // Handle status updates (no sale conversion here anymore)
      if (statusForm.status === 'canceled') {
        // For canceled orders, we could optionally create a deposit sale here if needed
        // But for now, just update the status
        await updatePreOrderStatus(selectedPreorder.id, 'canceled', statusForm.notes);
      } else {
        // Regular status update (pending, confirmed, voided)
        // Map UI status to database-compliant status
        let dbStatus = statusForm.status;
        if (statusForm.status === 'voided') dbStatus = 'voided';
        
        await updatePreOrderStatus(selectedPreorder.id, dbStatus, statusForm.notes);
      }

      // Update local state with the database status (not UI status)
      const dbStatus = statusForm.status === 'voided' ? 'voided' : 
                      statusForm.status === 'canceled' ? 'canceled' : statusForm.status;
      
      setPreorders(prev => prev.map(p => 
        p.id === selectedPreorder.id 
          ? { ...p, status: dbStatus as any, notes: statusForm.notes }
          : p
      ));

      setShowStatusModal(false);
      setSelectedPreorder(null);
    } catch (error) {
      console.error('Error updating status:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
    } finally {
      setIsUpdating(false);
    }
  };

  // Helper function to update pre-order status
  const updatePreOrderStatus = async (preOrderId: number, status: string, notes: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('pre_orders')
      .update({
        status: status,
        notes: notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', preOrderId);

    if (error) throw error;
  };

  // Convert pre-order to sale
  const convertPreOrderToSale = async (preorder: Preorder) => {
    console.log('Converting pre-order to sale:', preorder);
    const supabase = createClient();
    
    try {
      // Get the user for sales numbering
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Authentication required');
      }

      let variantId = preorder.variant_id;

      // If no variant exists, create one based on the pre-order information
      if (!variantId) {
        console.log('Creating variant for pre-order:', preorder);
        
        // Get the highest serial_number for this user to continue numbering
        const { data: maxSerialData, error: maxSerialError } = await supabase
          .from("variants")
          .select("serial_number")
          .eq("user_id", user.id)
          .order("serial_number", { ascending: false })
          .limit(1)
          .maybeSingle();

        let nextSerial = 1;
        if (!maxSerialError && maxSerialData && maxSerialData.serial_number) {
          const last = parseInt(maxSerialData.serial_number, 10);
          nextSerial = isNaN(last) ? 1 : last + 1;
        }
        
        const variantInsert = {
          id: crypto.randomUUID(), // Generate UUID for the id field
          product_id: preorder.product_id,
          size: preorder.size,
          size_label: preorder.size_label,
          serial_number: nextSerial, // Use numeric serial number
          variant_sku: `${preorder.product.sku}-${preorder.size || 'NOSIZE'}-${nextSerial}`,
          cost_price: preorder.cost_price,
          status: 'Available', // Will be changed to 'Sold' after sale
          user_id: user.id,
          date_added: new Date().toISOString().slice(0, 10), // YYYY-MM-DD format
          location: 'Store', // Default location for pre-order variants
          type: 'Pre-order', // Mark as Pre-order type
          notes: `Created from pre-order #${preorder.id}`
        };

        const { data: variantData, error: variantError } = await supabase
          .from('variants')
          .insert([variantInsert])
          .select('*')
          .single();

        if (variantError) {
          console.error('Error creating variant:', variantError);
          throw variantError;
        }

        variantId = variantData.id;
        console.log('Created variant with ID:', variantId);
      }

      // Get the next sales number
      let nextSalesNo = 1;
      const { data: maxSalesNoData, error: maxSalesNoError } = await supabase
        .from('sales')
        .select('sales_no')
        .eq('user_id', user.id)
        .order('sales_no', { ascending: false })
        .limit(1)
        .single();

      if (!maxSalesNoError && maxSalesNoData && maxSalesNoData.sales_no) {
        nextSalesNo = maxSalesNoData.sales_no + 1;
      }

      // Create the sale record
      const saleInsert = {
        sale_date: new Date().toISOString().split('T')[0], // Today's date
        total_amount: preorder.total_amount,
        total_discount: 0, // Pre-orders don't have discounts
        net_profit: preorder.total_amount - preorder.cost_price,
        customer_name: preorder.customer.name,
        customer_phone: preorder.customer.phone,
        user_id: user.id,
        payment_type: { name: 'Pre-order Conversion' },
        sales_no: nextSalesNo,
        payment_received: preorder.total_amount,
        change_amount: 0,
        additional_charge: 0
      };

      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert([saleInsert])
        .select('*')
        .single();

      if (saleError) throw saleError;

      // Create sale item with the variant ID
      const saleItemInsert = {
        variant_id: variantId,
        sold_price: preorder.total_amount,
        cost_price: preorder.cost_price,
        quantity: 1,
        sale_id: saleData.id,
      };

      const { error: itemError } = await supabase
        .from('sale_items')
        .insert([saleItemInsert]);

      if (itemError) throw itemError;

      // Update variant status to 'Sold'
      const { error: updateError } = await supabase
        .from('variants')
        .update({ 
          status: 'Sold',
          date_sold: new Date().toISOString().split('T')[0] // Add date_sold
        })
        .eq('id', variantId);

      if (updateError) {
        console.error('Warning: Could not update variant status:', updateError);
      }

      // Update the pre-order status to 'completed' instead of deleting it (keep as history)
      const { error: updatePreorderError } = await supabase
        .from('pre_orders')
        .update({
          status: 'completed', // Use actual constraint value - 'completed' means paid and converted
          completed_date: new Date().toISOString().split('T')[0], // Use date format for date field
          updated_at: new Date().toISOString()
        })
        .eq('id', preorder.id);

      if (updatePreorderError) throw updatePreorderError;

      // Update local state to reflect the status change
      setPreorders(prev => prev.map(p => 
        p.id === preorder.id 
          ? { ...p, status: 'completed', completed_date: new Date().toISOString().split('T')[0] }
          : p
      ));

      toast({
        title: "Pre-order Converted",
        description: `Pre-order has been successfully converted to Sale #${nextSalesNo}`,
      });

    } catch (error) {
      console.error('Error converting pre-order to sale:', error);
      toast({
        title: "Conversion Failed", 
        description: "Failed to convert pre-order to sale. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Create sale for deposit amount (for canceled orders)
  const createDepositSale = async (preorder: Preorder) => {
    console.log('Creating deposit sale for canceled order:', preorder);
    const supabase = createClient();
    
    try {
      // Get the user for sales numbering
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Authentication required');
      }

      // Get the next sales number
      let nextSalesNo = 1;
      const { data: maxSalesNoData, error: maxSalesNoError } = await supabase
        .from('sales')
        .select('sales_no')
        .eq('user_id', user.id)
        .order('sales_no', { ascending: false })
        .limit(1)
        .single();

      if (!maxSalesNoError && maxSalesNoData && maxSalesNoData.sales_no) {
        nextSalesNo = maxSalesNoData.sales_no + 1;
      }

      // Create the deposit sale record (only for the deposit amount)
      const depositAmount = preorder.down_payment || 0;
      const saleInsert = {
        sale_date: new Date().toISOString().split('T')[0], // Today's date
        total_amount: depositAmount,
        total_discount: 0,
        net_profit: depositAmount, // Deposit is pure profit since order was canceled
        customer_name: preorder.customer.name,
        customer_phone: preorder.customer.phone,
        user_id: user.id,
        payment_type: { name: 'Canceled Pre-order Deposit' },
        sales_no: nextSalesNo,
        payment_received: depositAmount,
        change_amount: 0,
        additional_charge: 0
      };

      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert([saleInsert])
        .select('*')
        .single();

      if (saleError) throw saleError;

      // Create a sale item for the deposit (using a special description)
      const saleItemInsert = {
        variant_id: null, // No actual product sold
        sold_price: depositAmount,
        cost_price: 0, // No cost for deposit
        quantity: 1,
        sale_id: saleData.id,
      };

      const { error: itemError } = await supabase
        .from('sale_items')
        .insert([saleItemInsert]);

      if (itemError) throw itemError;

      toast({
        title: "Deposit Sale Created",
        description: `Deposit amount ${formatCurrency(depositAmount, currency)} converted to Sale #${nextSalesNo}`,
      });

    } catch (error) {
      console.error('Error creating deposit sale:', error);
      toast({
        title: "Deposit Sale Failed", 
        description: "Failed to create deposit sale. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const convertToSale = async (preorder: Preorder) => {
    // Implementation for converting pre-order to sale
    console.log('Converting to sale:', preorder);
  };

  // Status utility functions
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'paid':
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'voided':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'canceled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'refunds':
      case 'refunded':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return <Clock className="h-3 w-3" />;
      case 'paid':
      case 'completed':
        return <CheckCircle className="h-3 w-3" />;
      case 'confirmed':
        return <CheckCircle className="h-3 w-3" />;
      case 'voided':
        return <XCircle className="h-3 w-3" />;
      case 'canceled':
        return <XCircle className="h-3 w-3" />;
      case 'refunds':
      case 'refunded':
        return <AlertCircle className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  // New action handlers for specific status changes
  const handleVoidPreorder = async (preorder: Preorder) => {
    setIsUpdating(true);
    try {
      await updatePreOrderStatus(preorder.id, 'voided', 'Pre-order voided - did not go through');
      
      setPreorders(prev => prev.map(p => 
        p.id === preorder.id 
          ? { ...p, status: 'voided', notes: 'Pre-order voided - did not go through' }
          : p
      ));
      
      toast({
        title: "Pre-order Voided",
        description: "Pre-order has been marked as voided. It will not impact metrics or reports.",
      });
    } catch (error) {
      console.error('Error voiding pre-order:', error);
      toast({
        title: "Error",
        description: "Failed to void pre-order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelPreorder = async (preorder: Preorder) => {
    // Set the selected preorder for the cancel modal
    setSelectedPreorder(preorder);
    // Reset form with default values and pre-filled notes
    setCancelForm({
      paymentType: paymentTypes.length > 0 ? paymentTypes[0].id : '',
      profitTemplateId: 'main', // Default to main account
      notes: `Down payment of ${formatCurrency(preorder.down_payment || 0, currency)} for cancelled pre-order #${preorder.pre_order_no}`
    });
    setShowCancelModal(true);
  };

  const processCancelToSale = async (preorder: Preorder) => {
    setIsUpdating(true);
    const supabase = createClient();
    
    try {
      console.log('Starting processCancelToSale for preorder:', preorder.id);
      
      // Get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Authentication required');
      }
      console.log('User authenticated:', user.id);

      // Validate form inputs
      if (!cancelForm.paymentType) {
        throw new Error('Payment type is required');
      }
      if (!cancelForm.profitTemplateId) {
        throw new Error('Profit distribution template is required');
      }
      console.log('Form validation passed');

      // First, create a variant from the pre-order
      let variantId = preorder.variant_id;
      console.log('Existing variant_id:', variantId);

      if (!variantId) {
        // Use a simpler approach to generate serial numbers
        let variantInsert: any;
        let insertAttempts = 0;
        const maxInsertAttempts = 5;
        
        while (insertAttempts < maxInsertAttempts) {
          try {
            // Get the next available serial number
            const { data: maxSerialData, error: maxSerialError } = await supabase
              .from("variants")
              .select("serial_number")
              .eq("user_id", user.id)
              .not("serial_number", "is", null)
              .order("serial_number", { ascending: false })
              .limit(1)
              .maybeSingle();

            let serialNumber = 1;
            if (!maxSerialError && maxSerialData?.serial_number) {
              serialNumber = maxSerialData.serial_number + 1;
            }

            // Ensure serial number doesn't exceed smallint limit (32767)
            if (serialNumber > 32767) {
              throw new Error('Serial number limit exceeded. Please contact support.');
            }

            variantInsert = {
              id: crypto.randomUUID(),
              product_id: preorder.product_id,
              size: preorder.size,
              size_label: preorder.size_label,
              serial_number: serialNumber,
              variant_sku: `${preorder.product.sku}-${preorder.size || 'NOSIZE'}-${serialNumber}`,
              cost_price: preorder.cost_price,
              status: 'Sold', // Mark as sold immediately
              user_id: user.id,
              date_added: new Date().toISOString().slice(0, 10),
              location: 'Store',
              type: 'downpayment', // Use the new valid enum value for cancelled pre-orders
              notes: `Downpayment from cancelled pre-order #${preorder.pre_order_no}`
            };

            const { data: variantData, error: variantError } = await supabase
              .from('variants')
              .insert([variantInsert])
              .select('*')
              .single();

            if (variantError) {
              // Log complete error details for debugging
              console.error('Variant insertion error:', {
                code: variantError.code,
                message: variantError.message,
                details: variantError.details,
                hint: variantError.hint,
                variantData: variantInsert
              });
              
              // Check if it's a unique constraint violation on serial_number
              if (variantError.code === '23505' && variantError.message.includes('unique_serial_per_user')) {
                // Serial number conflict, try again with a different number
                insertAttempts++;
                console.log(`Serial number ${serialNumber} already exists, retrying... (attempt ${insertAttempts})`);
                continue;
              } else {
                throw variantError;
              }
            }

            // Success! Break out of the loop
            variantId = variantData.id;
            console.log('Variant created successfully with ID:', variantId);
            break;

          } catch (error) {
            console.log('Variant creation attempt failed:', error);
            insertAttempts++;
            if (insertAttempts >= maxInsertAttempts) {
              throw new Error(`Failed to create variant after ${maxInsertAttempts} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
            // Wait a bit before retrying to avoid race conditions
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      }

      console.log('About to create sale record (letting database auto-assign sales_no)');

      // Create a sale record for the pre-order cancellation
      // For pre-order cancellation: we record the full sale price but only collect down payment
      const saleData = {
        id: crypto.randomUUID(),
        sale_date: new Date().toISOString().slice(0, 10),
        total_amount: preorder.total_amount, // Full sale price (₱7,000)
        total_discount: 0,
        net_profit: preorder.down_payment || 0, // Profit is the down payment amount we collect
        customer_name: preorder.customer.name,
        customer_phone: preorder.customer.phone,
        customer_id: preorder.customer_id,
        user_id: user.id,
        // sales_no: null, // Let the database trigger assign this automatically
        status: 'completed',
        payment_received: preorder.down_payment || 0, // Only down payment was collected
        change_amount: 0,
        additional_charge: 0,
        payment_type: { type: cancelForm.paymentType },
        // custom_sales_id will be set after we get the sales_no from the database
      };
      
      console.log('Sale data to insert (without sales_no and custom_sales_id):', {
        ...saleData,
        customer_name_length: saleData.customer_name?.length,
        customer_phone_length: saleData.customer_phone?.length
      });

      const { data: saleResult, error: saleError } = await supabase
        .from('sales')
        .insert([saleData])
        .select('*')
        .single();

      if (saleError) {
        console.error('Sale creation error:', saleError);
        throw saleError;
      }
      console.log('Sale created successfully. Sales no:', saleResult.sales_no, 'ID:', saleResult.id);

      // Now update the sale with the custom_sales_id based on the auto-assigned sales_no
      const customSalesId = `S${saleResult.sales_no.toString().padStart(7, '0')}`; // Format: S0000001 (8 chars)
      console.log('Generated custom_sales_id:', customSalesId, 'Length:', customSalesId.length);

      const { error: updateError } = await supabase
        .from('sales')
        .update({ custom_sales_id: customSalesId })
        .eq('id', saleResult.id);

      if (updateError) {
        console.error('Error updating custom_sales_id:', updateError);
        throw updateError;
      }

      // Update the saleResult object for use in subsequent operations
      saleResult.custom_sales_id = customSalesId;

      // Create sale item
      const saleItemData = {
        id: crypto.randomUUID(),
        sale_id: saleResult.id,
        variant_id: variantId,
        sold_price: 0, // Cancellation sale has 0 total (only down payment profit)
        cost_price: preorder.cost_price,
        quantity: 1,
        custom_sales_id: saleResult.custom_sales_id
      };

      const { error: saleItemError } = await supabase
        .from('sale_items')
        .insert([saleItemData]);

      if (saleItemError) throw saleItemError;

      // Handle profit distribution based on selected method
      if (cancelForm.profitTemplateId === 'main') {
        // Main account only - find the main avatar with flexible matching
        let mainAvatar = null;
        
        // Try different ways to find the main avatar
        const { data: avatarsData, error: avatarsError } = await supabase
          .from('avatars')
          .select('*')
          .eq('user_id', user.id);

        if (avatarsError) throw avatarsError;

        if (avatarsData && avatarsData.length > 0) {
          // Try exact match first
          mainAvatar = avatarsData.find(a => a.type === 'Main');
          if (!mainAvatar) {
            mainAvatar = avatarsData.find(a => a.type === 'main');
          }
          if (!mainAvatar) {
            mainAvatar = avatarsData.find(a => a.type?.toLowerCase() === 'main');
          }
          if (!mainAvatar) {
            mainAvatar = avatarsData.find(a => a.name?.toLowerCase().includes('main'));
          }
          if (!mainAvatar) {
            mainAvatar = avatarsData.find(a => a.name?.toLowerCase().includes('store'));
          }
          if (!mainAvatar) {
            // Use the first avatar as fallback
            mainAvatar = avatarsData[0];
          }
        }

        if (!mainAvatar) {
          throw new Error('No avatar found for main account distribution');
        }

        // Distribute the entire down payment to main account
        const totalDistributionAmount = preorder.down_payment || 0;
        if (totalDistributionAmount > 0) {
          const profitDistribution = {
            id: crypto.randomUUID(),
            sale_id: saleResult.id,
            avatar_id: mainAvatar.id,
            amount: totalDistributionAmount,
            percentage: 100
          };

          const { error: distributionError } = await supabase
            .from('sale_profit_distributions')
            .insert([profitDistribution]);

          if (distributionError) throw distributionError;
        }
      } else if (cancelForm.profitTemplateId === 'manual') {
        // Manual distribution - use the percentages set in the UI
        if (totalManualPercentage !== 100) {
          throw new Error('Manual distribution percentages must total 100%');
        }

        // We distribute the down payment, not just profit
        const totalDistributionAmount = preorder.down_payment || 0;
        
        if (totalDistributionAmount > 0) {
          const profitDistributions = [];
          
          for (const [avatarId, percentage] of Object.entries(manualDistribution)) {
            if (percentage > 0) {
              const amount = (totalDistributionAmount * percentage) / 100;
              profitDistributions.push({
                id: crypto.randomUUID(),
                sale_id: saleResult.id,
                avatar_id: avatarId,
                amount: amount,
                percentage: percentage
              });
            }
          }

          if (profitDistributions.length > 0) {
            const { error: distributionError } = await supabase
              .from('sale_profit_distributions')
              .insert(profitDistributions);

            if (distributionError) throw distributionError;
          }
        }
      } else {
        // Template-based distribution
        const { data: templateData, error: templateError } = await supabase
          .from('profit_distribution_templates')
          .select(`
            *,
            profit_template_items (
              id,
              avatar_id,
              percentage
            )
          `)
          .eq('id', cancelForm.profitTemplateId)
          .single();

        if (templateError) throw templateError;

        const totalDistributionAmount = preorder.down_payment || 0;
        
        if (templateData.profit_template_items && templateData.profit_template_items.length > 0 && totalDistributionAmount > 0) {
          const profitDistributions = templateData.profit_template_items.map((item: any) => ({
            id: crypto.randomUUID(),
            sale_id: saleResult.id,
            avatar_id: item.avatar_id,
            amount: (totalDistributionAmount * item.percentage) / 100,
            percentage: item.percentage
          }));

          const { error: distributionError } = await supabase
            .from('sale_profit_distributions')
            .insert(profitDistributions);

          if (distributionError) throw distributionError;
        } else {
          // Fallback: distribute equally among all avatars if no template items
          const { data: avatars, error: avatarsError } = await supabase
            .from('avatars')
            .select('*')
            .eq('user_id', user.id);

          if (avatarsError) throw avatarsError;

          if (avatars && avatars.length > 0 && totalDistributionAmount > 0) {
            const amountPerAvatar = totalDistributionAmount / avatars.length;
            const percentagePerAvatar = 100 / avatars.length;

            const profitDistributions = avatars.map(avatar => ({
              id: crypto.randomUUID(),
              sale_id: saleResult.id,
              avatar_id: avatar.id,
              amount: amountPerAvatar,
              percentage: percentagePerAvatar
            }));

            const { error: distributionError } = await supabase
              .from('sale_profit_distributions')
              .insert(profitDistributions);

            if (distributionError) throw distributionError;
          }
        }
      }

      // Update the pre-order status to cancelled
      await updatePreOrderStatus(preorder.id, 'canceled', 
        `Pre-order cancelled and converted to sale #${saleResult.custom_sales_id}. Down payment of ${formatCurrency(preorder.down_payment || 0, currency)} processed as sale.`);

      // Update the local state
      setPreorders(prev => prev.map(p => 
        p.id === preorder.id 
          ? { 
              ...p, 
              status: 'canceled', 
              notes: `Pre-order cancelled and converted to sale #${saleResult.custom_sales_id}. Down payment of ${formatCurrency(preorder.down_payment || 0, currency)} processed as sale.`
            }
          : p
      ));

      toast({
        title: "Pre-order Cancelled",
        description: `Pre-order converted to sale #${saleResult.custom_sales_id} and down payment of ${formatCurrency(preorder.down_payment || 0, currency)} recorded.`,
      });

      setShowCancelModal(false);
      setSelectedPreorder(null);
      setCancelForm({ paymentType: 'cash', profitTemplateId: '', notes: '' });
    } catch (error) {
      console.error('Error cancelling pre-order:');
      console.error('Error details:', error);
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      // If it's a Supabase error, log additional details
      if (error && typeof error === 'object' && 'code' in error) {
        console.error('Supabase error code:', (error as any).code);
        console.error('Supabase error details:', (error as any).details);
        console.error('Supabase error hint:', (error as any).hint);
      }
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to cancel pre-order and process sale. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Filter and sort preorders
  const filteredAndSortedPreorders = useMemo(() => {
    // Apply date filtering first
    const dateFilteredPreorders = getFilteredPreordersByDate(preorders);
    
    let filtered = dateFilteredPreorders.filter(preorder => {
      const matchesSearch = searchTerm === "" || 
        preorder.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        preorder.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        preorder.product.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        preorder.product.sku.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || preorder.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });

    // Sort preorders
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case "customer":
          aValue = a.customer.name.toLowerCase();
          bValue = b.customer.name.toLowerCase();
          break;
        case "total_amount":
          aValue = a.total_amount;
          bValue = b.total_amount;
          break;
        case "remaining_balance":
          aValue = a.remaining_balance;
          bValue = b.remaining_balance;
          break;
        case "expected_delivery_date":
          aValue = a.expected_delivery_date ? new Date(a.expected_delivery_date) : new Date(0);
          bValue = b.expected_delivery_date ? new Date(b.expected_delivery_date) : new Date(0);
          break;
        case "created_at":
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
        default:
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
      }

      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [preorders, searchTerm, statusFilter, sortBy, sortOrder, dateFilter, customDateFrom, customDateTo]);

  // Calculate stats
  const stats = useMemo(() => {
    // Apply date filtering first
    const dateFilteredPreorders = getFilteredPreordersByDate(preorders);
    
    // Exclude voided records from stats cards
    const activePreorders = dateFilteredPreorders.filter(p => p.status !== 'voided');
    
    const totalPreorders = activePreorders.length;
    const totalValue = activePreorders.reduce((sum, p) => sum + p.total_amount, 0);
    const pendingPreorders = activePreorders.filter(p => ['pending', 'confirmed'].includes(p.status)).length;
    const completedPreorders = activePreorders.filter(p => p.status === 'completed').length;
    
    // Exclude completed orders from deposits and remaining balance calculations
    const nonCompletedPreorders = activePreorders.filter(p => p.status !== 'completed');
    const totalDeposits = nonCompletedPreorders.reduce((sum, p) => sum + (p.down_payment || 0), 0);
    const totalRemaining = nonCompletedPreorders.reduce((sum, p) => sum + p.remaining_balance, 0);

    return {
      totalPreorders,
      totalValue,
      pendingPreorders,
      completedPreorders,
      totalDeposits,
      totalRemaining
    };
  }, [preorders, dateFilter, customDateFrom, customDateTo]);

  // Helper function to get date range text
  const getDateRangeText = useMemo(() => {
    switch (dateFilter) {
      case "thisMonth":
        return "This Month";
      case "3months":
        return "Last 3 Months";
      case "year":
        return "This Year";
      case "custom":
        if (customDateFrom && customDateTo) {
          return `${format(customDateFrom, "MMM dd")} - ${format(customDateTo, "MMM dd, yyyy")}`;
        }
        return "Custom Range";
      default:
        return "All Time";
    }
  }, [dateFilter, customDateFrom, customDateTo]);

  if (error) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="text-center text-red-500">
          <h1 className="text-3xl font-bold mb-4">Error Loading Pre-orders</h1>
          <p>There was an issue fetching pre-order data. Please try again later.</p>
          <p className="text-sm text-gray-600">Details: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-gray-600">Total Pre-orders</span>
              </div>
              <div className="text-2xl font-bold">{stats.totalPreorders}</div>
              <div className="text-xs text-gray-500 mt-1">{getDateRangeText}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-sm text-gray-600">Total Value</span>
              </div>
              <div className="text-2xl font-bold">
                {formatCurrency(stats.totalValue, currency)}
              </div>
              <div className="text-xs text-gray-500 mt-1">{getDateRangeText}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                <span className="text-sm text-gray-600">Pending</span>
              </div>
              <div className="text-2xl font-bold">{stats.pendingPreorders}</div>
              <div className="text-xs text-gray-500 mt-1">{getDateRangeText}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                <span className="text-sm text-gray-600">Completed</span>
              </div>
              <div className="text-2xl font-bold">{stats.completedPreorders}</div>
              <div className="text-xs text-gray-500 mt-1">{getDateRangeText}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="h-4 w-4 text-purple-500" />
                <span className="text-sm text-gray-600">Deposits (Active)</span>
              </div>
              <div className="text-2xl font-bold">
                {formatCurrency(stats.totalDeposits, currency)}
              </div>
              <div className="text-xs text-gray-500 mt-1">Excludes completed • {getDateRangeText}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                <span className="text-sm text-gray-600">Remaining (Active)</span>
              </div>
              <div className="text-2xl font-bold">
                {formatCurrency(stats.totalRemaining, currency)}
              </div>
              <div className="text-xs text-gray-500 mt-1">Excludes completed • {getDateRangeText}</div>
            </CardContent>
          </Card>
        </div>

        {/* Header with add button */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-6">
          <div>
            <h2 className="text-lg font-semibold">Manage Pre-orders</h2>
            <p className="text-sm text-gray-600">Track and manage customer pre-orders</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
            {/* Date Filter */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <CalendarIcon className="h-4 w-4 text-gray-500" />
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-full sm:w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="thisMonth">This Month</SelectItem>
                    <SelectItem value="3months">Last 3 Months</SelectItem>
                    <SelectItem value="year">This Year</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {dateFilter === "custom" && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full sm:w-[120px] justify-start text-left font-normal",
                          !customDateFrom && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customDateFrom ? format(customDateFrom, "MMM dd") : "From"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={customDateFrom}
                        onSelect={setCustomDateFrom}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  
                  <span className="text-gray-500 hidden sm:inline">to</span>
                  <span className="text-gray-500 sm:hidden text-sm">to</span>
                  
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full sm:w-[120px] justify-start text-left font-normal",
                          !customDateTo && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customDateTo ? format(customDateTo, "MMM dd") : "To"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={customDateTo}
                        onSelect={setCustomDateTo}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>
            
            <Button 
              className="flex items-center gap-2 w-full sm:w-auto"
              onClick={() => router.push('/add-product')}
            >
              <Plus className="h-4 w-4" />
              New Pre-order
            </Button>
          </div>
        </div>

        {/* Search and filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by customer, product, brand, or SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="voided">Voided</SelectItem>
                  <SelectItem value="canceled">Canceled</SelectItem>
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

        {/* Preorders table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Pre-orders</CardTitle>
              {dateFilter !== "all" && (
                <Badge variant="secondary" className="text-xs">
                  Filtered by: {getDateRangeText}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {filteredAndSortedPreorders.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No pre-orders found</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || statusFilter !== "all" 
                    ? "Try adjusting your search or filters"
                    : "Get started by creating your first pre-order"
                  }
                </p>
                {!searchTerm && statusFilter === "all" && (
                  <Button onClick={() => router.push('/add-product')}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Pre-order
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <Table className="min-w-[1000px] w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Pre-order #</TableHead>
                      <TableHead className="whitespace-nowrap">Image</TableHead>
                      <TableHead className="whitespace-nowrap">Name</TableHead>
                      <TableHead className="whitespace-nowrap">Brand</TableHead>
                      <TableHead className="whitespace-nowrap">Size</TableHead>
                      <TableHead className="whitespace-nowrap">Size Label</TableHead>
                      <TableHead className="whitespace-nowrap">Cost</TableHead>
                      <TableHead className="whitespace-nowrap">Sale Price</TableHead>
                      <TableHead className="whitespace-nowrap">Down Payment</TableHead>
                      <TableHead className="whitespace-nowrap">Estimated Delivery</TableHead>
                      <TableHead className="whitespace-nowrap">Remaining Balance</TableHead>
                      <TableHead className="whitespace-nowrap">Customer</TableHead>
                      <TableHead className="whitespace-nowrap">Notes</TableHead>
                      <TableHead className="whitespace-nowrap">Status</TableHead>
                      <TableHead className="whitespace-nowrap">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                <TableBody>
                  {filteredAndSortedPreorders.map((preorder) => (
                    <TableRow key={preorder.id}>
                      <TableCell className="font-mono text-sm px-4 py-2 whitespace-nowrap">
                        #{preorder.pre_order_no ? preorder.pre_order_no.toString().padStart(3, '0') : '---'}
                      </TableCell>
                      <TableCell className="px-4 py-2 whitespace-nowrap">
                        {preorder.product.image ? (
                          <Image
                            src={preorder.product.image}
                            alt={preorder.product.name}
                            width={40}
                            height={40}
                            className="rounded-md object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gray-200 rounded-md flex items-center justify-center">
                            <Package className="h-5 w-5 text-gray-400" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-2 whitespace-nowrap">
                        <div className="font-medium">{preorder.product.name}</div>
                      </TableCell>
                      <TableCell className="px-4 py-2 whitespace-nowrap">{preorder.product.brand}</TableCell>
                      <TableCell className="px-4 py-2 whitespace-nowrap">
                        {preorder.size ? preorder.size : "—"}
                      </TableCell>
                      <TableCell className="px-4 py-2 whitespace-nowrap">
                        {preorder.size_label ? preorder.size_label : "—"}
                      </TableCell>
                      <TableCell className="px-4 py-2 whitespace-nowrap">{formatCurrency(preorder.cost_price, currency)}</TableCell>
                      <TableCell className="px-4 py-2 whitespace-nowrap">{formatCurrency(preorder.total_amount, currency)}</TableCell>
                      <TableCell className="px-4 py-2 whitespace-nowrap">
                        {preorder.down_payment ? formatCurrency(preorder.down_payment, currency) : "—"}
                      </TableCell>
                      <TableCell className="px-4 py-2 whitespace-nowrap">
                        {preorder.expected_delivery_date 
                          ? format(new Date(preorder.expected_delivery_date), 'MMM dd, yyyy')
                          : "—"
                        }
                      </TableCell>
                      <TableCell className="px-4 py-2 whitespace-nowrap">{formatCurrency(preorder.remaining_balance, currency)}</TableCell>
                      <TableCell className="px-4 py-2 whitespace-nowrap">
                        <button
                          onClick={() => handleCustomerClick(preorder.customer)}
                          className="text-blue-600 hover:text-blue-800 hover:underline text-left"
                        >
                          {preorder.customer.name}
                        </button>
                      </TableCell>
                      <TableCell className="px-4 py-2 max-w-32">
                        <div className="truncate" title={preorder.notes || ""}>
                          {preorder.notes || "No notes"}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-2 whitespace-nowrap">
                        <Badge className={getStatusColor(preorder.status)}>
                          {getStatusIcon(preorder.status)}
                          <span className="ml-1">{preorder.status.toUpperCase()}</span>
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-2 whitespace-nowrap">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {/* Edit Pre-Order - Always available */}
                            <DropdownMenuItem onClick={() => handleEdit(preorder)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>

                            {/* Restore - Only for voided/cancelled */}
                            {(preorder.status === 'voided' || preorder.status === 'canceled') && (
                              <DropdownMenuItem 
                                onClick={() => handleRestore(preorder)}
                                disabled={isUpdating}
                              >
                                <RotateCcw className="mr-2 h-4 w-4" />
                                Restore
                              </DropdownMenuItem>
                            )}

                            {/* Voided - Only for pending/confirmed */}
                            {(preorder.status === 'pending' || preorder.status === 'confirmed') && (
                              <DropdownMenuItem 
                                onClick={() => handleVoid(preorder)}
                                disabled={isUpdating}
                              >
                                <AlertTriangle className="mr-2 h-4 w-4" />
                                Voided
                              </DropdownMenuItem>
                            )}

                            {/* Cancelled - Only for pending/confirmed */}
                            {(preorder.status === 'pending' || preorder.status === 'confirmed') && (
                              <DropdownMenuItem 
                                onClick={() => handleCancelPreorder(preorder)}
                                disabled={isUpdating}
                              >
                                <Ban className="mr-2 h-4 w-4" />
                                Cancelled
                              </DropdownMenuItem>
                            )}

                            {/* Delete - Not for completed or cancelled */}
                            {preorder.status !== 'completed' && preorder.status !== 'canceled' && (
                              <DropdownMenuItem 
                                onClick={() => handleDelete(preorder)}
                                disabled={isUpdating}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            )}
          </CardContent>
        </Card>

      {/* Customer Modal */}
      <Dialog open={showCustomerModal} onOpenChange={setShowCustomerModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Customer Information</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Name</Label>
                  <p className="text-sm text-gray-600">{selectedCustomer.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Email</Label>
                  <p className="text-sm text-gray-600">{selectedCustomer.email || "—"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Phone</Label>
                  <p className="text-sm text-gray-600">{selectedCustomer.phone || "—"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Address</Label>
                  <p className="text-sm text-gray-600">{selectedCustomer.address || "—"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">City</Label>
                  <p className="text-sm text-gray-600">{selectedCustomer.city || "—"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">State</Label>
                  <p className="text-sm text-gray-600">{selectedCustomer.state || "—"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">ZIP Code</Label>
                  <p className="text-sm text-gray-600">{selectedCustomer.zip_code || "—"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Country</Label>
                  <p className="text-sm text-gray-600">{selectedCustomer.country || "—"}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Pre-order Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Pre-order</DialogTitle>
          </DialogHeader>
          {selectedPreorder && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-md">
                <p className="font-medium text-blue-800">{selectedPreorder.product.name}</p>
                <p className="text-sm text-blue-700">Size: {selectedPreorder.size}</p>
                <p className="text-sm text-blue-700">Customer: {selectedPreorder.customer.name}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="totalAmount">Total Amount</Label>
                <Input
                  id="totalAmount"
                  type="number"
                  step="0.01"
                  value={editForm.total_amount === 0 ? '' : editForm.total_amount}
                  placeholder="0.00"
                  onChange={(e) => {
                    const value = e.target.value;
                    const totalAmount = value === '' ? 0 : parseFloat(value) || 0;
                    setEditForm(prev => ({ 
                      ...prev, 
                      total_amount: totalAmount,
                      remaining_balance: totalAmount - prev.down_payment
                    }));
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="downPayment">Down Payment</Label>
                <Input
                  id="downPayment"
                  type="number"
                  step="0.01"
                  value={editForm.down_payment === 0 ? '' : editForm.down_payment}
                  placeholder="0.00"
                  onChange={(e) => {
                    const value = e.target.value;
                    const downPayment = value === '' ? 0 : parseFloat(value) || 0;
                    setEditForm(prev => ({ 
                      ...prev, 
                      down_payment: downPayment,
                      remaining_balance: prev.total_amount - downPayment
                    }));
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="remainingBalance">Remaining Balance</Label>
                <Input
                  id="remainingBalance"
                  type="number"
                  step="0.01"
                  value={editForm.remaining_balance === 0 ? '0.00' : editForm.remaining_balance}
                  disabled
                  className="bg-gray-50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expectedDeliveryDate">Expected Delivery Date (Optional)</Label>
                <Input
                  id="expectedDeliveryDate"
                  type="date"
                  value={editForm.expected_delivery_date}
                  onChange={(e) => setEditForm(prev => ({ ...prev, expected_delivery_date: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editNotes">Notes (Optional)</Label>
                <Textarea
                  id="editNotes"
                  value={editForm.notes}
                  onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes for the pre-order..."
                  rows={3}
                />
              </div>

              <div className="text-sm text-gray-600">
                <p>Current Status: <span className="font-medium">{selectedPreorder.status}</span></p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={submitEdit} 
              disabled={isUpdating || editForm.total_amount <= 0}
            >
              {isUpdating ? "Updating..." : "Update Pre-order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Update Modal */}
      <Dialog open={showStatusModal} onOpenChange={setShowStatusModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Pre-order Status</DialogTitle>
          </DialogHeader>
          {selectedPreorder && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={statusForm.status} 
                  onValueChange={(value) => setStatusForm(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="voided">Voided</SelectItem>
                    <SelectItem value="canceled">Canceled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={statusForm.notes}
                  onChange={(e) => setStatusForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Add any notes about this status change..."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusModal(false)}>
              Cancel
            </Button>
            <Button onClick={submitStatusUpdate} disabled={isUpdating}>
              {isUpdating ? "Updating..." : "Update Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Pre-order</DialogTitle>
          </DialogHeader>
          {selectedPreorder && (
            <div className="space-y-4">
              <p className="text-gray-600">
                Are you sure you want to delete this pre-order? This action cannot be undone.
              </p>
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="font-medium">{selectedPreorder.product.name}</p>
                <p className="text-sm text-gray-600">Customer: {selectedPreorder.customer.name}</p>
                <p className="text-sm text-gray-600">Amount: {formatCurrency(selectedPreorder.total_amount, currency)}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDelete} 
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Pre-order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Pre-order Confirmation Modal */}
      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Cancel Pre-order</DialogTitle>
          </DialogHeader>
          {selectedPreorder && (
            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
              <p className="text-gray-600">
                Are you sure you want to cancel this pre-order? This will:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                <li>Create a product variant from this pre-order</li>
                <li>Mark the variant as sold immediately</li>
                <li>Record the down payment ({formatCurrency(selectedPreorder.down_payment || 0, currency)}) as a completed sale</li>
                <li>Change the pre-order status to "cancelled"</li>
              </ul>
              
              {/* Product Information in Row Layout */}
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md">
                <div className="flex items-start gap-3">
                  {/* Product Image */}
                  <div className="flex-shrink-0">
                    {selectedPreorder.product.image ? (
                      <Image
                        src={selectedPreorder.product.image}
                        alt={selectedPreorder.product.name}
                        width={60}
                        height={60}
                        className="rounded-md object-cover border"
                      />
                    ) : (
                      <div className="w-15 h-15 bg-gray-200 rounded-md flex items-center justify-center border">
                        <Package className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                  </div>
                  
                  {/* Product Details */}
                  <div className="flex-1 min-w-0">
                    <div className="space-y-2">
                      <div>
                        <h3 className="font-medium text-yellow-800 truncate">
                          {selectedPreorder.product.name}
                        </h3>
                        <p className="text-sm text-yellow-700">
                          {selectedPreorder.product.brand} • Size: {selectedPreorder.size}
                        </p>
                        <p className="text-sm text-yellow-700">
                          Customer: {selectedPreorder.customer.name}
                        </p>
                      </div>
                      
                      {/* Amounts - Below Product Info */}
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-yellow-200">
                        <div>
                          <div className="text-xs text-yellow-600">Down Payment</div>
                          <div className="font-medium text-yellow-800">{formatCurrency(selectedPreorder.down_payment || 0, currency)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-yellow-600">Total Amount</div>
                          <div className="font-medium text-yellow-800">{formatCurrency(selectedPreorder.total_amount, currency)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Type Selection */}
              <div className="space-y-2">
                <Label htmlFor="paymentType">Payment Type</Label>
                <Select
                  value={cancelForm.paymentType}
                  onValueChange={(value) => setCancelForm(prev => ({ ...prev, paymentType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment type" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                        {type.fee_type !== 'none' && (
                          <span className="text-xs text-gray-500 ml-1">
                            ({type.fee_type === 'percent' ? `${type.fee_value}%` : `+${formatCurrency(type.fee_value, currency)}`})
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Profit Distribution Selection */}
              <div className="space-y-2">
                <Label htmlFor="profitDistribution">Profit Distribution</Label>
                <Select
                  value={cancelForm.profitTemplateId}
                  onValueChange={(value) => setCancelForm(prev => ({ ...prev, profitTemplateId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select distribution method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="main">
                      <div className="flex items-center gap-2">
                        {(() => {
                          // Try multiple ways to find main avatar
                          let mainAvatar = avatars.find(a => a.type === 'Main');
                          if (!mainAvatar) {
                            mainAvatar = avatars.find(a => (a as any).type === 'Main');
                          }
                          if (!mainAvatar) {
                            mainAvatar = avatars.find(a => a.type?.toLowerCase() === 'main');
                          }
                          if (!mainAvatar && avatars.length > 0) {
                            // If no "Main" type found, use the first avatar
                            mainAvatar = avatars[0];
                          }
                          
                          return mainAvatar ? (
                            <>
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={mainAvatar.image || `/api/avatar?name=${mainAvatar.name}`} />
                                <AvatarFallback className="text-xs">{mainAvatar.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <span>Main Account Only</span>
                            </>
                          ) : (
                            <>
                              <div className="w-5 h-5 bg-blue-500 rounded-full"></div>
                              <span>Main Account Only</span>
                            </>
                          );
                        })()}
                      </div>
                    </SelectItem>
                    <SelectItem value="manual">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-green-500 rounded-full"></div>
                        Manual Distribution
                      </div>
                    </SelectItem>
                    {profitTemplates.length > 0 ? (
                      <>
                        <div className="px-2 py-1.5 text-xs font-medium text-gray-500 bg-gray-50">
                          Templates ({profitTemplates.length})
                        </div>
                        {profitTemplates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 bg-purple-500 rounded-full"></div>
                              {template.name}
                              {template.description && (
                                <span className="text-xs text-gray-500 ml-1">
                                  ({template.description})
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </>
                    ) : (
                      <div className="px-2 py-1.5 text-xs text-gray-500 bg-gray-50">
                        Templates (0)
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Profit Distribution Preview */}
              {cancelForm.profitTemplateId && (
                <div className="space-y-2">
                  <Label className="text-sm">Distribution Preview</Label>
                  <div className="bg-gray-50 border rounded-md p-3 space-y-2">
                    {(() => {
                      const downPayment = selectedPreorder.down_payment || 0;
                      
                      if (cancelForm.profitTemplateId === 'main') {
                        // Try multiple ways to find main avatar
                        console.log('Available avatars:', avatars.map(a => ({ id: a.id, name: a.name, type: a.type })));
                        
                        let mainAvatar = avatars.find(a => a.type === 'Main');
                        if (!mainAvatar) {
                          mainAvatar = avatars.find(a => a.type === 'main');
                        }
                        if (!mainAvatar) {
                          mainAvatar = avatars.find(a => a.type?.toLowerCase() === 'main');
                        }
                        if (!mainAvatar) {
                          mainAvatar = avatars.find(a => a.name?.toLowerCase().includes('main'));
                        }
                        if (!mainAvatar) {
                          mainAvatar = avatars.find(a => a.name?.toLowerCase().includes('store'));
                        }
                        if (!mainAvatar && avatars.length > 0) {
                          // If no "Main" type found, use the first avatar
                          mainAvatar = avatars[0];
                        }
                        
                        console.log('Selected main avatar:', mainAvatar);
                        
                        return mainAvatar ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium">Down Payment Distribution</span>
                              <span className="font-medium">{formatCurrency(downPayment, currency)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  {mainAvatar.image ? (
                                    <AvatarImage src={mainAvatar.image} />
                                  ) : null}
                                  <AvatarFallback className="text-xs">{mainAvatar.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span className="text-sm">{mainAvatar.name}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <span>100%</span>
                                <span className="font-medium">{formatCurrency(downPayment, currency)}</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <p className="text-sm text-gray-500">No main account found</p>
                            <p className="text-xs text-gray-400">Available avatars: {avatars.length}</p>
                          </div>
                        );
                      } else if (cancelForm.profitTemplateId === 'manual') {
                        return (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium">Manual Distribution</span>
                              <span className="font-medium">{formatCurrency(downPayment, currency)}</span>
                            </div>
                            
                            {/* Interactive distribution with percentage inputs */}
                            <div className="space-y-2">
                              {avatars.map((avatar) => {
                                const percentage = manualDistribution[avatar.id] || 0;
                                const amount = (downPayment * percentage) / 100;
                                return (
                                  <div key={avatar.id} className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2">
                                      <Avatar className="h-4 w-4">
                                        {avatar.image ? (
                                          <AvatarImage src={avatar.image} />
                                        ) : null}
                                        <AvatarFallback className="text-xs">{avatar.name.charAt(0)}</AvatarFallback>
                                      </Avatar>
                                      <span>{avatar.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <div className="flex items-center gap-1">
                                        <input
                                          type="number"
                                          min="0"
                                          max="100"
                                          step="0.1"
                                          value={percentage}
                                          onChange={(e) => updateManualPercentage(avatar.id, parseFloat(e.target.value) || 0)}
                                          className="w-12 h-6 text-xs border border-gray-300 rounded px-1 text-center"
                                        />
                                        <span className="text-xs">%</span>
                                      </div>
                                      <span className="font-medium min-w-[60px] text-right">
                                        {formatCurrency(amount, currency)}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                              
                              {/* Total validation */}
                              <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-200">
                                <span className="font-medium">Total</span>
                                <div className="flex items-center gap-2">
                                  <span className={`font-medium ${totalManualPercentage === 100 ? 'text-green-600' : 'text-red-500'}`}>
                                    {totalManualPercentage.toFixed(1)}%
                                  </span>
                                  <span className="font-medium min-w-[60px] text-right">
                                    {formatCurrency((downPayment * totalManualPercentage) / 100, currency)}
                                  </span>
                                </div>
                              </div>
                              
                              {totalManualPercentage !== 100 && (
                                <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                                  <p className="text-xs text-yellow-700">
                                    ⚠️ Total must equal 100% (currently {totalManualPercentage.toFixed(1)}%)
                                  </p>
                                </div>
                              )}
                            </div>
                            
                            <div className="bg-blue-50 border border-blue-200 rounded p-2">
                              <p className="text-xs text-blue-700">
                                💡 Adjust percentages above. The distribution will be saved with the cancellation.
                              </p>
                            </div>
                          </div>
                        );
                      } else {
                        // Template-based distribution
                        const template = profitTemplates.find(t => t.id === cancelForm.profitTemplateId);
                        return template ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium">{template.name}</span>
                              <span className="font-medium">{formatCurrency(downPayment, currency)}</span>
                            </div>
                            {template.description && (
                              <p className="text-xs text-gray-500">{template.description}</p>
                            )}
                            
                            {/* Show actual template items */}
                            {(template as any).profit_template_items && Array.isArray((template as any).profit_template_items) && (template as any).profit_template_items.length > 0 ? (
                              <div className="space-y-1">
                                {(template as any).profit_template_items.map((item: any, index: number) => {
                                  const avatar = item.avatars;
                                  const amount = (downPayment * item.percentage) / 100;
                                  return (
                                    <div key={index} className="flex items-center justify-between text-xs">
                                      <div className="flex items-center gap-2">
                                        {avatar ? (
                                          <>
                                            <Avatar className="h-4 w-4">
                                              {avatar.image ? (
                                                <AvatarImage src={avatar.image} />
                                              ) : null}
                                              <AvatarFallback className="text-xs">{avatar.name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <span>{avatar.name}</span>
                                          </>
                                        ) : (
                                          <span>Unknown Avatar</span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <span>{item.percentage}%</span>
                                        <span className="font-medium">{formatCurrency(amount, currency)}</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                                <p className="text-xs text-yellow-700">
                                  No distribution rules configured for this template.
                                </p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">Template not found</p>
                        );
                      }
                    })()}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="cancelNotes">Notes</Label>
                <Textarea
                  id="cancelNotes"
                  value={cancelForm.notes}
                  onChange={(e) => setCancelForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes for the cancellation..."
                  rows={3}
                  className="resize-none"
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex-shrink-0 flex flex-col sm:flex-row gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowCancelModal(false)} className="w-full sm:w-auto">
              Keep Pre-order
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => selectedPreorder && processCancelToSale(selectedPreorder)} 
              disabled={
                isUpdating || 
                !cancelForm.paymentType || 
                !cancelForm.profitTemplateId ||
                (cancelForm.profitTemplateId === 'manual' && totalManualPercentage !== 100)
              }
              className="w-full sm:w-auto"
            >
              {isUpdating ? "Processing..." : "Cancel & Convert to Sale"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Void Confirmation Modal */}
      <Dialog open={showVoidModal} onOpenChange={setShowVoidModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void Pre-order</DialogTitle>
          </DialogHeader>
          {selectedPreorder && (
            <div className="space-y-4">
              <p className="text-gray-600">
                Are you sure you want to void this pre-order? This action will mark the pre-order as voided.
              </p>
              <div className="bg-red-50 border border-red-200 p-3 rounded-md">
                <p className="font-medium text-red-800">{selectedPreorder.product.name}</p>
                <p className="text-sm text-red-700">Size: {selectedPreorder.size}</p>
                <p className="text-sm text-red-700">Customer: {selectedPreorder.customer.name}</p>
                <p className="text-sm text-red-700">Amount: {formatCurrency(selectedPreorder.total_amount, currency)}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVoidModal(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmVoid} 
              disabled={isUpdating}
            >
              {isUpdating ? "Voiding..." : "Void Pre-order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Confirmation Modal */}
      <Dialog open={showRestoreModal} onOpenChange={setShowRestoreModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore Pre-order</DialogTitle>
          </DialogHeader>
          {selectedPreorder && (
            <div className="space-y-4">
              <p className="text-gray-600">
                Are you sure you want to restore this pre-order? This will change the status back to pending.
              </p>
              <div className="bg-green-50 border border-green-200 p-3 rounded-md">
                <p className="font-medium text-green-800">{selectedPreorder.product.name}</p>
                <p className="text-sm text-green-700">Size: {selectedPreorder.size}</p>
                <p className="text-sm text-green-700">Customer: {selectedPreorder.customer.name}</p>
                <p className="text-sm text-green-700">Amount: {formatCurrency(selectedPreorder.total_amount, currency)}</p>
                <p className="text-sm text-green-700">Current Status: {selectedPreorder.status}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRestoreModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={confirmRestore} 
              disabled={isUpdating}
            >
              {isUpdating ? "Restoring..." : "Restore Pre-order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
