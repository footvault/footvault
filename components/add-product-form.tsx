"use client"

import type React from "react"

import { useState, useTransition, useEffect } from "react"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Plus, Loader2, Trash2, Edit, Save, CheckCircle, XCircle, ExternalLink, RefreshCw, Check, ChevronsUpDown, Package, ChevronDown, ChevronUp, Layers } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"

import { toast } from "@/hooks/use-toast"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency, getCurrencySymbol } from "@/lib/utils/currency"
import { useCurrency } from "@/context/CurrencyContext"
import { fetchCustomLocations, type CustomLocation } from "@/lib/fetchCustomLocations"
import { v4 as uuidv4 } from 'uuid';
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { insertVariantsWithUniqueSerials } from "@/lib/utils/serial-number-generator"

// Helper functions for number formatting with commas
const formatNumberWithCommas = (value: number | string): string => {
  if (value === "" || value === null || value === undefined) return ""
  const numValue = typeof value === "string" ? parseFloat(value) : value
  if (isNaN(numValue)) return ""
  if (numValue === 0) return "0"
  
  return numValue.toLocaleString('en-US', { 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 2,
    useGrouping: true 
  })
}

const parseNumberFromCommaSeparated = (value: string): number => {
  if (!value || value === "") return 0
  const cleaned = value.replace(/,/g, "")
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? 0 : parsed
}

const formatInputValue = (value: string): string => {
  let cleaned = value.replace(/[^\d.]/g, "")
  
  const parts = cleaned.split('.')
  if (parts.length > 2) {
    cleaned = parts[0] + '.' + parts.slice(1).join('')
  }
  
  if (parts.length === 2 && parts[1].length > 2) {
    cleaned = parts[0] + '.' + parts[1].substring(0, 2)
  }
  
  return cleaned
}


interface KicksDevProductData {
  secondary_category: string
  id: string
  title: string
  brand: string
  sku: string
  category: string
  image: string
  min_price: number
  avg_price: number
  max_price: number
  traits: Array<{ trait: string; value: string }>
  variants: Array<{
    id: string
    size: string
    size_type: string
    lowest_ask: number
  }>
}

interface AddProductFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  productDataFromApi: KicksDevProductData | null
  existingProductDetails: any | null
  onProductAdded: () => void
  inferredSizeCategory?: string
}

// Bulk size entry type
interface BulkSizeEntry {
  id: string
  size: string
  quantity: number
}

interface ProductFormState {
  name: string
  brand: string
  sku: string
  category: string
  originalPrice: number | string
  salePrice: number | string
  image: string
  sizeCategory: string // Added
}

interface VariantFormState {
  id?: string // Optional ID property for compatibility
  size: string | undefined
  location: string | undefined
  status: string
  dateAdded: string
  condition: string
  sizeLabel: string // Added
  quantity: number | string
  owner_type: 'store' | 'consignor' // Who owns this variant
  consignor_id?: number | null // If owner_type is 'consignor', this is the consignor
}

// Helper function to generate dynamic size options
const getDynamicSizes = (sizeCategory: string, sizeLabel: string): string[] => {
  const sizes: string[] = []
  if (!sizeCategory || !sizeLabel) return []

  const generateRange = (start: number, end: number, step: number) => {
    for (let i = start; i <= end; i += step) {
      sizes.push(i.toString())
      if (step === 0.5 && i + 0.5 <= end) {
        sizes.push((i + 0.5).toString())
      }
    }
  }

  switch (sizeCategory) {
    case "Men's":
    case "Unisex":
      if (sizeLabel === "US") generateRange(3, 15, 0.5)
      else if (sizeLabel === "UK") generateRange(2.5, 14.5, 0.5)
      else if (sizeLabel === "EU")
        generateRange(35, 49, 0.5) // Approx
      else if (sizeLabel === "CM") generateRange(22, 33, 0.5) // Approx
      break
    case "Women's":
      if (sizeLabel === "US") generateRange(4, 13, 0.5)
      else if (sizeLabel === "UK") generateRange(2, 10, 0.5)
      else if (sizeLabel === "EU")
        generateRange(34, 44, 0.5) // Approx
      else if (sizeLabel === "CM") generateRange(21, 29, 0.5) // Approx
      break
    case "Youth": // YC
      if (sizeLabel === "US" || sizeLabel === "YC") {
        // Nike/Adidas standard Youth: 10.5C, 11C, 11.5C, 12C, 12.5C, 13C, 13.5C, 1Y, 1.5Y, 2Y, 2.5Y, 3Y, 3.5Y, 4Y, 4.5Y, 5Y, 5.5Y, 6Y, 6.5Y, 7Y
        const youthSizes = ['10.5', '11', '11.5', '12', '12.5', '13', '13.5', '1', '1.5', '2', '2.5', '3', '3.5', '4', '4.5', '5', '5.5', '6', '6.5', '7'];
        sizes.push(...youthSizes);
      }
      else if (sizeLabel === "UK")
        generateRange(10, 6.5, 0.5) // UK youth sizes
      else if (sizeLabel === "EU")
        generateRange(28, 40, 0.5) // EU youth sizes
      else if (sizeLabel === "CM") generateRange(16.5, 25, 0.5) // CM youth sizes
      break
    case "Toddlers": // TD
      if (sizeLabel === "US" || sizeLabel === "TD")
        generateRange(2, 13, 0.5) // Nike/Adidas standard: 2C-13C
      else if (sizeLabel === "UK")
        generateRange(1.5, 12.5, 0.5) // UK toddler sizes
      else if (sizeLabel === "EU")
        generateRange(17, 32, 0.5) // EU toddler sizes
      else if (sizeLabel === "CM") generateRange(9, 20, 0.5) // CM toddler sizes
      break
    case "T-Shirts":
      if (sizeLabel === "Clothing") {
        sizes.push('XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL')
      } else if (sizeLabel === "US") {
        // US numeric sizing for t-shirts
        generateRange(0, 20, 2) // 0, 2, 4, 6, 8, etc.
      }
      break
    case "Figurines":
      if (sizeLabel === "Standard") {
        sizes.push('1/6 Scale', '1/12 Scale', '1/10 Scale', '1/4 Scale', '1/8 Scale', 'Life Size')
      } else if (sizeLabel === "Series") {
        sizes.push('Series 1', 'Series 2', 'Series 3', 'Series 4', 'Series 5', 'Series 6', 'Series 7', 'Series 8', 'Series 9', 'Series 10')
      } else if (sizeLabel === "Limited") {
        sizes.push('Standard', 'Deluxe', 'Premium', 'Limited Edition', 'Exclusive', 'Chase')
      }
      break
    case "Collectibles":
      if (sizeLabel === "Standard") {
        sizes.push('Mini', 'Regular', 'Large', 'Jumbo', 'Giant')
      } else if (sizeLabel === "Series") {
        sizes.push('Wave 1', 'Wave 2', 'Wave 3', 'Wave 4', 'Wave 5', 'Special Edition')
      } else if (sizeLabel === "Limited") {
        sizes.push('Common', 'Uncommon', 'Rare', 'Ultra Rare', 'Secret Rare', 'Chase')
      }
      break
    case "Pop Marts":
      if (sizeLabel === "Standard") {
        sizes.push('Blind Box', 'Mystery Box', 'Regular', 'Large')
      } else if (sizeLabel === "Series") {
        sizes.push('Series 1', 'Series 2', 'Series 3', 'Series 4', 'Series 5', 'Birthday Series', 'Holiday Series', 'Special Collab')
      } else if (sizeLabel === "Limited") {
        sizes.push('Regular', 'Secret', 'Hidden', 'Chase', 'Special Edition', 'Artist Series')
      }
      break
  }
  // Use a Set to ensure uniqueness before sorting
  return Array.from(new Set(sizes)).sort((a, b) => Number.parseFloat(a) - Number.parseFloat(b)) // Ensure numerical sort
}

export function AddProductForm({
  open,
  onOpenChange,
  productDataFromApi,
  existingProductDetails, // New prop
  onProductAdded,
  inferredSizeCategory,
}: AddProductFormProps) {
  const { currency } = useCurrency(); // Get the user's selected currency
  const currencySymbol = getCurrencySymbol(currency); // Get the currency symbol
  const router = useRouter();
  const [isPending, startTransition] = useTransition()
  const [productForm, setProductForm] = useState<ProductFormState>({
    name: "",
    brand: "",
    sku: "",
    category: "",
    originalPrice: 0,
    salePrice: 0,
    image: "/placeholder.svg?height=100&width=100",
    sizeCategory: "Men's", // Default value
  })
  
  // State for formatted display values of price fields
  const [displayPrices, setDisplayPrices] = useState({
    originalPrice: "0",
    salePrice: "0"
  })
  
  const [newVariant, setNewVariant] = useState<Omit<VariantFormState, "tempId">>({
    size: undefined,
    location: undefined, // No default location - user must select or create one
    status: "Available", // Default status
    dateAdded: new Date().toISOString().split("T")[0], // Default to current date
    condition: "New", // Default condition
    sizeLabel: "US", // Default value
    quantity: 1,
    owner_type: "store", // Default to store ownership
    consignor_id: null, // Default to no consignor
  })
  // Payout method override state
  const [payoutMethodOverride, setPayoutMethodOverride] = useState<'percentage_split' | 'cost_price' | 'cost_plus_fixed' | 'cost_plus_percentage' | null>(null)
  const [fixedMarkupOverride, setFixedMarkupOverride] = useState<number | null>(null)
  const [markupPercentageOverride, setMarkupPercentageOverride] = useState<number | null>(null)
  const [customLocations, setCustomLocations] = useState<CustomLocation[]>([])
  const [showCustomLocationInput, setShowCustomLocationInput] = useState(false)
  const [newCustomLocationName, setNewCustomLocationName] = useState("")
  const [variantLimits, setVariantLimits] = useState<{
    plan: string;
    limit: number;
    current: number;
    remaining: number;
    isAtLimit: boolean;
  } | null>(null)
  const [imageLoading, setImageLoading] = useState(false)
  const [consignors, setConsignors] = useState<Array<{
    id: number;
    name: string;
    commission_rate: number;
    payout_method: 'percentage_split' | 'cost_price' | 'cost_plus_fixed' | 'cost_plus_percentage';
    fixed_markup?: number;
    markup_percentage?: number;
  }>>([])
  
  // Pre-order state
  const [isPreOrder, setIsPreOrder] = useState(false)
  const [customers, setCustomers] = useState<Array<{
    id: number
    name: string
    email: string
    phone?: string
  }>>([])
  const [preOrderForm, setPreOrderForm] = useState({
    customer_id: "",
    down_payment: "",
    down_payment_method: "",
    expected_delivery_date: "",
    notes: ""
  })
  
  // New customer form state
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false)
  const [newCustomerForm, setNewCustomerForm] = useState({
    name: "",
    phone: "",
    address: "",
    email: ""
  })
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false)
  
  // Customer dropdown state
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false)
  const [customerSearchValue, setCustomerSearchValue] = useState("")
  
  // Payment types for down payment method
  const [paymentTypes, setPaymentTypes] = useState<Array<{id: string, name: string, feeType?: string, feeValue?: number}>>([])
  const [newPaymentName, setNewPaymentName] = useState("")
  const [newFeeType, setNewFeeType] = useState<"percent" | "fixed">("percent")
  const [newFeeValue, setNewFeeValue] = useState(0)
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null)
  const [editPaymentName, setEditPaymentName] = useState("")
  const [editFeeType, setEditFeeType] = useState<"percent" | "fixed">("percent")
  const [editFeeValue, setEditFeeValue] = useState(0)
  
  // Bulk add mode
  const [isBulkMode, setIsBulkMode] = useState(false)
  const [bulkSizes, setBulkSizes] = useState<BulkSizeEntry[]>([])
  
  // Collapsible sections
  const [showProductDetails, setShowProductDetails] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  
  // Removed editingVariantId and editingVariantValues; only single variant input is used
  // Serial number state removed (auto-assigned)

  const isAddingToExistingProduct = !!existingProductDetails

  // Function to fetch consignors
  const fetchConsignors = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log("No user found when fetching consignors");
        return;
      }

      console.log("Fetching consignors for user:", user.id);
      const { data, error } = await supabase
        .from('consignors')
        .select('id, name, commission_rate, status, payout_method, fixed_markup, markup_percentage')
        .eq('user_id', user.id);

      console.log("Consignors query result:", { data, error });

      if (error) {
        console.error("Failed to fetch consignors:", error);
      } else {
        // Filter for active consignors in the frontend for now
        const activeConsignors = (data || []).filter(c => c.status === 'active');
        console.log("Active consignors found:", activeConsignors);
        setConsignors(activeConsignors);
      }
    } catch (error) {
      console.error("Failed to fetch consignors:", error);
    }
  };

  // Function to fetch customers
  const fetchCustomers = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log("No user found when fetching customers");
        return;
      }

      const { data, error } = await supabase
        .from('customers')
        .select('id, name, email, phone')
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .order('name');

      if (error) {
        console.error("Failed to fetch customers:", error);
      } else {
        // Deduplicate customers by ID
        const uniqueCustomers = data?.reduce((acc: any[], customer) => {
          if (!acc.some(c => c.id === customer.id)) {
            acc.push(customer);
          }
          return acc;
        }, []) || [];
        setCustomers(uniqueCustomers);
      }
    } catch (error) {
      console.error("Failed to fetch customers:", error);
    }
  };

  useEffect(() => {
  const fetchLocations = async () => {
    const { success, data, error } = await fetchCustomLocations()

    if (success && data) {
      setCustomLocations(data) // Now stores full location objects with id and name
    } else {
      console.error("Failed to fetch custom locations:", error)
    }
  }

  fetchLocations()
}, [])

  // Fetch variant limits when dialog opens
  useEffect(() => {
    const fetchVariantLimits = async () => {
      if (!open) return;
      
      try {
        const supabase = createClient(undefined);
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          const response = await fetch("/api/variant-limits", {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          });
          const data = await response.json();
          
          if (data.success) {
            setVariantLimits(data.data);
          }
        }
      } catch (error) {
        console.error("Failed to fetch variant limits:", error);
      }
    };

    fetchVariantLimits();
    fetchConsignors();
    fetchCustomers();
    
    // Fetch payment types for down payment method
    const fetchPaymentTypes = async () => {
      try {
        const res = await fetch("/api/payment-types");
        const result = await res.json();
        if (result.data && result.data.length > 0) {
          const types = result.data.map((pt: any) => ({
            id: pt.id,
            name: pt.name,
            feeType: pt.fee_type,
            feeValue: pt.fee_value
          }));
          setPaymentTypes(types);
        }
      } catch (error) {
        console.error("Error fetching payment types:", error);
      }
    };
    fetchPaymentTypes();
  }, [open])

  // Add new payment type via API
  const handleAddPaymentType = async () => {
    if (!newPaymentName.trim()) return;
    const body = { name: newPaymentName.trim(), fee_type: newFeeType, fee_value: Number(newFeeValue) };
    const res = await fetch("/api/payment-types", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await res.json();
    if (result.data) {
      setPaymentTypes(prev => [...prev, { id: result.data.id, name: result.data.name, feeType: result.data.fee_type, feeValue: result.data.fee_value }]);
      setNewPaymentName("");
      setNewFeeType("percent");
      setNewFeeValue(0);
      toast({ title: "Success", description: "Payment method added successfully." });
    } else {
      toast({ title: "Error", description: result.error || "Failed to add payment method.", variant: "destructive" });
    }
  };

  // Edit payment type via API
  const handleEditPaymentType = async (id: string) => {
    if (!editPaymentName.trim()) return;
    const body = { id, name: editPaymentName.trim(), fee_type: editFeeType, fee_value: Number(editFeeValue) };
    const res = await fetch("/api/payment-types", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await res.json();
    if (result.data) {
      setPaymentTypes(prev => prev.map(pt => pt.id === id ? { id, name: result.data.name, feeType: result.data.fee_type, feeValue: result.data.fee_value } : pt));
      setEditingPaymentId(null);
      toast({ title: "Success", description: "Payment method updated successfully." });
    } else {
      toast({ title: "Error", description: result.error || "Failed to update payment method.", variant: "destructive" });
    }
  };

  // Delete payment type via API
  const handleDeletePaymentType = async (id: string) => {
    const res = await fetch("/api/payment-types", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    const result = await res.json();
    if (result.success) {
      setPaymentTypes(prev => prev.filter(pt => pt.id !== id));
      toast({ title: "Success", description: "Payment method deleted successfully." });
    } else {
      toast({ title: "Error", description: result.error || "Failed to delete payment method.", variant: "destructive" });
    }
  };

  useEffect(() => {
    if (isAddingToExistingProduct) {
      // If adding to existing product, pre-fill product form with existing details (read-only)
      setProductForm({
        name: existingProductDetails.name,
        brand: existingProductDetails.brand,
        sku: existingProductDetails.sku,
        category: existingProductDetails.category || "Uncategorized",
        originalPrice: existingProductDetails.originalPrice || 0,
        salePrice: 0,
        image: existingProductDetails.image || "/placeholder.svg?height=100&width=100",
        sizeCategory: existingProductDetails.sizeCategory || "Men's", // Use existing size category
      })
      setNewVariant({
        size: undefined,
        location: "Warehouse A",
        status: "Available",
        dateAdded: new Date().toISOString().split("T")[0],
        condition: "New",
        sizeLabel: "US", // Default value
        quantity: 1,
        owner_type: "store", // Default to store ownership
        consignor_id: null, // Default to no consignor
      }) // Reset newVariant for new entry
    } else if (productDataFromApi) {
      // If adding a new product from API, pre-fill product form with API data
      const retailPriceTrait = productDataFromApi.traits?.find((t) => t.trait === "Retail Price")
      const retailPrice = retailPriceTrait ? Number.parseFloat(retailPriceTrait.value) : productDataFromApi.min_price

      // Use inferredSizeCategory if provided, else fallback to "Men's"
      console.log("[AddProductForm] Product title:", productDataFromApi.title, "SKU:", productDataFromApi.sku, "inferredSizeCategory:", inferredSizeCategory);
      setProductForm({
        name: productDataFromApi.title,
        brand: productDataFromApi.brand,
        sku: productDataFromApi.sku,
        category: productDataFromApi.category || productDataFromApi.secondary_category || "Uncategorized",
        originalPrice: 0, // Always start at 0, don't pre-fill with retail price
        salePrice: 0,
        image: productDataFromApi.image || "/placeholder.svg?height=100&width=100",
        sizeCategory: inferredSizeCategory || "Men's",
      });
      // Set image loading when new API data comes in
      if (productDataFromApi.image) {
        setImageLoading(true);
      }
      console.log("[AddProductForm] Set productForm.sizeCategory:", inferredSizeCategory || "Men's");
      setNewVariant({
        size: undefined,
        location: "Warehouse A",
        status: "Available",
        dateAdded: new Date().toISOString().split("T")[0],
        condition: "New",
        sizeLabel: "US", // Default value
        quantity: 1,
        owner_type: "store", // Default to store ownership
        consignor_id: null, // Default to no consignor
      }) // Reset newVariant for new entry
    } else {
      // Reset form if no product data is provided (e.g., closing modal)
      setProductForm({
        name: "",
        brand: "",
        sku: "",
        category: "",
        originalPrice: 0,
        salePrice: 0,
        image: "/placeholder.svg?height=100&width=100",
        sizeCategory: "Men's", // Reset to default
      })
      setNewVariant({
        size: undefined,
        location: "Warehouse A",
        status: "Available",
        dateAdded: new Date().toISOString().split("T")[0],
        condition: "New",
        sizeLabel: "US", // Default value
        quantity: 1,
        owner_type: "store", // Default to store ownership
        consignor_id: null, // Default to no consignor
      }) // Reset newVariant for new entry
    }
    // Reset newVariant and errors regardless of mode
    // Removed: setEditingVariantId and setEditingVariantValues
  }, [productDataFromApi, existingProductDetails, open, inferredSizeCategory]) // Depend on inferredSizeCategory

  // Reset pre-order form when modal opens/closes
  useEffect(() => {
    if (!open) {
      setIsPreOrder(false);
      setPreOrderForm({
        customer_id: "",
        down_payment: "",
        down_payment_method: "",
        expected_delivery_date: "",
        notes: ""
      });
      setShowNewCustomerForm(false);
      setNewCustomerForm({ name: "", phone: "", address: "", email: "" });
      setIsBulkMode(false);
      setBulkSizes([]);
      setShowProductDetails(false);
      setShowAdvanced(false);
    }
  }, [open]);

  // Sync display prices when productForm prices change
  useEffect(() => {
    const originalPriceNum = typeof productForm.originalPrice === "number" ? productForm.originalPrice : parseFloat(productForm.originalPrice) || 0
    const salePriceNum = typeof productForm.salePrice === "number" ? productForm.salePrice : parseFloat(productForm.salePrice) || 0
    
    setDisplayPrices({
      originalPrice: formatNumberWithCommas(originalPriceNum),
      salePrice: formatNumberWithCommas(salePriceNum)
    })
  }, [productForm.originalPrice, productForm.salePrice])

  const handleProductFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { id, value } = e.target
    
    // Handle price fields with comma formatting
    if (id === "originalPrice" || id === "salePrice") {
      // Clean and format the input value
      const cleanedValue = formatInputValue(value)
      
      // Update display state with cleaned value (no commas during typing)
      setDisplayPrices(prev => ({
        ...prev,
        [id]: cleanedValue
      }))
      
      // Parse the numeric value for the actual form state
      const numericValue = parseNumberFromCommaSeparated(cleanedValue)
      const roundedValue = Math.ceil(numericValue * 100) / 100
      
      setProductForm((prev) => ({
        ...prev,
        [id]: roundedValue
      }))
    } else {
      // Handle non-price fields normally
      setProductForm((prev) => ({
        ...prev,
        [id]: value,
      }))
    }
  }

  // Handle focus on price fields - remove commas for easier editing
  const handlePriceFocus = (fieldId: "originalPrice" | "salePrice") => {
    const numericValue = productForm[fieldId]
    setDisplayPrices(prev => ({
      ...prev,
      [fieldId]: numericValue.toString()
    }))
  }

  // Handle blur on price fields - add comma formatting
  const handlePriceBlur = (fieldId: "originalPrice" | "salePrice") => {
    const numericValue = productForm[fieldId]
    if (numericValue === 0 || numericValue === "") {
      setDisplayPrices(prev => ({
        ...prev,
        [fieldId]: ""
      }))
      setProductForm(prev => ({ ...prev, [fieldId]: 0 }))
    } else {
      setDisplayPrices(prev => ({
        ...prev,
        [fieldId]: formatNumberWithCommas(numericValue)
      }))
    }
  }

  const handleNewVariantChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setNewVariant((prev) => ({ 
      ...prev, 
      [id]: id === "quantity" 
        ? value === "" ? "" : Math.max(1, parseInt(value) || 1)
        : value 
    }));
  }

  // Pre-order form handlers
  const handlePreOrderFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setPreOrderForm(prev => ({
      ...prev,
      [id]: value
    }));
  };

  // New customer form handlers
  const handleNewCustomerFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setNewCustomerForm(prev => ({
      ...prev,
      [id]: value
    }));
  };

  const handleCreateNewCustomer = async () => {
    if (!newCustomerForm.name.trim()) {
      toast({
        title: "Missing Customer Name",
        description: "Please enter a customer name.",
        variant: "destructive",
      });
      return;
    }

    // Check if at least email or phone is provided (database constraint requirement)
    if (!newCustomerForm.email.trim() && !newCustomerForm.phone.trim()) {
      toast({
        title: "Missing Contact Information",
        description: "Please provide at least an email address or phone number.",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingCustomer(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("No user found");
      }

      // Only include email and phone if they have actual values to avoid unique constraint issues
      const customerData: any = {
        name: newCustomerForm.name.trim(),
        user_id: user.id,
      };

      // Only add email if provided, otherwise let it be NULL
      if (newCustomerForm.email.trim()) {
        customerData.email = newCustomerForm.email.trim();
      }

      // Only add phone if provided, otherwise let it be NULL  
      if (newCustomerForm.phone.trim()) {
        customerData.phone = newCustomerForm.phone.trim();
      }

      // Only add address if provided
      if (newCustomerForm.address.trim()) {
        customerData.address = newCustomerForm.address.trim();
      }

      const { data, error } = await supabase
        .from('customers')
        .insert([customerData])
        .select('id, name, email, phone')
        .single();

      if (error) {
        throw new Error(error.message);
      }

      // Add the new customer to the list and select it
      setCustomers(prev => [...prev, data]);
      setPreOrderForm(prev => ({ ...prev, customer_id: data.id.toString() }));
      
      // Reset and close the form
      setNewCustomerForm({ name: "", phone: "", address: "", email: "" });
      setShowNewCustomerForm(false);
      
      toast({
        title: "Customer Added",
        description: `Customer "${data.name}" has been added and selected for the pre-order.`,
      });
    } catch (error: any) {
      console.error("Failed to create customer:", error);
      toast({
        title: "Failed to Create Customer",
        description: error.message || "An error occurred while creating the customer.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  const handleAddCustomLocation = async () => {
    if (!newCustomLocationName.trim()) {
      toast({
        title: "Location Name Empty",
        description: "Please enter a name for the new location.",
        variant: "destructive",
      });
      return;
    }

    startTransition(async () => {
      try {
        const supabase = createClient(undefined);
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          toast({
            title: "Authentication Required",
            description: "Please sign in to add a custom location.",
            variant: "destructive",
          });
          return;
        }

        const response = await fetch('/api/add-custom-location', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            locationName: newCustomLocationName.trim(),
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to add custom location');
        }

        if (result.success) {
          toast({
            title: "Location Added",
            description: `"${newCustomLocationName}" has been added to custom locations.`,
          });
          // Use the location data from the API response which includes all required fields
          if (result.data) {
            setCustomLocations((prev) => [...prev, result.data].sort((a, b) => a.name.localeCompare(b.name)));
          }
          setNewCustomLocationName("");
          setShowCustomLocationInput(false);
        } else {
          toast({
            title: "Error",
            description: result.error || "Failed to add custom location",
            variant: "destructive",
          });
        }
      } catch (error: any) {
        console.error("Error adding custom location:", error);
        toast({
          title: "Error",
          description: error.message || "An error occurred while adding the custom location",
          variant: "destructive",
        });
      }
    });
  }

  // All variant editing/removal logic removed; only single quantity input is used now.

  // Bulk mode helpers
  const addBulkSize = (size: string) => {
    if (bulkSizes.some(bs => bs.size === size)) return; // Already added
    setBulkSizes(prev => [...prev, { id: uuidv4(), size, quantity: 1 }]);
  }
  
  const removeBulkSize = (id: string) => {
    setBulkSizes(prev => prev.filter(bs => bs.id !== id));
  }
  
  const updateBulkSizeQty = (id: string, qty: number) => {
    setBulkSizes(prev => prev.map(bs => bs.id === id ? { ...bs, quantity: Math.max(1, qty) } : bs));
  }
  
  const totalBulkQuantity = bulkSizes.reduce((sum, bs) => sum + bs.quantity, 0);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const supabase = createClient(undefined);
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error("Authentication required");
      }

      // Calculate total variants to add
      const totalVariants = isBulkMode ? totalBulkQuantity : (typeof newVariant.quantity === "string" ? parseInt(newVariant.quantity) || 1 : newVariant.quantity || 1);

      // Check variant limits before proceeding
      try {
        const variantLimitResponse = await fetch("/api/variant-limits", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        const variantLimitData = await variantLimitResponse.json();
        
        if (variantLimitData.success) {
          const variantsToAdd = totalVariants;
          if (variantLimitData.data.current + variantsToAdd > variantLimitData.data.limit) {
            const remaining = variantLimitData.data.remaining;
            toast({
              title: "Variant Limit Exceeded",
              description: remaining === 0 
                ? `Variant limit reached. Your ${variantLimitData.data.plan} plan allows up to ${variantLimitData.data.limit.toLocaleString()} available variants. You currently have ${variantLimitData.data.current.toLocaleString()} available variants. Please upgrade your plan to add more variants.`
                : `Variant limit exceeded. Your ${variantLimitData.data.plan} plan allows up to ${variantLimitData.data.limit.toLocaleString()} available variants. You currently have ${variantLimitData.data.current.toLocaleString()} available variants and are trying to add ${variantsToAdd} more. Only ${remaining} slots remaining. Please adjust your quantity to ${remaining} or upgrade your plan.`,
              variant: "destructive",
            });
            setIsSubmitting(false);
            return;
          }
        }
      } catch (limitError) {
        console.warn("Could not check variant limits:", limitError);
        // Continue with submission if limit check fails
      }

      // Validate productForm and newVariant
      if (!productDataFromApi) {
        if (!productForm.name || !productForm.brand || !productForm.sku || !productForm.category) {
          toast({
            title: "Missing Fields",
            description: "Please fill in all required fields.",
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }
      }
      
      // Validate based on mode
      if (isBulkMode) {
        if (bulkSizes.length === 0) {
          toast({
            title: "No Sizes Selected",
            description: "Please select at least one size to add.",
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }
        if (!newVariant.location && !isPreOrder) {
          toast({
            title: "Missing Location",
            description: "Please select a location for the variants.",
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }
      } else {
        const quantityNum = typeof newVariant.quantity === "string" ? parseInt(newVariant.quantity) || 0 : newVariant.quantity;
        if (!newVariant.size || (!newVariant.location && !isPreOrder) || !newVariant.status || !newVariant.dateAdded || !newVariant.condition || !newVariant.quantity || quantityNum < 1) {
          toast({
            title: "Missing Variant Details",
            description: "Please fill in all required fields for the variant.",
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }
      }
      const quantityNum = isBulkMode ? totalBulkQuantity : (typeof newVariant.quantity === "string" ? parseInt(newVariant.quantity) || 0 : newVariant.quantity);

      // Validate consignor selection if owner_type is 'consignor'
      if (newVariant.owner_type === 'consignor' && !newVariant.consignor_id) {
        toast({
          title: "Missing Consignor",
          description: "Please select a consignor for this variant.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Validate pre-order fields if pre-order is enabled
      if (isPreOrder && !preOrderForm.customer_id) {
        toast({
          title: "Missing Customer",
          description: "Please select a customer for the pre-order.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // 1. Check for existing product (if not adding to existing)
      let productId = existingProductDetails?.id;
      if (!productId) {
        // Check if product with same SKU and user_id exists
        const { data: existingProduct, error: existingProductError } = await supabase
          .from('products')
          .select('id')
          .eq('sku', productForm.sku)
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (existingProductError) {
          throw new Error(existingProductError.message || 'Failed to check for existing product');
        }

        if (existingProduct && existingProduct.id) {
          productId = existingProduct.id;
        } else {
          // Map camelCase to snake_case for DB columns
          const dbProduct = {
            name: productForm.name,
            brand: productForm.brand,
            sku: productForm.sku,
            category: productForm.category,
            original_price: productForm.originalPrice,
            sale_price: productForm.salePrice,
            image: productForm.image,
            size_category: productForm.sizeCategory,
            user_id: session.user.id,
          };
          const { data: productInsert, error: productError } = await supabase
            .from('products')
            .insert([dbProduct])
            .select('id')
            .single();
          if (productError || !productInsert) {
            throw new Error(productError?.message || 'Failed to create product');
          }
          productId = productInsert.id;
        }
      }

      // Check if this is a pre-order vs regular inventory addition
      if (isPreOrder && preOrderForm.customer_id) {
        // For pre-orders, don't create variants - just create the pre-order record
        console.log('Creating pre-order with data:', {
          customer_id: preOrderForm.customer_id,
          product_id: productId,
          size: newVariant.size,
          quantity: quantityNum,
          cost_price: productForm.originalPrice,
          sale_price: productForm.salePrice,
          down_payment: preOrderForm.down_payment
        });

        // Create a single pre-order record for testing
        const preOrderData = {
          customer_id: parseInt(preOrderForm.customer_id),
          product_id: productId,
          variant_id: null, // UUID field, keeping as null
          size: newVariant.size,
          size_label: newVariant.sizeLabel,
          cost_price: 0, // Cost will be entered at checkout
          total_amount: typeof productForm.salePrice === 'number' 
            ? productForm.salePrice 
            : parseNumberFromCommaSeparated(productForm.salePrice) || 0,
          down_payment: preOrderForm.down_payment ? parseNumberFromCommaSeparated(preOrderForm.down_payment) : 0,
          down_payment_method: preOrderForm.down_payment_method,
          // remaining_balance is a generated column - don't insert it
          status: 'pending',
          pre_order_date: new Date().toISOString().split('T')[0], // Add required pre_order_date field
          expected_delivery_date: preOrderForm.expected_delivery_date || null,
          notes: preOrderForm.notes || null,
          user_id: session.user.id,
        };

        console.log('About to insert single pre-order record:', preOrderData);

        // First, let's test if the table exists by doing a simple select
        const { data: testData, error: testError } = await supabase
          .from('pre_orders')
          .select('*')
          .limit(1);
        
        if (testError) {
          console.error('Pre_orders table test failed:', testError);
          console.error('Table may not exist. Error details:', JSON.stringify(testError, null, 2));
          toast({
            title: "Database Error",
            description: "Pre-orders table does not exist. Please contact support.",
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        } else {
          console.log('Pre_orders table exists, test query successful:', testData);
        }

        const { data: preOrderResult, error: preOrderError } = await supabase
          .from('pre_orders')
          .insert([preOrderData]);
        
        if (preOrderError) {
          console.error('Failed to create pre-order:', preOrderError);
          console.error('Error details:', JSON.stringify(preOrderError, null, 2));
          console.error('Pre-order data that failed:', preOrderData);
          toast({
            title: "Failed to Create Pre-order",
            description: `Pre-order creation failed: ${preOrderError.message || preOrderError.details || 'Unknown error occurred'}`,
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }

        console.log('Pre-order created successfully:', preOrderResult);

        // If quantity > 1, create additional records
        if (quantityNum > 1) {
          const additionalRecords = Array.from({ length: quantityNum - 1 }, (_, i) => ({
            customer_id: parseInt(preOrderForm.customer_id),
            product_id: productId,
            variant_id: null,
            size: newVariant.size,
            size_label: newVariant.sizeLabel,
            cost_price: 0, // Cost will be entered at checkout
            total_amount: typeof productForm.salePrice === 'number' 
              ? productForm.salePrice 
              : parseNumberFromCommaSeparated(productForm.salePrice) || 0,
            down_payment: preOrderForm.down_payment ? parseNumberFromCommaSeparated(preOrderForm.down_payment) : 0,
            down_payment_method: preOrderForm.down_payment_method,
            // remaining_balance is a generated column - don't insert it
            status: 'pending',
            pre_order_date: new Date().toISOString().split('T')[0],
            expected_delivery_date: preOrderForm.expected_delivery_date || null,
            notes: preOrderForm.notes || null,
            user_id: session.user.id,
          }));

          console.log('Creating additional pre-order records:', additionalRecords);
          
          const { error: additionalError } = await supabase
            .from('pre_orders')
            .insert(additionalRecords);
          
          if (additionalError) {
            console.error('Failed to create additional pre-order records:', additionalError);
            // Don't fail the entire operation, just log the error
          }
        }

        toast({
          title: "Pre-order Created Successfully! ðŸŽ‰",
          description: `Pre-order for ${quantityNum} ${quantityNum === 1 ? 'item' : 'items'} of "${productForm.name || productDataFromApi?.title || existingProductDetails?.name}" has been created for ${customers.find(c => c.id.toString() === preOrderForm.customer_id)?.name}.`,
        });
      } else {
        // For regular inventory, create variants using the robust utility function
        try {
          // Find location_id from location name
          const selectedLocation = customLocations.find(loc => loc.name === newVariant.location);
          
          // Get payout method settings (use override if set, otherwise consignor default)
          const selectedConsignor = consignors.find(c => c.id === newVariant.consignor_id);
          const finalPayoutMethod = payoutMethodOverride || selectedConsignor?.payout_method || 'percentage_split';
          const finalFixedMarkup = fixedMarkupOverride !== null ? fixedMarkupOverride : (selectedConsignor?.fixed_markup || null);
          const finalMarkupPercentage = markupPercentageOverride !== null ? markupPercentageOverride : (selectedConsignor?.markup_percentage || null);

          // Build variants array - handle both bulk and single mode
          let variants: any[];
          if (isBulkMode) {
            variants = bulkSizes.flatMap(bs => 
              Array.from({ length: bs.quantity }, () => ({
                id: uuidv4(),
                product_id: productId,
                size: bs.size,
                variant_sku: productForm.sku,
                location_id: selectedLocation?.id || null,
                location: newVariant.location,
                status: newVariant.status,
                date_added: newVariant.dateAdded,
                condition: newVariant.condition,
                size_label: newVariant.sizeLabel,
                cost_price: typeof productForm.originalPrice === 'number' 
                  ? productForm.originalPrice 
                  : parseNumberFromCommaSeparated(productForm.originalPrice) || 0,
                sale_price: typeof productForm.salePrice === 'number' 
                  ? productForm.salePrice 
                  : parseNumberFromCommaSeparated(productForm.salePrice) || 0,
                isArchived: false,
                owner_type: newVariant.owner_type,
                consignor_id: newVariant.owner_type === 'consignor' ? newVariant.consignor_id : null,
                payout_method: newVariant.owner_type === 'consignor' ? finalPayoutMethod : null,
                fixed_markup: newVariant.owner_type === 'consignor' ? finalFixedMarkup : null,
                markup_percentage: newVariant.owner_type === 'consignor' ? finalMarkupPercentage : null,
                type: 'In Stock',
              }))
            );
          } else {
            variants = Array.from({ length: quantityNum }, () => ({
              id: uuidv4(),
              product_id: productId,
              size: newVariant.size,
              variant_sku: productForm.sku,
              location_id: selectedLocation?.id || null,
              location: newVariant.location,
              status: newVariant.status,
              date_added: newVariant.dateAdded,
              condition: newVariant.condition,
              size_label: newVariant.sizeLabel,
              cost_price: typeof productForm.originalPrice === 'number' 
                ? productForm.originalPrice 
                : parseNumberFromCommaSeparated(productForm.originalPrice) || 0,
              sale_price: typeof productForm.salePrice === 'number' 
                ? productForm.salePrice 
                : parseNumberFromCommaSeparated(productForm.salePrice) || 0,
              isArchived: false,
              owner_type: newVariant.owner_type,
              consignor_id: newVariant.owner_type === 'consignor' ? newVariant.consignor_id : null,
              payout_method: newVariant.owner_type === 'consignor' ? finalPayoutMethod : null,
              fixed_markup: newVariant.owner_type === 'consignor' ? finalFixedMarkup : null,
              markup_percentage: newVariant.owner_type === 'consignor' ? finalMarkupPercentage : null,
              type: 'In Stock',
            }));
          }

          // Use the utility function to insert variants with unique serial numbers
          const result = await insertVariantsWithUniqueSerials(variants, session.user.id, supabase);
          
          if (!result.success) {
            throw new Error(result.error || `Could only insert ${result.insertedCount} out of ${variants.length} variants`);
          }
        } catch (error: any) {
          throw new Error(error.message || 'Failed to create variants');
        }

        const totalAdded = isBulkMode ? totalBulkQuantity : quantityNum;
        const sizesSummary = isBulkMode 
          ? bulkSizes.map(bs => `${bs.size} x${bs.quantity}`).join(', ')
          : `Size ${newVariant.size} x${quantityNum}`;
        toast({
          title: "Product Added Successfully! ðŸŽ‰",
          description: `Added ${totalAdded} ${totalAdded === 1 ? 'variant' : 'variants'} (${sizesSummary}) of "${productForm.name || productDataFromApi?.title || existingProductDetails?.name}" to your inventory.`,
        });
      }
      onOpenChange(false);
      onProductAdded();
    } catch (error: any) {
      console.error("Error adding product/variants:", error);
      toast({
        title: "Error",
        description: error.message || "An error occurred while adding the product/variants",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const dynamicSizes = getDynamicSizes(productForm.sizeCategory, newVariant.sizeLabel)

  const canSubmit = isBulkMode 
    ? bulkSizes.length > 0 && (isPreOrder || !!newVariant.location)
    : !!newVariant.size && !!productForm.sizeCategory && (isPreOrder || !!newVariant.location)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 custom-scrollbar">
        {/* Header with product info */}
        <div className="sticky top-0 z-10 bg-background border-b">
          <DialogHeader className="p-4 pb-3">
            <DialogTitle className="text-base font-semibold">
              {isAddingToExistingProduct ? `Add Variants to ${existingProductDetails.name}` : "Add New Product"}
            </DialogTitle>
          </DialogHeader>
          
          {/* Compact product preview */}
          {(productDataFromApi || isAddingToExistingProduct) && (
            <div className="px-4 pb-3">
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-muted/50 shrink-0">
                  {imageLoading && <Skeleton className="w-full h-full" />}
                  <Image
                    src={productForm.image || "/placeholder.svg"}
                    alt="Product"
                    fill
                    className={cn(
                      "object-contain p-1 transition-opacity",
                      imageLoading ? "opacity-0" : "opacity-100"
                    )}
                    onLoad={() => setImageLoading(false)}
                    onError={() => setImageLoading(false)}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{productForm.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{productForm.brand}</span>
                    <span>/</span>
                    <span className="font-mono">{productForm.sku}</span>
                    <span>/</span>
                    <span>{productForm.sizeCategory}</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 shrink-0"
                  onClick={() => setShowProductDetails(!showProductDetails)}
                >
                  {showProductDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  <span className="ml-1">Edit</span>
                </Button>
              </div>
            </div>
          )}

          {/* Variant limit bar */}
          {variantLimits && (
            <div className="px-4 pb-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    variantLimits.remaining <= 10 ? "bg-red-500" :
                    variantLimits.remaining <= 50 ? "bg-yellow-500" :
                    "bg-emerald-500"
                  )} />
                  <span className="text-muted-foreground">
                    {variantLimits.current.toLocaleString()} / {variantLimits.limit.toLocaleString()} variants
                  </span>
                </div>
                <span className="text-muted-foreground">
                  {variantLimits.remaining.toLocaleString()} remaining
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 space-y-4">
          {/* Collapsible Product Details (for API products - they're pre-filled) */}
          {showProductDetails && (productDataFromApi || isAddingToExistingProduct) && (
            <div className="space-y-3 p-3 rounded-lg border bg-muted/30 animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-3">
                <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-muted/50 shrink-0 border">
                  <Image
                    src={productForm.image || "/placeholder.svg"}
                    alt="Product"
                    fill
                    className="object-contain p-1"
                  />
                </div>
                <div className="flex-1 space-y-1.5">
                  <div>
                    <Label htmlFor="name" className="text-xs">Name</Label>
                    <Input id="name" value={productForm.name} onChange={handleProductFormChange} disabled={isAddingToExistingProduct} className="h-8 text-xs" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label htmlFor="brand" className="text-xs">Brand</Label>
                  <Input id="brand" value={productForm.brand} onChange={handleProductFormChange} disabled={isAddingToExistingProduct} className="h-8 text-xs" />
                </div>
                <div>
                  <Label htmlFor="sku" className="text-xs">SKU</Label>
                  <Input id="sku" value={productForm.sku} onChange={handleProductFormChange} disabled={isAddingToExistingProduct} className="h-8 text-xs" />
                </div>
                <div>
                  <Label htmlFor="category" className="text-xs">Category</Label>
                  <Input id="category" value={productForm.category} onChange={handleProductFormChange} disabled={isAddingToExistingProduct} className="h-8 text-xs" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="sizeCategory" className="text-xs">Size Category</Label>
                  <Select value={productForm.sizeCategory || "Men's"} onValueChange={(value) => setProductForm((prev) => ({ ...prev, sizeCategory: value }))} disabled={isAddingToExistingProduct}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Men's">Men&apos;s</SelectItem>
                      <SelectItem value="Women's">Women&apos;s</SelectItem>
                      <SelectItem value="Toddlers">Toddlers</SelectItem>
                      <SelectItem value="Youth">Youth</SelectItem>
                      <SelectItem value="Unisex">Unisex</SelectItem>
                      <SelectItem value="T-Shirts">T-Shirts</SelectItem>
                      <SelectItem value="Figurines">Figurines</SelectItem>
                      <SelectItem value="Collectibles">Collectibles</SelectItem>
                      <SelectItem value="Pop Marts">Pop Marts</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="image" className="text-xs">Image URL</Label>
                  <Input id="image" value={productForm.image} onChange={handleProductFormChange} disabled={isAddingToExistingProduct} className="h-8 text-xs" />
                </div>
              </div>
            </div>
          )}

          {/* Product details for non-API products (when manual/no prefill) */}
          {!productDataFromApi && !isAddingToExistingProduct && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-muted/50 shrink-0 border">
                  {productForm.image && productForm.image !== "/placeholder.svg?height=100&width=100" ? (
                    <Image src={productForm.image} alt="Product" fill className="object-contain p-1" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-6 w-6 text-muted-foreground/40" />
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-1.5">
                  <div>
                    <Label htmlFor="name" className="text-xs">Product Name *</Label>
                    <Input id="name" value={productForm.name} onChange={handleProductFormChange} placeholder="e.g. Nike Dunk Low Panda" className="h-8 text-xs" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label htmlFor="brand" className="text-xs">Brand *</Label>
                  <Input id="brand" value={productForm.brand} onChange={handleProductFormChange} placeholder="Nike" className="h-8 text-xs" />
                </div>
                <div>
                  <Label htmlFor="sku" className="text-xs">SKU *</Label>
                  <Input id="sku" value={productForm.sku} onChange={handleProductFormChange} placeholder="DD1391-100" className="h-8 text-xs" />
                </div>
                <div>
                  <Label htmlFor="category" className="text-xs">Category *</Label>
                  <Input id="category" value={productForm.category} onChange={handleProductFormChange} placeholder="Sneakers" className="h-8 text-xs" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="sizeCategory" className="text-xs">Size Category</Label>
                  <Select value={productForm.sizeCategory || "Men's"} onValueChange={(value) => setProductForm((prev) => ({ ...prev, sizeCategory: value }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Men's">Men&apos;s</SelectItem>
                      <SelectItem value="Women's">Women&apos;s</SelectItem>
                      <SelectItem value="Toddlers">Toddlers</SelectItem>
                      <SelectItem value="Youth">Youth</SelectItem>
                      <SelectItem value="Unisex">Unisex</SelectItem>
                      <SelectItem value="T-Shirts">T-Shirts</SelectItem>
                      <SelectItem value="Figurines">Figurines</SelectItem>
                      <SelectItem value="Collectibles">Collectibles</SelectItem>
                      <SelectItem value="Pop Marts">Pop Marts</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="image" className="text-xs">Image URL</Label>
                  <Input id="image" value={productForm.image} onChange={handleProductFormChange} placeholder="https://..." className="h-8 text-xs" />
                </div>
              </div>
            </div>
          )}

          {/* Pricing */}
          <div className="grid grid-cols-2 gap-3">
            {!isPreOrder && (
              <div>
                <Label htmlFor="originalPrice" className="text-xs">Cost Price ({currencySymbol})</Label>
                <Input
                  id="originalPrice"
                  type="text"
                  value={displayPrices.originalPrice}
                  onChange={handleProductFormChange}
                  onFocus={() => handlePriceFocus("originalPrice")}
                  onBlur={() => handlePriceBlur("originalPrice")}
                  placeholder="0"
                  className="h-8 text-xs"
                />
              </div>
            )}
            <div className={isPreOrder ? "col-span-2" : ""}>
              <Label htmlFor="salePrice" className="text-xs">Sale Price ({currencySymbol})</Label>
              <Input
                id="salePrice"
                type="text"
                value={displayPrices.salePrice}
                onChange={handleProductFormChange}
                onFocus={() => handlePriceFocus("salePrice")}
                onBlur={() => handlePriceBlur("salePrice")}
                placeholder="0"
                className="h-8 text-xs"
              />
            </div>
          </div>

          {/* Size Selection Section - the main action area */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Sizes & Quantity</Label>
              <Button
                variant={isBulkMode ? "default" : "outline"}
                size="sm"
                className="text-xs h-7 gap-1.5"
                onClick={() => {
                  setIsBulkMode(!isBulkMode);
                  if (!isBulkMode) setBulkSizes([]);
                }}
              >
                <Layers className="h-3 w-3" />
                {isBulkMode ? "Bulk Mode" : "Single Mode"}
              </Button>
            </div>

            {/* Size label selector */}
            <div className="flex items-center gap-2">
              <Label htmlFor="sizeLabel" className="text-xs shrink-0">Size Label:</Label>
              <Select
                value={newVariant.sizeLabel}
                onValueChange={(value) => {
                  setNewVariant((prev) => ({ ...prev, sizeLabel: value, size: undefined }));
                  if (isBulkMode) setBulkSizes([]);
                }}
              >
                <SelectTrigger className="h-8 text-xs w-24"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="US">US</SelectItem>
                  <SelectItem value="UK">UK</SelectItem>
                  <SelectItem value="EU">EU</SelectItem>
                  <SelectItem value="CM">CM</SelectItem>
                  <SelectItem value="TD">TD</SelectItem>
                  <SelectItem value="YC">YC</SelectItem>
                  <SelectItem value="Clothing">Clothing</SelectItem>
                  <SelectItem value="Standard">Standard</SelectItem>
                  <SelectItem value="Series">Series</SelectItem>
                  <SelectItem value="Limited">Limited</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isBulkMode ? (
              /* Bulk Mode - Click sizes to add them */
              <div className="space-y-3">
                {/* Size grid - click to toggle */}
                <div className="border rounded-lg p-3 bg-muted/20">
                  <p className="text-[11px] text-muted-foreground mb-2">Click sizes to add them:</p>
                  {dynamicSizes.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {dynamicSizes.map((size) => {
                        const isSelected = bulkSizes.some(bs => bs.size === size);
                        return (
                          <button
                            key={size}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                removeBulkSize(bulkSizes.find(bs => bs.size === size)!.id);
                              } else {
                                addBulkSize(size);
                              }
                            }}
                            className={cn(
                              "px-2.5 py-1 rounded-md text-xs font-medium transition-all border",
                              isSelected
                                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                : "bg-background hover:bg-muted border-border"
                            )}
                          >
                            {size}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Select size label & category first</p>
                  )}
                </div>

                {/* Selected sizes with quantity editors */}
                {bulkSizes.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground">{bulkSizes.length} size{bulkSizes.length !== 1 ? 's' : ''} selected / {totalBulkQuantity} total pairs</p>
                    <div className="border rounded-lg divide-y max-h-40 overflow-y-auto">
                      {bulkSizes.map((bs) => (
                        <div key={bs.id} className="flex items-center justify-between px-3 py-1.5">
                          <span className="text-xs font-medium w-16">Size {bs.size}</span>
                          <div className="flex items-center gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => updateBulkSizeQty(bs.id, bs.quantity - 1)}
                              disabled={bs.quantity <= 1}
                            >
                              -
                            </Button>
                            <Input
                              type="number"
                              value={bs.quantity}
                              onChange={(e) => updateBulkSizeQty(bs.id, parseInt(e.target.value) || 1)}
                              className="h-6 w-12 text-center text-xs px-1"
                              min={1}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => updateBulkSizeQty(bs.id, bs.quantity + 1)}
                            >
                              +
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500"
                              onClick={() => removeBulkSize(bs.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Single Mode */
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="size" className="text-xs">Size</Label>
                  <Select
                    value={newVariant.size}
                    onValueChange={(value) => setNewVariant((prev) => ({ ...prev, size: value }))}
                    disabled={!newVariant.sizeLabel || !productForm.sizeCategory}
                  >
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select size" /></SelectTrigger>
                    <SelectContent>
                      {dynamicSizes.length > 0 ? (
                        dynamicSizes.map((size) => (
                          <SelectItem key={size} value={size}>{size}</SelectItem>
                        ))
                      ) : (
                        <SelectItem value="placeholder-size-select" disabled>Select Size Label & Category First</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="quantity" className="text-xs">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min={1}
                    max={!isPreOrder && variantLimits ? variantLimits.remaining : undefined}
                    value={newVariant.quantity}
                    onChange={handleNewVariantChange}
                    onBlur={(e) => {
                      if (e.target.value === "" || parseInt(e.target.value) < 1) {
                        setNewVariant(prev => ({ ...prev, quantity: 1 }))
                      }
                    }}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Location & Condition - compact row */}
          {!isPreOrder && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="location" className="text-xs">Location</Label>
                <Select
                  value={newVariant.location}
                  onValueChange={(value) => {
                    if (value === "add-custom-location") {
                      setShowCustomLocationInput(true)
                      setNewVariant((prev) => ({ ...prev, location: undefined }))
                    } else {
                      setShowCustomLocationInput(false)
                      setNewVariant((prev) => ({ ...prev, location: value }))
                    }
                  }}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select location" /></SelectTrigger>
                  <SelectContent>
                    {customLocations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.name}>{loc.name}</SelectItem>
                    ))}
                    {customLocations.length === 0 && (
                      <SelectItem value="__no-locations__" disabled className="text-xs text-muted-foreground italic">No locations yet</SelectItem>
                    )}
                    <SelectItem value="add-custom-location">+ Add New Location</SelectItem>
                  </SelectContent>
                </Select>
                {showCustomLocationInput && (
                  <div className="flex gap-1.5 mt-1.5">
                    <Input
                      placeholder="New location name"
                      value={newCustomLocationName}
                      onChange={(e) => setNewCustomLocationName(e.target.value)}
                      className="h-7 text-xs flex-1"
                      disabled={isPending}
                    />
                    <Button type="button" onClick={handleAddCustomLocation} size="sm" className="h-7 px-2" disabled={isPending}>
                      {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                    </Button>
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="condition" className="text-xs">Condition</Label>
                <Select value={newVariant.condition} onValueChange={(value) => setNewVariant((prev) => ({ ...prev, condition: value }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="New">New</SelectItem>
                    <SelectItem value="Used">Used</SelectItem>
                    <SelectItem value="Damaged">Damaged</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Owner selection */}
          <div>
            <Label htmlFor="owner_type" className="text-xs">Owner</Label>
            <Select
              value={newVariant.owner_type}
              onValueChange={(value: 'store' | 'consignor') => {
                setNewVariant((prev) => ({ ...prev, owner_type: value, consignor_id: value === 'store' ? null : prev.consignor_id }))
              }}
            >
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="store">You (Store Inventory)</SelectItem>
                <SelectItem value="consignor">Consignor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Consignor selection */}
          {newVariant.owner_type === 'consignor' && (
            <div className="space-y-2">
              {consignors.length === 0 ? (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                  <p className="text-xs text-yellow-800 dark:text-yellow-200 mb-2">No consignors found.</p>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => { onOpenChange(false); router.push('/consignors'); }} className="flex-1 text-xs h-7">
                      <ExternalLink className="w-3 h-3 mr-1" /> Add Consignors
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={fetchConsignors} className="text-xs h-7 px-2">
                      <RefreshCw className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <Select value={newVariant.consignor_id?.toString() || ""} onValueChange={(value) => setNewVariant((prev) => ({ ...prev, consignor_id: parseInt(value) }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select consignor" /></SelectTrigger>
                    <SelectContent>
                      {consignors.map((c) => (
                        <SelectItem key={c.id} value={c.id.toString()}>
                          {c.name} ({c.commission_rate}%)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {newVariant.consignor_id && (
                    <div className="p-2.5 bg-blue-50 dark:bg-blue-950/20 rounded-md border border-blue-200 dark:border-blue-800 space-y-2">
                      {(() => {
                        const selectedConsignor = consignors.find(c => c.id === newVariant.consignor_id);
                        if (!selectedConsignor) return null;
                        const currentMethod = payoutMethodOverride || selectedConsignor.payout_method;
                        return (
                          <>
                            <div>
                              <Label className="text-[11px] text-blue-700 dark:text-blue-300">Payout Method</Label>
                              <Select value={currentMethod} onValueChange={(value: any) => setPayoutMethodOverride(value)}>
                                <SelectTrigger className="h-7 text-xs mt-0.5"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="percentage_split">{selectedConsignor.commission_rate}% Commission Split</SelectItem>
                                  <SelectItem value="cost_price">Cost Price Only</SelectItem>
                                  <SelectItem value="cost_plus_fixed">Cost + Fixed Markup</SelectItem>
                                  <SelectItem value="cost_plus_percentage">Cost + % Markup</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            {currentMethod === 'cost_plus_fixed' && (
                              <div>
                                <Label className="text-[11px]">Fixed Markup ({currency})</Label>
                                <Input type="number" value={fixedMarkupOverride ?? selectedConsignor.fixed_markup ?? 0} onChange={(e) => setFixedMarkupOverride(parseFloat(e.target.value) || 0)} className="h-7 text-xs" min="0" />
                              </div>
                            )}
                            {currentMethod === 'cost_plus_percentage' && (
                              <div>
                                <Label className="text-[11px]">Markup %</Label>
                                <Input type="number" value={markupPercentageOverride ?? selectedConsignor.markup_percentage ?? 0} onChange={(e) => setMarkupPercentageOverride(parseFloat(e.target.value) || 0)} className="h-7 text-xs" min="0" max="100" />
                              </div>
                            )}
                            {payoutMethodOverride && (
                              <button type="button" onClick={() => { setPayoutMethodOverride(null); setFixedMarkupOverride(null); setMarkupPercentageOverride(null); }} className="text-[11px] text-blue-600 hover:underline">
                                Reset to default
                              </button>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Advanced options toggle */}
          <button
            type="button"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {showAdvanced ? "Hide" : "Show"} advanced options
          </button>

          {showAdvanced && (
            <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
              {/* Date Added */}
              {!isPreOrder && (
                <div>
                  <Label htmlFor="dateAdded" className="text-xs">Date Added</Label>
                  <Input id="dateAdded" type="date" value={newVariant.dateAdded} onChange={handleNewVariantChange} className="h-8 text-xs" />
                </div>
              )}

              {/* Pre-order Section */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="isPreOrder" checked={isPreOrder} onChange={(e) => setIsPreOrder(e.target.checked)} className="rounded border-gray-300" />
                  <Label htmlFor="isPreOrder" className="text-xs font-medium">This is a pre-order</Label>
                </div>

                {isPreOrder && (
                  <div className="space-y-2.5 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-[11px] text-blue-700 dark:text-blue-300">Pre-order items are not added to inventory until received.</p>
                    
                    <div>
                      <Label className="text-xs">Customer</Label>
                      {!showNewCustomerForm ? (
                        <Popover open={customerSearchOpen} onOpenChange={setCustomerSearchOpen}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" className="w-full justify-between text-xs h-8 mt-0.5">
                              {preOrderForm.customer_id ? customers.find((c) => c.id.toString() === preOrderForm.customer_id)?.name || "Select customer" : "Select customer"}
                              <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[280px] p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Search customers..." value={customerSearchValue} onValueChange={setCustomerSearchValue} className="h-8 text-xs" />
                              <CommandList>
                                <div className="max-h-32 overflow-y-auto">
                                  <CommandEmpty><p className="text-xs text-center py-2">No customers found.</p></CommandEmpty>
                                  <CommandGroup>
                                    {customers.map((customer) => (
                                      <CommandItem key={customer.id} value={`${customer.name} ${customer.email}`} onSelect={() => { setPreOrderForm(prev => ({ ...prev, customer_id: customer.id.toString() })); setCustomerSearchOpen(false); }}>
                                        <div className="flex flex-col"><span className="text-xs font-medium">{customer.name}</span><span className="text-[11px] text-muted-foreground">{customer.email}</span></div>
                                        <Check className={cn("ml-auto h-3 w-3", preOrderForm.customer_id === customer.id.toString() ? "opacity-100" : "opacity-0")} />
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </div>
                                <div className="border-t p-1">
                                  <CommandItem value="add-new-customer-always-visible" onSelect={() => { setShowNewCustomerForm(true); setCustomerSearchOpen(false); }} className="flex items-center gap-1.5 text-blue-600">
                                    <Plus className="w-3 h-3" /><span className="text-xs font-medium">Add New Customer</span>
                                  </CommandItem>
                                </div>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      ) : (
                        <div className="space-y-2 border rounded-md p-2.5 bg-background mt-0.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium">New Customer</span>
                            <Button variant="ghost" size="sm" onClick={() => { setShowNewCustomerForm(false); setNewCustomerForm({ name: "", phone: "", address: "", email: "" }); }} className="h-5 w-5 p-0"><XCircle className="w-3 h-3" /></Button>
                          </div>
                          <Input id="name" value={newCustomerForm.name} onChange={handleNewCustomerFormChange} placeholder="Name *" className="h-7 text-xs" />
                          <div className="grid grid-cols-2 gap-1.5">
                            <Input id="email" type="email" value={newCustomerForm.email} onChange={handleNewCustomerFormChange} placeholder="Email" className="h-7 text-xs" />
                            <Input id="phone" value={newCustomerForm.phone} onChange={handleNewCustomerFormChange} placeholder="Phone" className="h-7 text-xs" />
                          </div>
                          <Button onClick={handleCreateNewCustomer} disabled={isCreatingCustomer || !newCustomerForm.name.trim()} className="w-full h-7 text-xs">
                            {isCreatingCustomer ? <Loader2 className="w-3 h-3 animate-spin" /> : "Add Customer"}
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Down Payment ({currencySymbol})</Label>
                        <Input id="down_payment" type="text" value={preOrderForm.down_payment} onChange={handlePreOrderFormChange} placeholder="0" className="h-7 text-xs" />
                      </div>
                      <div>
                        <Label className="text-xs">Payment Method</Label>
                        <Select value={preOrderForm.down_payment_method} onValueChange={(value) => setPreOrderForm(prev => ({ ...prev, down_payment_method: value }))}>
                          <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            {paymentTypes.map(pt => (<SelectItem key={pt.id} value={pt.name}>{pt.name}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Expected Delivery</Label>
                      <Input id="expected_delivery_date" type="date" value={preOrderForm.expected_delivery_date} onChange={handlePreOrderFormChange} className="h-7 text-xs" />
                    </div>
                    <div>
                      <Label className="text-xs">Notes</Label>
                      <textarea id="notes" value={preOrderForm.notes} onChange={handlePreOrderFormChange} className="w-full text-xs p-2 border rounded-md resize-none bg-background" rows={2} placeholder="Optional notes..." />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-background border-t p-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              {isBulkMode && bulkSizes.length > 0 && (
                <span>{totalBulkQuantity} pair{totalBulkQuantity !== 1 ? 's' : ''} across {bulkSizes.length} size{bulkSizes.length !== 1 ? 's' : ''}</span>
              )}
              {!isBulkMode && newVariant.size && (
                <span>Size {newVariant.size} / Qty {newVariant.quantity}</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="h-9 px-4 text-xs">
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !canSubmit}
                className="h-9 px-6 text-xs"
              >
                {isSubmitting ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Saving...</>
                ) : (
                  <><Plus className="h-3.5 w-3.5 mr-1.5" /> Add to Inventory</>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
