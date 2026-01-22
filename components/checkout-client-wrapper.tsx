"use client"

import { useState } from "react"
import { Select, SelectItem, SelectContent, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import React from "react"
import { useMemo, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Search, Plus, X, DollarSign, Loader2, CheckCircle, User, MapPin } from "lucide-react"
import Image from "next/image"
import { CheckoutCart } from "@/components/checkout-cart"
import { CustomerSelection } from "@/components/customer-selection"
import { processConsignmentSalesForCheckout, calculateSaleSplit } from "@/lib/utils/consignment"
import { useEffect } from "react"
import { ProfitDistributionCalculator } from "@/components/profit-distribution-calculator"

import { toast } from "@/hooks/use-toast"
import Link from "next/link"
import { Avatar, ProfitDistributionTemplateDetail } from "@/lib/types"
import { ConfirmationModal } from "@/components/confirmation-modal"
import { SaleSuccessModal } from "@/components/sale-success-modal"
import { ReceiptGenerator } from "@/components/receipt-generator"
import { ShippingLabelGenerator } from "@/components/shipping-label-generator"
import { useRouter } from "next/navigation"
import { useCurrency } from "@/context/CurrencyContext"
import { formatCurrency } from "@/lib/utils/currency"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"

interface TransformedVariant {
  id: string
  variantSku: string
  size: string
  sizeLabel: string
  location: string | null
  status: string
  serialNumber: string | null
  costPrice: number
  productName: string
  productBrand: string
  productSku: string
  productImage: string | null
  productOriginalPrice: number
  productSalePrice: number
  productCategory: string | null
  productSizeCategory: string
  ownerType?: 'store' | 'consignor'
  consignorId?: string
  consignorName?: string
  consignorCommissionRate?: number
  // Variant-level payout settings (set when adding product)
  variantPayoutMethod?: 'cost_price' | 'cost_plus_fixed' | 'cost_plus_percentage' | 'percentage_split'
  variantFixedMarkup?: number
  variantMarkupPercentage?: number
  // Consignor default payout settings (fallback)
  consignorPayoutMethod?: 'cost_price' | 'cost_plus_fixed' | 'cost_plus_percentage' | 'percentage_split'
  consignorFixedMarkup?: number
  consignorMarkupPercentage?: number
  isPreorder?: boolean
  preorderData?: Preorder
}

interface Preorder {
  id: number;
  pre_order_no: number;
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
  customer: {
    customer_type: string
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

interface CheckoutClientWrapperProps {
  initialVariants: TransformedVariant[]
  initialPreorders: Preorder[]
  initialAvatars: Avatar[]
  initialProfitTemplates: ProfitDistributionTemplateDetail[] // Use imported type
}

export function CheckoutClientWrapper({
  // THIS IS THE CORRECT NAMED EXPORT
  initialVariants,
  initialPreorders,
  initialAvatars,
  initialProfitTemplates,
}: CheckoutClientWrapperProps) {
  // Pagination for variants
  const [variantPage, setVariantPage] = useState(1);
  const variantsPerPage = 12;
  const [allVariants, setAllVariants] = useState<TransformedVariant[]>(initialVariants)
  const [allPreorders, setAllPreorders] = useState(initialPreorders)
  const [searchTerm, setSearchTerm] = useState("")
  const [brandFilter, setBrandFilter] = useState<string>("all")
  const [sizeCategoryFilter, setSizeCategoryFilter] = useState<string>("all")
  const [locationFilter, setLocationFilter] = useState<string>("all")
  const [sizeFilter, setSizeFilter] = useState<string[]>([]) // array of selected sizes
  const [sizeSearch, setSizeSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all") // Add type filter state
  const [selectedVariants, setSelectedVariants] = useState<TransformedVariant[]>([])
  const [selectedPreorders, setSelectedPreorders] = useState<Preorder[]>([])
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("fixed")
  const [discountValue, setDiscountValue] = useState<number>(0)
  const [customerName, setCustomerName] = useState<string>("")
  const [customerPhone, setCustomerPhone] = useState<string>("")

  const [customerType, setCustomerType] = useState<string>("regular")
  const [customerDataForSaving, setCustomerDataForSaving] = useState<{ name: string; phone: string; customer_type: string } | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: number; name: string; phone: string; customer_type: string } | null>(null)
  const [paymentReceived, setPaymentReceived] = useState<number>(0)
  const [additionalCharge, setAdditionalCharge] = useState<number>(0)
  const [commissionFrom, setCommissionFrom] = useState<'total' | 'profit'>('total')
  const [consignorCommissionType, setConsignorCommissionType] = useState<'percentage' | 'from_cost'>('percentage')
  const [customCommissionRates, setCustomCommissionRates] = useState<Record<string, number>>({}) // Override commission rates by consignor ID
  const [customStoreAmounts, setCustomStoreAmounts] = useState<Record<string, string>>({}) // Independent store amounts
  const [customConsignorAmounts, setCustomConsignorAmounts] = useState<Record<string, string>>({}) // Independent consignor amounts
  
  // Per-variant payout settings for flexible consignment deals
  const [variantPayoutMethods, setVariantPayoutMethods] = useState<Record<string, 'cost_price' | 'cost_plus_fixed' | 'cost_plus_percentage' | 'percentage_split'>>({})
  const [variantFixedMarkups, setVariantFixedMarkups] = useState<Record<string, number>>({})
  const [variantMarkupPercentages, setVariantMarkupPercentages] = useState<Record<string, number>>({})
  
  const [avatars] = useState<Avatar[]>(initialAvatars) // Avatars are static after initial load
  const [profitTemplates] = useState<ProfitDistributionTemplateDetail[]>(initialProfitTemplates) // Use imported type
  const [isRecordingSale, startSaleTransition] = useTransition()
  const [isLoadingVariants, startLoadingVariantsTransition] = useTransition() // For re-fetching variants after sale
  const [showConfirmSaleModal, setShowConfirmSaleModal] = useState(false)
  const [isConfirmingSale, startConfirmSaleTransition] = useTransition() // For the confirmation modal's loading state
  const [showSaleSuccessModal, setShowSaleSuccessModal] = useState(false)
  const [completedSaleId, setCompletedSaleId] = useState<string | null>(null)
  const [isPrintingReceipt, setIsPrintingReceipt] = useState(false)
  const [isPrintingShippingLabel, setIsPrintingShippingLabel] = useState(false)
  const [pendingProfitDistribution, setPendingProfitDistribution] = useState<
    { avatarId: string; percentage: number; amount: number }[]
  >([])
  
  // Shipping-related state
  const [shippingMode, setShippingMode] = useState(false)
  const [shippingDetails, setShippingDetails] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'Philippines',
    downPaymentAmount: 0,
    shippingNotes: ''
  })
  const [showShippingForm, setShowShippingForm] = useState(false)
  const [localShippingDetails, setLocalShippingDetails] = useState(shippingDetails)
  
  const router = useRouter()

  const { currency } = useCurrency(); // Get the user's selected currency

  // Auto-fill shipping details when customer is selected or manual info changes
  useEffect(() => {
    if (selectedCustomer) {
      // Pre-fill from selected customer
      setShippingDetails(prev => ({
        ...prev,
        customerName: selectedCustomer.name || '',
        customerPhone: selectedCustomer.phone || '',
        customerEmail: (selectedCustomer as any).email || '',
        address: (selectedCustomer as any).address || '',
        city: (selectedCustomer as any).city || '',
        state: (selectedCustomer as any).state || '',
        zipCode: (selectedCustomer as any).zip_code || '',
        country: (selectedCustomer as any).country || 'Philippines'
      }))
    } else if (customerName || customerPhone) {
      // Pre-fill from manual customer entry
      setShippingDetails(prev => ({
        ...prev,
        customerName: customerName || '',
        customerPhone: customerPhone || ''
      }))
    }
  }, [selectedCustomer, customerName, customerPhone])

  const availableVariants = useMemo(() => {
    const selectedIds = new Set(selectedVariants.map((v) => v.id))
    const selectedPreorderIds = new Set(selectedPreorders.map((p) => p.id))
    
    // Convert pre-orders to pseudo-variants
    const preorderAsVariants: TransformedVariant[] = allPreorders
      .filter(preorder => !selectedPreorderIds.has(preorder.id))
      .map(preorder => ({
        id: `preorder-${preorder.id}`,
        variantSku: `PO-${preorder.pre_order_no}`,
        size: preorder.size || '',
        sizeLabel: preorder.size_label || 'US',
        location: null,
        status: 'preorder',
        serialNumber: `PO${preorder.pre_order_no}`,
        costPrice: preorder.cost_price,
        productName: preorder.product.name,
        productBrand: preorder.product.brand,
        productSku: preorder.product.sku,
        productImage: preorder.product.image,
        productOriginalPrice: preorder.total_amount,
        productSalePrice: preorder.total_amount, // Use total_amount instead of remaining_balance
        productCategory: null,
        productSizeCategory: 'US', // Default for pre-orders
        ownerType: 'store' as const,
        variantPayoutMethod: 'percentage_split',
        isPreorder: true,
        preorderData: preorder
      }))
    
    // Combine regular variants with pre-order pseudo-variants
    return [
      ...allVariants.filter((variant) => !selectedIds.has(variant.id)),
      ...preorderAsVariants
    ]
  }, [allVariants, selectedVariants, allPreorders, selectedPreorders])

  // Get unique filter options
  const brandOptions = useMemo(() => {
    const brands = new Set(availableVariants.map(v => v.productBrand).filter(Boolean))
    return ["all", ...Array.from(brands)]
  }, [availableVariants])

  const sizeCategoryOptions = useMemo(() => {
    const categories = new Set(availableVariants.map(v => v.productSizeCategory).filter(Boolean))
    return ["all", ...Array.from(categories)]
  }, [availableVariants])

  const locationOptions = useMemo(() => {
    const locations = new Set(availableVariants.map(v => v.location).filter((loc): loc is string => Boolean(loc)))
    return ["all", ...Array.from(locations)]
  }, [availableVariants])

  const sizeOptionsByCategory = useMemo(() => {
    const map: Record<string, Set<string>> = {}
    availableVariants.forEach(variant => {
      if (!variant.productSizeCategory || !variant.size) return
      if (!map[variant.productSizeCategory]) map[variant.productSizeCategory] = new Set()
      map[variant.productSizeCategory].add(String(variant.size))
    })
    // Convert sets to sorted arrays
    const result: Record<string, string[]> = {}
    Object.entries(map).forEach(([cat, sizes]) => {
      result[cat] = Array.from(sizes).sort((a, b) => {
        const na = Number(a), nb = Number(b)
        if (!isNaN(na) && !isNaN(nb)) return na - nb
        return String(a).localeCompare(String(b))
      })
    })
    return result
  }, [availableVariants])

  const filteredVariants = useMemo(() => {
    let filtered = availableVariants

    // Apply search filter
    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase()
      filtered = filtered.filter((variant) => {
        const searchableFields = [
          variant.productName,
          variant.productBrand,
          variant.productSku,
          variant.serialNumber?.toString(),
          variant.variantSku,
          variant.size?.toString(),
        ].map((field) => (field || "").toLowerCase())
        return searchableFields.some((field) => field.includes(lowerCaseSearchTerm))
      })
    }

    // Apply brand filter
    if (brandFilter !== "all") {
      filtered = filtered.filter(variant => variant.productBrand === brandFilter)
    }

    // Apply size category filter
    if (sizeCategoryFilter !== "all") {
      filtered = filtered.filter(variant => variant.productSizeCategory === sizeCategoryFilter)
    }

    // Apply location filter
    if (locationFilter !== "all") {
      filtered = filtered.filter(variant => variant.location === locationFilter)
    }

    // Apply size filter
    if (sizeFilter.length > 0) {
      filtered = filtered.filter(variant => sizeFilter.includes(String(variant.size)))
    }

    // Apply type filter
    if (typeFilter !== "all") {
      if (typeFilter === "preorder") {
        filtered = filtered.filter(variant => variant.isPreorder === true)
      } else if (typeFilter === "instock") {
        filtered = filtered.filter(variant => variant.isPreorder !== true)
      }
    }

    return filtered
  }, [searchTerm, availableVariants, brandFilter, sizeCategoryFilter, locationFilter, sizeFilter, typeFilter])

  // Pagination logic for variants
  const totalVariantPages = filteredVariants.length > 12 ? Math.ceil(filteredVariants.length / variantsPerPage) : 1
  const paginatedVariants = filteredVariants.length > 12
    ? filteredVariants.slice((variantPage - 1) * variantsPerPage, variantPage * variantsPerPage)
    : filteredVariants

  const handleAddVariantToCart = (variant: TransformedVariant) => {
    if (variant.isPreorder && variant.preorderData) {
      // Handle pre-order selection
      setSelectedPreorders((prev) => [...prev, variant.preorderData!])
      setSearchTerm("") // Clear search after adding
      
      // Auto-populate customer info from pre-order if cart is empty
      if (selectedVariants.length === 0 && selectedPreorders.length === 0) {
        setCustomerName(variant.preorderData.customer.name)
        setCustomerPhone(variant.preorderData.customer.phone || "")
        setCustomerType(variant.preorderData.customer.customer_type || "regular")
      }
      
      console.log('🛒 Adding pre-order to cart:', variant.productName, variant.size);
      
      // Show success toast
      toast({
        title: "Pre-order Added to Cart",
        description: `Pre-order #${variant.preorderData.pre_order_no} - ${variant.productName} (Size ${variant.size}) added to cart.`,
        duration: 3000, // 3 seconds
      })
    } else {
      // Handle regular variant selection
      setSelectedVariants((prev) => [...prev, variant])
      setSearchTerm("") // Clear search after adding
      
      console.log('🛒 Adding variant to cart:', variant.productName, variant.size);
      
      // Show success toast
      toast({
        title: "Item Added to Cart",
        description: `${variant.productName} (Size ${variant.size}) added to cart.`,
        duration: 3000, // 3 seconds
      })
    }
    
    console.log('📱 Toast called for add to cart');
  }

  const handleRemoveVariantFromCart = (variantId: string) => {
    // Find the variant being removed for toast message
    const removedVariant = selectedVariants.find(v => v.id === variantId)
    
    setSelectedVariants((prev) => prev.filter((v) => v.id !== variantId))
    
    // Show removal toast
    if (removedVariant) {
      toast({
        title: "Item Removed from Cart",
        description: `${removedVariant.productName} (Size ${removedVariant.size}) removed from cart.`,
        variant: "destructive",
        duration: 3000, // 3 seconds
      })
    }
  }

  const handleAddVariantsToCart = (variants: TransformedVariant[]) => {
    // Filter out duplicates that are already in cart
    const newVariants = variants.filter(variant => 
      !selectedVariants.some(selected => selected.id === variant.id)
    );
    
    if (newVariants.length > 0) {
      setSelectedVariants(prev => [...prev, ...newVariants]);
      
      // Show success toast
      toast({
        title: "QR Items Added to Cart",
        description: `${newVariants.length} item${newVariants.length > 1 ? 's' : ''} added to cart from QR scan.`,
        duration: 3000,
      });
    }
  }



  // Payment type state (API-driven)
  const [paymentTypes, setPaymentTypes] = useState<any[]>([]);
  const [selectedPaymentType, setSelectedPaymentType] = useState<string>("");
  const [newPaymentName, setNewPaymentName] = useState("");
  const [newFeeType, setNewFeeType] = useState("percent");
  const [newFeeValue, setNewFeeValue] = useState(0);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [editPaymentName, setEditPaymentName] = useState("");
  const [editFeeType, setEditFeeType] = useState("percent");
  const [editFeeValue, setEditFeeValue] = useState(0);
  const [loadingPayments, setLoadingPayments] = useState(false);
        // For delete confirmation modal
        const [deleteModalId, setDeleteModalId] = useState<string | null>(null);

  // Find selected payment type object
  const selectedPayment = paymentTypes.find(pt => pt.id === selectedPaymentType) || {
    id: '',
    name: 'No Payment Type',
    feeType: 'none',
    feeValue: 0
  };

  // Fetch payment types from API
  useEffect(() => {
    const fetchPayments = async () => {
      setLoadingPayments(true);
      try {
        const res = await fetch("/api/payment-types");
        const result = await res.json();
        if (result.data && result.data.length > 0) {
          // Only use payment types from the database
          const dbPaymentTypes = result.data.map((pt: any) => ({
            id: pt.id,
            name: pt.name,
            feeType: pt.fee_type,
            feeValue: pt.fee_value
          }));
          
          setPaymentTypes(dbPaymentTypes);
          
          // Set the first payment type as selected by default
          if (dbPaymentTypes.length > 0) {
            setSelectedPaymentType(dbPaymentTypes[0].id);
          }
        } else {
          // If no payment types exist in database, set empty array
          setPaymentTypes([]);
          setSelectedPaymentType("");
        }
      } catch (e) {
        console.error("Error fetching payment types:", e);
        // On error, set empty array instead of fallback to Cash
        setPaymentTypes([]);
        setSelectedPaymentType("");
      } finally {
        setLoadingPayments(false);
      }
    };
    fetchPayments();
  }, []);

  // Auto-disable shipping mode when pre-orders are in cart
  useEffect(() => {
    if (selectedPreorders.length > 0 && shippingMode) {
      setShippingMode(false);
    }
  }, [selectedPreorders.length, shippingMode]);

  // Sync local shipping details when form opens
  useEffect(() => {
    if (showShippingForm) {
      setLocalShippingDetails(shippingDetails);
    }
  }, [showShippingForm, shippingDetails]);

  // Add new payment type via API
  const handleAddPaymentType = async () => {
    if (!newPaymentName.trim()) return;
    const body = { name: newPaymentName.trim(), fee_type: newFeeType, fee_value: Number(newFeeValue) };
    const res = await fetch("/api/payment-types", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await res.json();
    if (result.data) {
      setPaymentTypes(prev => [...prev, { id: result.data.id, name: result.data.name, feeType: result.data.fee_type, feeValue: result.data.fee_value }]);
      setSelectedPaymentType(result.data.id);
      setNewPaymentName("");
      setNewFeeType("percent");
      setNewFeeValue(0);
    } else {
      toast({ title: "Error", description: result.error || "Failed to add payment type.", variant: "destructive" });
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
      toast({
        title: "Success",
        description: "Payment type updated successfully.",
      });
    } else {
      toast({ title: "Error", description: result.error || "Failed to update payment type.", variant: "destructive" });
    }
  };

  // Delete payment type via API
  const handleDeletePaymentType = async (id: string) => {
    const res = await fetch("/api/payment-types", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    const result = await res.json();
    if (result.success) {
      const remainingTypes = paymentTypes.filter(pt => pt.id !== id);
      setPaymentTypes(remainingTypes);
      
      // If we deleted the selected payment type, select the first remaining one
      if (selectedPaymentType === id) {
        if (remainingTypes.length > 0) {
          setSelectedPaymentType(remainingTypes[0].id);
        } else {
          setSelectedPaymentType("");
        }
      }
      
      toast({
        title: "Success",
        description: "Payment type deleted successfully.",
      });
    } else {
      toast({ 
        title: "Error", 
        description: result.error || "Failed to delete payment type.", 
        variant: "destructive" 
      });
    }
    setDeleteModalId(null); // Close the modal
  };

  const subtotal = useMemo(() => {
    const variantsTotal = selectedVariants.reduce((sum, variant) => sum + variant.productSalePrice, 0);
    const preordersTotal = selectedPreorders.reduce((sum, preorder) => sum + preorder.total_amount, 0); // Use total_amount instead of remaining_balance
    return variantsTotal + preordersTotal;
  }, [selectedVariants, selectedPreorders])

  // Payment fee calculation (always added to customer total)
  let paymentFee = 0;
  if (selectedPayment.feeType === "percent") {
    paymentFee = subtotal * (selectedPayment.feeValue / 100);
  } else if (selectedPayment.feeType === "fixed") {
    paymentFee = selectedPayment.feeValue;
  }

  const calculatedDiscount = useMemo(() => {
    if (discountType === "percentage") {
      return Math.min(subtotal * (discountValue / 100), subtotal) // Cap discount at subtotal
    } else {
      return Math.min(discountValue, subtotal) // Cap discount at subtotal
    }
  }, [subtotal, discountType, discountValue])


  // Total amount due from customer: subtotal minus discount plus additional charge plus payment fee
  const totalAmount = useMemo(() => {
    let total = subtotal - calculatedDiscount + additionalCharge + paymentFee;
    return total;
  }, [subtotal, calculatedDiscount, additionalCharge, paymentFee]);

  // Calculate change amount
  const changeAmount = useMemo(() => {
    return Math.max(0, paymentReceived - totalAmount);
  }, [paymentReceived, totalAmount]);

  // Cost calculation (payment fee no longer affects cost)
  const totalCost = useMemo(() => {
    let baseCost = selectedVariants.reduce((sum, variant) => sum + variant.costPrice, 0); // Use costPrice instead of productOriginalPrice
    const preordersCost = selectedPreorders.reduce((sum, preorder) => sum + preorder.cost_price, 0); // Add preorders cost
    baseCost += preordersCost;
    return baseCost;
  }, [selectedVariants, selectedPreorders]);

  // Calculate true store profit (only commission from consigned items + full profit from store items)
  const storeProfit = useMemo(() => {
    let totalStoreProfit = 0;
    
    selectedVariants.forEach(v => {
      const salePrice = v.productSalePrice;
      const costPrice = v.costPrice;
      
      if (v.ownerType === 'consignor') {
        // For consigned items: calculate using per-variant payout methods
        const variant = {
          id: v.id,
          cost_price: v.costPrice,
          costPrice: v.costPrice,
          owner_type: 'consignor' as const,
          date_added: '',
          variant_sku: v.variantSku,
          serial_number: v.serialNumber || '',
          serialNumber: v.serialNumber || '',
          product_id: 0,
          productName: v.productName,
          productBrand: v.productBrand,
          size: v.size,
          color: '',
          quantity: 1,
          location: v.location || '',
          status: v.status,
          qr_code_url: null,
          created_at: '',
          updated_at: '',
          consignor_id: v.consignorId ? parseInt(v.consignorId) : undefined,
          user_id: '',
          isArchived: false,
          size_label: v.sizeLabel
        };
        
        const consignorData = {
          payout_method: variantPayoutMethods[v.id] || v.variantPayoutMethod || v.consignorPayoutMethod || 'percentage_split',
          fixed_markup: variantFixedMarkups[v.id] !== undefined ? variantFixedMarkups[v.id] : (v.variantFixedMarkup ?? v.consignorFixedMarkup),
          markup_percentage: variantMarkupPercentages[v.id] !== undefined ? variantMarkupPercentages[v.id] : (v.variantMarkupPercentage ?? v.consignorMarkupPercentage)
        };
        
        const split = calculateSaleSplit(
          variant,
          salePrice,
          v.consignorId && customCommissionRates[v.consignorId] 
            ? customCommissionRates[v.consignorId] 
            : v.consignorCommissionRate,
          commissionFrom,
          consignorData
        );
        
        totalStoreProfit += split.store_gets;
      } else {
        // For store items: full profit (sale price - cost price)
        totalStoreProfit += (salePrice - costPrice);
      }
    });
    
    // Add pre-orders profit (total_amount - cost_price for each pre-order)
    selectedPreorders.forEach(preorder => {
      const preorderProfit = preorder.total_amount - preorder.cost_price;
      totalStoreProfit += preorderProfit;
    });
    
    // Subtract discount from store profit (payment fee no longer affects profit)
    totalStoreProfit -= calculatedDiscount;
    
    return totalStoreProfit;
  }, [selectedVariants, selectedPreorders, calculatedDiscount, customCommissionRates, customStoreAmounts]);

  // Calculate total consignor payouts for display
  const totalConsignorPayout = useMemo(() => {
    return selectedVariants
      .filter(v => v.ownerType === 'consignor')
      .reduce((sum, v) => {
        const salePrice = v.productSalePrice;
        const variant = {
          id: v.id,
          cost_price: v.costPrice,
          costPrice: v.costPrice, // Add camelCase version
          owner_type: 'consignor' as const,
          // Add minimal required fields to satisfy Variant type
          date_added: '',
          variant_sku: v.variantSku,
          serial_number: v.serialNumber || '',
          serialNumber: v.serialNumber || '', // Add camelCase version
          product_id: 0,
          productName: v.productName, // Add required field
          productBrand: v.productBrand, // Add required field
          size: v.size,
          color: '',
          quantity: 1,
          location: v.location || '',
          status: v.status,
          qr_code_url: null,
          created_at: '',
          updated_at: '',
          consignor_id: v.consignorId ? parseInt(v.consignorId) : undefined,
          user_id: '',
          isArchived: false,
          size_label: v.sizeLabel
        };
        
        // Priority: checkout override > variant-level (from add product) > consignor default
        const consignorData = {
          payout_method: variantPayoutMethods[v.id] || v.variantPayoutMethod || v.consignorPayoutMethod || 'percentage_split',
          fixed_markup: variantFixedMarkups[v.id] !== undefined ? variantFixedMarkups[v.id] : (v.variantFixedMarkup ?? v.consignorFixedMarkup),
          markup_percentage: variantMarkupPercentages[v.id] !== undefined ? variantMarkupPercentages[v.id] : (v.variantMarkupPercentage ?? v.consignorMarkupPercentage)
        };
        
        const split = calculateSaleSplit(
          variant,
          salePrice,
          // Use custom commission rate if set, otherwise use default
          v.consignorId && customCommissionRates[v.consignorId] 
            ? customCommissionRates[v.consignorId] 
            : v.consignorCommissionRate,
          commissionFrom,
          consignorData
        );
        
        return sum + split.consignor_gets;
      }, 0);
  }, [selectedVariants, commissionFrom, customCommissionRates, variantPayoutMethods, variantFixedMarkups, variantMarkupPercentages]);

  // Keep netProfit for backwards compatibility but use storeProfit
  const netProfit = storeProfit;

  const handleConfirmSale = async (profitDistribution: { avatarId: string; percentage: number; amount: number }[]) => {
    startConfirmSaleTransition(async () => {
      const saleDate = new Date().toISOString().split("T")[0] // Current date in YYYY-MM-DD format

      // Handle pre-orders: convert them to variants first and collect customer info
      const preorderVariantItems: any[] = [];
      let preorderCustomerInfo: { name: string; phone: string | null } | null = null;
      
      for (const preorder of selectedPreorders) {
        try {
          // Create variant for the pre-order
          const { createClient } = await import("@/lib/supabase/client")
          const supabase = createClient()
          const { data: { session } } = await supabase.auth.getSession()
          
          const response = await fetch("/api/create-variant-from-preorder", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session?.access_token || ""}`,
            },
            body: JSON.stringify({
              preorderId: preorder.id,
              status: 'Sold' // Mark as Sold immediately since it's being converted
            }),
          });
          
          const result = await response.json();
          if (result.success) {
            preorderVariantItems.push({
              variantId: result.variantId,
              soldPrice: preorder.total_amount, // Use total_amount as the sale price
              costPrice: preorder.cost_price,
              quantity: 1,
            });

            // Store customer info from first pre-order for the sale
            if (!preorderCustomerInfo && result.preorderInfo) {
              preorderCustomerInfo = {
                name: result.preorderInfo.customerName,
                phone: result.preorderInfo.customerPhone
              };
            }
          } else {
            throw new Error(`Failed to create variant for pre-order ${preorder.id}: ${result.error}`);
          }
        } catch (error) {
          console.error(`Error creating variant for pre-order ${preorder.id}:`, error);
          toast({
            title: "Error Processing Pre-order",
            description: `Failed to process pre-order for ${preorder.product.name}`,
            variant: "destructive",
          });
          return; // Stop processing if pre-order conversion fails
        }
      }

      const items = [
        ...selectedVariants.map((variant) => ({
          variantId: variant.id,
          soldPrice: variant.productSalePrice, // Assuming sale price is the sold price
          costPrice: variant.costPrice,
          quantity: 1,
        })),
        ...preorderVariantItems
      ];

      // --- ADDED CONSOLE LOG HERE ---
      console.log("Items being sent to recordSale:", items)
      // --- END CONSOLE LOG ---

      // Use pre-order customer info if available, otherwise use selected customer or manual input
      // In shipping mode, prioritize shipping details for customer info
      const finalCustomerName = shippingMode 
        ? shippingDetails.customerName 
        : (preorderCustomerInfo?.name || selectedCustomer?.name || customerName);
      const finalCustomerPhone = shippingMode 
        ? shippingDetails.customerPhone 
        : (preorderCustomerInfo?.phone || selectedCustomer?.phone || customerPhone || null);
      let finalCustomerId = selectedCustomer?.id || null;

      // If we don't have a selected customer but we have customer data (manual entry or shipping details),
      // create the customer first so we can link the sale to that customer.
      const needsCustomerCreation = !finalCustomerId && (customerDataForSaving || (shippingMode && shippingDetails.customerName.trim()));
      
      if (needsCustomerCreation) {
        try {
          // Prepare customer data for creation
          const customerData = customerDataForSaving || {
            name: shippingDetails.customerName,
            phone: shippingDetails.customerPhone || null,
            email: shippingDetails.customerEmail || null,
            address: shippingDetails.address || null,
            city: shippingDetails.city || null,
            state: shippingDetails.state || null,
            zip_code: shippingDetails.zipCode || null,
            country: shippingDetails.country || 'Philippines',
            customer_type: 'regular'
          };

          console.log('Creating customer before recording sale:', customerData);
          const { createClient } = await import("@/lib/supabase/client");
          const supabase = createClient();
          const { data: { session } } = await supabase.auth.getSession();

          const createRes = await fetch('/api/customers/list', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session?.access_token || ""}`,
            },
            body: JSON.stringify(customerData),
          });

          if (createRes.ok) {
            const created = await createRes.json();
            // support different response shapes
            finalCustomerId = created?.data?.id ?? created?.id ?? null;
            console.log('Created customer before sale:', created);
            // clear prepared data
            setCustomerDataForSaving(null);
            // update local fields
            if (created?.data) {
              if (!shippingMode) {
                // Only update manual fields if not in shipping mode
                setCustomerName(created.data.name || finalCustomerName || "");
                setCustomerPhone(created.data.phone || finalCustomerPhone || "");
                setCustomerType(created.data.customer_type || "regular");
              }
            }
          } else {
            const txt = await createRes.text();
            console.error('Failed to create customer before sale:', txt);
          }
        } catch (err) {
          console.error('Error creating customer before sale:', err);
        }
      }

      // Compose payment type JSON for new sales.payment_type jsonb column
      const paymentTypeJson = {
        id: selectedPaymentType,
        name: selectedPayment.name,
        feeType: selectedPayment.feeType,
        feeValue: selectedPayment.feeValue,
        feeAmount: paymentFee
      };

      const payload = {
        saleDate,
        totalAmount,
        totalDiscount: calculatedDiscount,
        netProfit,
        items,
        profitDistribution,
        customerName: finalCustomerName, // Use pre-order customer name if available
        customerPhone: finalCustomerPhone, // Use pre-order customer phone if available
        customerId: finalCustomerId, // now created (if needed) before sale
        paymentType: paymentTypeJson, // Save as JSONB
        paymentReceived: shippingMode ? shippingDetails.downPaymentAmount : paymentReceived,
        changeAmount: shippingMode ? 0 : changeAmount,
        additionalCharge,
        // Shipping-related fields
        ...(shippingMode && {
          status: 'pending',
          shippingAddress: shippingDetails.address,
          shippingCity: shippingDetails.city,
          shippingState: shippingDetails.state,
          shippingZip: shippingDetails.zipCode,
          shippingCountry: shippingDetails.country,
          shippingNotes: shippingDetails.shippingNotes,
          downPayment: shippingDetails.downPaymentAmount,
          remainingBalance: totalAmount - shippingDetails.downPaymentAmount
        })
      }

      try {
        const { createClient } = await import("@/lib/supabase/client")
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        const response = await fetch("/api/record-sale", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token || ""}`,
          },
          body: JSON.stringify(payload),
        })
        const result = await response.json()
        if (result.success) {
          // Process consignment sales if any variants are consigned
          const consignmentVariants = selectedVariants.filter(v => v.ownerType === 'consignor')
          if (consignmentVariants.length > 0) {
            try {
              await processConsignmentSalesForCheckout(
                result.saleId,
                consignmentVariants.map(v => {
                  const consignorId = v.consignorId;
                  
                  // Use custom amounts if they exist, otherwise calculate from commission rate
                  const hasCustomAmounts = consignorId && 
                    customStoreAmounts[consignorId] !== undefined && 
                    customConsignorAmounts[consignorId] !== undefined;
                  
                  const customStoreAmount = hasCustomAmounts ? 
                    parseFloat(customStoreAmounts[consignorId]) || 0 : undefined;
                  const customConsignorAmount = hasCustomAmounts ? 
                    parseFloat(customConsignorAmounts[consignorId]) || 0 : undefined;
                  
                  return {
                    variant: {
                      id: v.id,
                      owner_type: 'consignor',
                      consignor_id: v.consignorId ? parseInt(v.consignorId) : undefined,
                      cost_price: v.costPrice
                    } as any,
                    salePrice: v.productSalePrice,
                    customStoreAmount, // Pass custom amounts
                    customConsignorAmount, // Pass custom amounts
                    consignor: v.consignorId && v.consignorCommissionRate ? {
                      id: parseInt(v.consignorId),
                      commission_rate: v.consignorCommissionRate,
                      payout_method: v.consignorPayoutMethod || 'percentage_split',
                      fixed_markup: v.consignorFixedMarkup,
                      markup_percentage: v.consignorMarkupPercentage
                    } : undefined
                  }
                }).filter(v => v.consignor),
                commissionFrom // Pass the commission type
              )
            } catch (consignmentError) {
              console.error('Error processing consignment sales:', consignmentError)
              toast({
                title: "Warning: Consignment Processing Failed",
                description: "Main sale recorded but consignment splits may need manual processing.",
                variant: "destructive",
              })
            }
          }

          // Save customer data if it was entered manually and not already saved
          console.log('Customer saving check:', {
            customerDataForSaving,
            selectedCustomer,
            shouldSave: customerDataForSaving && !selectedCustomer
          });
          
          if (customerDataForSaving && !selectedCustomer) {
            console.log('Attempting to save customer:', customerDataForSaving);
            try {
              const customerResponse = await fetch('/api/customers/list', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${session?.access_token || ""}`,
                },
                body: JSON.stringify(customerDataForSaving),
              });

              if (customerResponse.ok) {
                const newCustomer = await customerResponse.json();
                console.log('Customer saved successfully:', newCustomer);
                // Clear the customer data for saving since it's been saved
                setCustomerDataForSaving(null);
              } else {
                const errorText = await customerResponse.text();
                console.error('Failed to save customer:', errorText);
              }
            } catch (customerError) {
              console.error('Error saving customer:', customerError);
              // Don't show error to user since sale was successful
            }
          }

          toast({
            title: shippingMode ? "Down Payment Recorded!" : "Sale Recorded Successfully!",
            description: shippingMode 
              ? `Down payment of ${formatCurrency(shippingDetails.downPaymentAmount, currency)} recorded. Sale is pending completion.`
              : `Sale of ${formatCurrency(totalAmount, currency)} completed.`,
          })
          setCompletedSaleId(result.saleId) // Store the sale ID
          setSelectedVariants([]) // Clear cart
          setSelectedPreorders([]) // Clear pre-orders
          setDiscountValue(0) // Reset discount
          setSearchTerm("") // Clear search
          setCustomerName("") // Reset customer name
          setCustomerPhone("") // Reset customer phone

          setCustomerType("regular") // Reset customer type
          setCustomerDataForSaving(null) // Clear customer data for saving
          setPaymentReceived(0) // Reset payment received
          setAdditionalCharge(0) // Reset additional charge
          
          // Reset shipping form
          if (shippingMode) {
            setShippingMode(false)
            setShippingDetails({
              customerName: '',
              customerPhone: '',
              customerEmail: '',
              address: '',
              city: '',
              state: '',
              zipCode: '',
              country: 'Philippines',
              downPaymentAmount: 0,
              shippingNotes: ''
            })
          }
          setShowConfirmSaleModal(false) // Close confirmation modal
          setShowSaleSuccessModal(true) // Show success modal

          // Re-fetch all variants to update available stock using the API
          startLoadingVariantsTransition(async () => {
            try {
              const { createClient } = await import("@/lib/supabase/client")
              const supabase = createClient()
              const { data: { session } } = await supabase.auth.getSession()
              
              // Refresh variants
              const variantsResponse = await fetch("/api/get-available-variants-client", {
                headers: {
                  Authorization: `Bearer ${session?.access_token || ''}`
                }
              })
              const variantsResult = await variantsResponse.json()
              if (variantsResult.success && variantsResult.data) {
                setAllVariants(variantsResult.data)
              } else {
                console.error("Failed to refresh variants after sale:", variantsResult.error)
              }

              // Refresh pre-orders
              const preordersResponse = await fetch("/api/get-available-preorders", {
                headers: {
                  Authorization: `Bearer ${session?.access_token || ''}`
                }
              })
              const preordersResult = await preordersResponse.json()
              if (preordersResult.success && preordersResult.data) {
                setAllPreorders(preordersResult.data)
              } else {
                console.error("Failed to refresh pre-orders after sale:", preordersResult.error)
              }
              
            } catch (refreshError) {
              console.error("Failed to refresh data after sale:", refreshError)
              toast({
                title: "Data Refresh Warning",
                description: "Failed to refresh available items. Please refresh the page manually.",
                variant: "destructive",
              })
            }
          })
        } else {
          toast({
            title: "Sale Failed",
            description: result.error || "An unknown error occurred while recording the sale.",
            variant: "destructive",
          })
          startConfirmSaleTransition(() => {}) // Reset loading state on failure
        }
      } catch (err) {
        toast({
          title: "Sale Failed",
          description: "An unknown error occurred while recording the sale.",
          variant: "destructive",
        })
        startConfirmSaleTransition(() => {}) // Reset loading state on failure
      }
    })
  }

  // Shipping validation function
  const getShippingValidationErrors = (): string[] => {
    const errors: string[] = [];
    
    if (!shippingMode) return errors; // No validation needed if shipping is disabled
    
    if (shippingDetails.downPaymentAmount <= 0) {
      errors.push("Down payment amount is required for shipping orders");
    }
    
    if (!shippingDetails.customerName.trim()) {
      errors.push("Customer name is required for shipping orders");
    }
    
    if (!shippingDetails.customerPhone.trim()) {
      errors.push("Customer phone is required for shipping orders");
    }
    
    if (!shippingDetails.address.trim()) {
      errors.push("Shipping address is required");
    }
    
    if (!shippingDetails.city.trim()) {
      errors.push("City is required for shipping orders");
    }
    
    if (!shippingDetails.country.trim()) {
      errors.push("Country is required for shipping orders");
    }
    
    if (shippingDetails.downPaymentAmount > totalAmount) {
      errors.push("Down payment cannot exceed the total amount");
    }
    
    return errors;
  };

  const isShippingValid = shippingMode ? getShippingValidationErrors().length === 0 : true;

  // Add this new function before the return statement
  const handleRecordSaleClick = (profitDistribution: { avatarId: string; percentage: number; amount: number }[]) => {
    const totalDistributedPercentage = profitDistribution.reduce((sum, item) => sum + item.percentage, 0)
    const currentDistribution = profitDistribution

    if (selectedVariants.length === 0 && selectedPreorders.length === 0) {
      toast({
        title: "No Items Selected",
        description: "Please add at least one shoe or pre-order to the cart to complete a sale.",
        variant: "destructive",
      })
      return
    }

    // Validate shipping mode requirements
    if (shippingMode) {
      if (shippingDetails.downPaymentAmount <= 0) {
        toast({
          title: "Down Payment Required",
          description: "Please enter a valid down payment amount for shipping orders.",
          variant: "destructive",
        })
        return
      }

      if (!shippingDetails.address.trim()) {
        toast({
          title: "Shipping Address Required",
          description: "Please enter a shipping address for shipping orders.",
          variant: "destructive",
        })
        return
      }

      if (!shippingDetails.customerName.trim()) {
        toast({
          title: "Customer Name Required",
          description: "Please enter a customer name for shipping orders.",
          variant: "destructive",
        })
        return
      }

      if (shippingDetails.downPaymentAmount > totalAmount) {
        toast({
          title: "Invalid Down Payment",
          description: "Down payment cannot exceed the total amount.",
          variant: "destructive",
        })
        return
      }
    }

    // Check if consignment splits are valid
    const consignedVariants = selectedVariants.filter(v => v.ownerType === 'consignor');
    if (consignedVariants.length > 0) {
      const consignorGroups = consignedVariants.reduce((groups, variant) => {
        const key = variant.consignorId || 'unknown';
        if (!groups[key]) {
          groups[key] = {
            name: variant.consignorName!,
            totalSale: 0,
            originalCommissionRate: variant.consignorCommissionRate || 20
          };
        }
        groups[key].totalSale += variant.productSalePrice;
        return groups;
      }, {} as Record<string, { name: string; totalSale: number; originalCommissionRate: number }>);

      // Check each consignor's split
      for (const [consignorId, group] of Object.entries(consignorGroups)) {
        const currentCommissionRate = customCommissionRates[consignorId] || group.originalCommissionRate;
        const storeCommission = group.totalSale * (currentCommissionRate / 100);
        const consignorPayout = group.totalSale - storeCommission;
        
        // Check if the split adds up correctly (with small tolerance for floating point)
        if (Math.abs((storeCommission + consignorPayout) - group.totalSale) > 0.01) {
          toast({
            title: "Invalid Consignment Split",
            description: `The split for ${group.name} doesn't add up to the total sale amount. Please adjust the amounts.`,
            variant: "destructive",
          })
          return
        }
      }
    }

    if (totalDistributedPercentage !== 100) {
      toast({
        title: "Distribution Mismatch",
        description: "Total profit distribution percentage must be exactly 100%.",
        variant: "destructive",
      })
      return
    }
    if (currentDistribution.some((item) => !item.avatarId)) {
      toast({
        title: "Missing Avatar",
        description: "Please select an avatar for all distribution entries.",
        variant: "destructive",
      })
      return
    }
    setPendingProfitDistribution(profitDistribution)
    setShowConfirmSaleModal(true)
  }

  // Ensure numeric values are defined before calling toFixed
  const safeToFixed = (value: number | undefined, decimals: number = 2) => {
    return value !== undefined ? value.toFixed(decimals) : "0.00"
  }

  // Remove setDeleteModalId, use handleDeletePaymentType directly

  return (
    <>
      <ConfirmationModal
        open={showConfirmSaleModal}
        onOpenChange={setShowConfirmSaleModal}
        title="Confirm Sale"
        description="Are you sure you want to complete this sale?"
        onConfirm={() => handleConfirmSale(pendingProfitDistribution)}
        isConfirming={isConfirmingSale}
      />

      <SaleSuccessModal
        open={showSaleSuccessModal}
        onOpenChange={setShowSaleSuccessModal}
        saleId={completedSaleId || undefined}
        isPrintingReceipt={isPrintingReceipt}
        hasShipping={shippingMode && Boolean(shippingDetails.address)}
        isPrintingShippingLabel={isPrintingShippingLabel}
        onPrintReceipt={() => {
          if (completedSaleId) {
            setIsPrintingReceipt(true)
          }
        }}
        onPrintShippingLabel={() => {
          if (completedSaleId) {
            setIsPrintingShippingLabel(true)
          }
        }}
      />

      {/* Receipt Generator (invisible, auto-generates PDF) */}
      {isPrintingReceipt && completedSaleId && (
        <ReceiptGenerator
          saleId={completedSaleId}
          onComplete={() => setIsPrintingReceipt(false)}
          onError={(error) => {
            setIsPrintingReceipt(false)
            console.error("Receipt generation error:", error)
          }}
        />
      )}

      {/* Shipping Label Generator (invisible, auto-generates PDF) */}
      {isPrintingShippingLabel && completedSaleId && (
        <ShippingLabelGenerator
          saleId={completedSaleId}
          onComplete={() => setIsPrintingShippingLabel(false)}
          onError={(error) => {
            setIsPrintingShippingLabel(false)
            console.error("Shipping label generation error:", error)
          }}
        />
      )}

      {/* Payment type delete confirmation modal */}
      <ConfirmationModal
        open={!!deleteModalId}
        onOpenChange={open => {
          if (!open) setDeleteModalId(null);
        }}
        title="Delete Payment Type"
        description="Are you sure you want to delete this payment type? This action cannot be undone."
        onConfirm={() => deleteModalId && handleDeletePaymentType(deleteModalId)}
        isConfirming={false}
      />
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">New Sale Checkout</h1>
          <Link href="/inventory">
            <Button variant="outline">Back to Inventory</Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Variant Selection */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" /> Add Items to Sale
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Input
                  placeholder="Search by product name, SKU, serial number, or size..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  disabled={isLoadingVariants}
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>

              {/* Filter Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                <Select value={brandFilter} onValueChange={setBrandFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Brands" />
                  </SelectTrigger>
                  <SelectContent>
                    {brandOptions.map(brand => (
                      <SelectItem key={brand} value={brand}>
                        {brand === "all" ? "All Brands" : brand}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={sizeCategoryFilter} onValueChange={setSizeCategoryFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    {sizeCategoryOptions.map(category => (
                      <SelectItem key={category} value={category}>
                        {category === "all" ? "All Categories" : category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Locations" />
                  </SelectTrigger>
                  <SelectContent>
                    {locationOptions.map(location => (
                      <SelectItem key={location} value={location}>
                        {location === "all" ? "All Locations" : location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="instock">In Stock</SelectItem>
                    <SelectItem value="preorder">Pre-order</SelectItem>
                  </SelectContent>
                </Select>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      <span className="truncate">
                        {sizeFilter.length === 0 ? "All Sizes" : sizeFilter.join(", ")}
                      </span>
                      <svg className="ml-2 h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="none">
                        <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[220px] max-h-72 overflow-y-auto p-0">
                    <div className="px-2 py-1">
                      <Input
                        placeholder="Search size..."
                        value={sizeSearch}
                        onChange={e => setSizeSearch(e.target.value)}
                        className="mb-2 text-xs"
                        autoFocus
                      />
                      <div className="mb-2">
                        <Checkbox
                          id="all-sizes-checkout"
                          checked={sizeFilter.length === 0}
                          onCheckedChange={checked => {
                            if (checked) setSizeFilter([])
                          }}
                        />
                        <label htmlFor="all-sizes-checkout" className="ml-2 text-xs cursor-pointer select-none">All Sizes</label>
                      </div>
                    </div>
                    {Object.entries(sizeOptionsByCategory).map(([cat, sizes]) => (
                      <React.Fragment key={cat}>
                        <div className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted/50 sticky top-0 z-10">{cat}</div>
                        {sizes.filter(size => sizeSearch === "" || String(size).toLowerCase().includes(sizeSearch.toLowerCase())).map(size => {
                          const checked = sizeFilter.includes(size)
                          return (
                            <div key={cat + "-" + size} className="flex items-center px-2 py-1 cursor-pointer hover:bg-muted/30 rounded">
                              <Checkbox
                                id={`size-checkout-${cat}-${size}`}
                                checked={checked}
                                onCheckedChange={checked => {
                                  if (checked) setSizeFilter(prev => [...prev, size])
                                  else setSizeFilter(prev => prev.filter(s => s !== size))
                                }}
                              />
                              <label htmlFor={`size-checkout-${cat}-${size}`} className="ml-2 text-xs cursor-pointer select-none">{size}</label>
                            </div>
                          )
                        })}
                      </React.Fragment>
                    ))}
                  </PopoverContent>
                </Popover>

                {/* Clear Filters Button */}
                {(brandFilter !== "all" || sizeCategoryFilter !== "all" || sizeFilter.length > 0 || searchTerm) && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setBrandFilter("all")
                      setSizeCategoryFilter("all") 
                      setSizeFilter([])
                      setSearchTerm("")
                    }}
                    className="text-xs"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear All
                  </Button>
                )}
              </div>

              {/* Results count */}
              <div className="text-sm text-gray-600">
                Showing {filteredVariants.length} of {availableVariants.length} available shoes
              </div>

              {isLoadingVariants ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
                  <p className="text-gray-600">Loading available shoes...</p>
                </div>
              ) : filteredVariants.length === 0 && searchTerm ? (
                <div className="text-center py-8 text-gray-500">
                  <X className="h-12 w-12 mx-auto mb-4" />
                  <p>No matching available shoes found.</p>
                </div>
              ) : filteredVariants.length === 0 && !searchTerm ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>All available shoes are in the cart or inventory is empty.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {paginatedVariants.map((variant) => (
                      <Card key={variant.id} className="flex flex-col">
                        <CardContent className="p-3 flex-grow">
                          <div className="relative">
                            <Image
                              src={variant.productImage || "/placeholder.svg?height=100&width=100"}
                              alt={variant.productName || "Placeholder image"}
                              width={80}
                              height={80}
                              className="rounded-md object-cover mx-auto mb-2"
                            />
                            {variant.isPreorder ? (
                              <div className="absolute top-1 right-1 bg-yellow-400 text-yellow-900 text-xs px-2 py-1 rounded-md shadow-sm font-medium">
                                PRE-ORDER
                              </div>
                            ) : variant.ownerType === 'consignor' && (
                              <div className="absolute top-1 right-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs px-2 py-1 rounded-md shadow-sm">
                                Consigned
                              </div>
                            )}
                          </div>
                          <h3 className="font-semibold text-sm line-clamp-2">{variant.productName}</h3>
                          <p className="text-xs text-gray-600">{variant.productBrand}</p>
                          <p className="text-xs font-mono text-gray-500">SKU: {variant.productSku}</p>
                          {variant.isPreorder && variant.preorderData ? (
                            <>
                              <p className="text-xs font-mono text-yellow-700">Pre Order: #{variant.preorderData.pre_order_no}</p>
                              <p className="text-xs text-blue-600">Customer: {variant.preorderData.customer.name}</p>
                              
                              {/* Cost and Pricing Information */}
                              <div className="mt-2 p-2 bg-gray-50 rounded-md border">
                                <div className="grid grid-cols-2 gap-1 text-xs">
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Cost:</span>
                                    <span className="font-medium">{formatCurrency(variant.preorderData.cost_price, currency)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Total:</span>
                                    <span className="font-medium">{formatCurrency(variant.preorderData.total_amount, currency)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Paid:</span>
                                    <span className="font-medium text-green-600">
                                      {formatCurrency(variant.preorderData.down_payment || 0, currency)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Balance:</span>
                                    <span className="font-medium text-orange-600">
                                      {formatCurrency(variant.preorderData.remaining_balance, currency)}
                                    </span>
                                  </div>
                                </div>
                                
                                {/* Profit Calculation */}
                                <div className="mt-2 pt-2 border-t border-gray-200">
                                  <div className="flex justify-between text-xs">
                                    <span className="text-gray-600">Profit:</span>
                                    <span className={`font-bold ${
                                      (variant.preorderData.total_amount - variant.preorderData.cost_price) >= 0 
                                        ? 'text-green-600' 
                                        : 'text-red-600'
                                    }`}>
                                      {formatCurrency(variant.preorderData.total_amount - variant.preorderData.cost_price, currency)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </>
                          ) : (
                            <p className="text-xs font-mono text-gray-500">Serial: {variant.serialNumber}</p>
                          )}
                          <p className="text-xs text-gray-500">
                            Size: {variant.size} ({variant.sizeLabel})
                          </p>
                          {!variant.isPreorder && (
                            <p className="text-xs text-gray-500">
                              Location: {variant.location || 'Not specified'}
                            </p>
                          )}
                          {variant.ownerType === 'consignor' && variant.consignorName && !variant.isPreorder && (
                            <p className="text-xs text-blue-600 font-medium mt-1">
                              Owner: {variant.consignorName}
                            </p>
                          )}
                          <p className="text-sm font-bold text-green-600 mt-2">{formatCurrency(variant.productSalePrice, currency)}</p>
                        </CardContent>
                        <div className="p-3 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => handleAddVariantToCart(variant)}
                          >
                            <Plus className="h-4 w-4 mr-1" /> 
                            {variant.isPreorder ? 'Add Pre-order' : 'Add to Cart'}
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                  {/* Pagination controls for variants */}
                  {filteredVariants.length > 12 && (
                    <div className="flex flex-wrap justify-center items-center gap-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setVariantPage((p) => Math.max(1, p - 1))}
                        disabled={variantPage === 1}
                        aria-label="Previous page"
                      >
                        Previous
                      </Button>
                      <span className="text-sm">
                        Page {variantPage} of {totalVariantPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setVariantPage((p) => Math.min(totalVariantPages, p + 1))}
                        disabled={variantPage === totalVariantPages}
                        aria-label="Next page"
                      >
                        Next
                      </Button>
                    </div>
                  )}
                  {/* Show total count and see more hint */}
                  {filteredVariants.length > 12 && (
                    <div className="text-center text-sm text-muted-foreground mt-2">
                      Showing {paginatedVariants.length} of {filteredVariants.length} available shoes
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Right Column: Cart, Summary, Profit Distribution */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" /> Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Show pre-order customer info if pre-orders are in cart */}
                {selectedPreorders.length > 0 && (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-medium text-blue-800 mb-2">Pre-order Customer(s):</h4>
                    <div className="space-y-2">
                      {selectedPreorders.map(preorder => (
                        <div key={preorder.id} className="text-sm">
                          <span className="font-medium">{preorder.customer.name}</span>
                          {preorder.customer.phone && (
                            <span className="text-gray-600 ml-2">• {preorder.customer.phone}</span>
                          )}
                          <span className="text-blue-600 ml-2">• Pre-order #{preorder.pre_order_no}</span>
                        </div>
                      ))}
                    </div>
                    {selectedVariants.length > 0 && (
                      <p className="text-xs text-blue-600 mt-2">
                        Additional customer info needed for regular items below ↓
                      </p>
                    )}
                  </div>
                )}

                {/* Customer selection for non-preorder items or when no preorders */}
                {(selectedVariants.length > 0 || selectedPreorders.length === 0) && (
                  <CustomerSelection
                    selectedCustomerId={selectedCustomer?.id}
                    onCustomerSelect={(customer) => {
                      setSelectedCustomer(customer);
                      if (customer) {
                        setCustomerName(customer.name);
                        setCustomerPhone(customer.phone);
                        setCustomerType(customer.customer_type);
                      }
                    }}
                    manualCustomerName={customerName}
                    manualCustomerPhone={customerPhone}
                    manualCustomerType={customerType}
                    onManualCustomerChange={(name, phone, type) => {
                      setCustomerName(name);
                      setCustomerPhone(phone);
                      setCustomerType(type || "regular");
                      setSelectedCustomer(null);
                    }}
                    onSaveCustomer={(customerData) => {
                      console.log('onSaveCustomer called with:', customerData);
                      setCustomerDataForSaving(customerData);
                    }}
                    showManualEntry={!selectedCustomer}
                  />
                )}

                {/* When only pre-orders are in cart */}
                {selectedPreorders.length > 0 && selectedVariants.length === 0 && (
                  <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                    <span className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Customer information is already available from pre-order(s).
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            <CheckoutCart 
              selectedVariants={selectedVariants} 
              selectedPreorders={selectedPreorders}
              onRemove={handleRemoveVariantFromCart} 
              onRemovePreorder={(preorderId) => {
                setSelectedPreorders(prev => prev.filter(p => p.id !== preorderId))
              }}
              onAddVariants={handleAddVariantsToCart}
              commissionFrom={commissionFrom}
              variantPayoutMethods={variantPayoutMethods}
              variantFixedMarkups={variantFixedMarkups}
              variantMarkupPercentages={variantMarkupPercentages}
              onPayoutMethodChange={(variantId, method) => {
                setVariantPayoutMethods(prev => ({ ...prev, [variantId]: method }))
              }}
              onFixedMarkupChange={(variantId, markup) => {
                setVariantFixedMarkups(prev => ({ ...prev, [variantId]: markup }))
              }}
              onMarkupPercentageChange={(variantId, percentage) => {
                setVariantMarkupPercentages(prev => ({ ...prev, [variantId]: percentage }))
              }}
            />

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" /> Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Payment Type Dropdown */}
                <div className="mb-2">
                  <Label className="block text-sm font-medium mb-1">Payment Type</Label>
                  <div className="flex gap-2">
                    <Select value={selectedPaymentType} onValueChange={value => setSelectedPaymentType(value)}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select payment type" />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentTypes.map(pt => (
                          <SelectItem key={pt.id} value={pt.id}>
                            <div className="flex items-center gap-2">
                              <span>{pt.name}</span>
                              {pt.name === 'Cash' && (
                                <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">Default</span>
                              )}
                              {pt.feeType !== "none" && pt.feeValue > 0 && (
                                <span className="text-xs text-gray-500">{pt.feeType === "percent" ? `${pt.feeValue}%` : `${currency}${pt.feeValue}`}</span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                        <SelectItem value="__add_new__" className="text-blue-600">+ Add new...</SelectItem>
                      </SelectContent>
                    </Select>
                    {selectedPaymentType && selectedPaymentType !== "__add_new__" && paymentTypes.length > 0 && (
                      <div className="flex gap-1">
                        {/* Only show Edit/Delete buttons for non-Cash payment types */}
                        {paymentTypes.find(pt => pt.id === selectedPaymentType)?.name !== 'Cash' && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => {
                              const currentPayment = paymentTypes.find(pt => pt.id === selectedPaymentType);
                              if (currentPayment) {
                                setEditingPaymentId(currentPayment.id);
                                setEditPaymentName(currentPayment.name);
                                setEditFeeType(currentPayment.feeType);
                                setEditFeeValue(currentPayment.feeValue);
                              }
                            }}>
                              Edit
                            </Button>
                            <Button size="sm" variant="outline" className="text-red-500" onClick={() => {
                              setDeleteModalId(selectedPaymentType);
                            }}>
                              Delete
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  {selectedPaymentType === "__add_new__" && (
                    <div className="mt-2 flex flex-col gap-2 border p-2 rounded bg-muted">
                      <Input
                        className="border rounded px-2 py-1"
                        placeholder="Payment Name (e.g. GCash, Card)"
                        value={newPaymentName}
                        onChange={e => setNewPaymentName(e.target.value)}
                      />
                      <div className="flex gap-2 items-center flex-wrap">
                        <label className="text-xs">Fee Type:</label>
                        <Select value={newFeeType} onValueChange={setNewFeeType}>
                          <SelectTrigger className="w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percent">Percent (%)</SelectItem>
                            <SelectItem value="fixed">Fixed</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          className="border rounded px-2 py-1 w-24"
                          type="number"
                          min={0}
                          value={newFeeValue || ""}
                          onChange={e => {
                            const value = e.target.value
                            if (value === "") {
                              setNewFeeValue(0)
                            } else {
                              setNewFeeValue(Number(value))
                            }
                          }}
                          placeholder={newFeeType === "percent" ? "%" : currency}
                        />
                        <Button size="sm" variant="default" onClick={handleAddPaymentType}>Add</Button>
                      </div>
                    </div>
                  )}
                  {editingPaymentId && (
                    <div className="mt-2 flex flex-col gap-2 border p-2 rounded bg-muted">
                      <Input
                        className="border rounded px-2 py-1"
                        placeholder="Payment Name (e.g. GCash, Card)"
                        value={editPaymentName}
                        onChange={e => setEditPaymentName(e.target.value)}
                      />
                      <div className="flex flex-wrap gap-2 items-center">
                        <label className="text-xs">Fee Type:</label>
                        <Select value={editFeeType} onValueChange={setEditFeeType}>
                          <SelectTrigger className="w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percent">Percent (%)</SelectItem>
                            <SelectItem value="fixed">Fixed</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          className="border rounded px-2 py-1 w-24"
                          type="number"
                          min={0}
                          value={editFeeValue || ""}
                          onChange={e => {
                            const value = e.target.value
                            if (value === "") {
                              setEditFeeValue(0)
                            } else {
                              setEditFeeValue(Number(value))
                            }
                          }}
                          placeholder={editFeeType === "percent" ? "%" : currency}
                        />
                        <div className="flex gap-2 flex-nowrap">
                          <Button size="sm" variant="default" onClick={() => handleEditPaymentType(editingPaymentId)}>Save</Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingPaymentId(null)}>Cancel</Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-between text-sm">
                  <span>Subtotal ({selectedVariants.length + selectedPreorders.length} items)</span>
                  <span>{formatCurrency(subtotal, currency)}</span>
                </div>

                <div>
                  <Label htmlFor="discount" className="text-sm">
                    Discount
                  </Label>
                  <div className="flex gap-2 mt-1">
                    <Select
                      value={discountType}
                      onValueChange={(value: "percentage" | "fixed") => setDiscountType(value)}
                    >
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Fixed ($)</SelectItem>
                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      id="discount"
                      type="number"
                      value={discountValue || ""}
                      onChange={(e) => {
                        const value = e.target.value
                        if (value === "") {
                          setDiscountValue(0)
                        } else {
                          setDiscountValue(Number(value))
                        }
                      }}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      className="flex-1"
                    />
                  </div>
                  {calculatedDiscount > 0 && (
                    <div className="text-xs text-gray-600 mt-1 space-y-1">
                      <p>Applied: -{formatCurrency(calculatedDiscount, currency)} (
                      {discountType === "percentage" ? `${discountValue}%` : formatCurrency(discountValue, currency)})</p>
                      <p className="italic">Reduces both sales revenue and profit</p>
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="additional-charge" className="text-sm">
                    Additional Charge
                  </Label>
                  <Input
                    id="additional-charge"
                    type="number"
                    value={additionalCharge || ""}
                    onChange={(e) => {
                      const value = e.target.value
                      if (value === "") {
                        setAdditionalCharge(0)
                      } else {
                        setAdditionalCharge(Number(value))
                      }
                    }}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="mt-1"
                  />
                  {additionalCharge > 0 && (
                    <div className="text-xs text-gray-600 mt-1">
                      <p>Additional charge of {formatCurrency(additionalCharge, currency)} added to total</p>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label htmlFor="payment-received" className="text-sm">
                      Payment Received
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPaymentReceived(totalAmount)}
                      className="h-6 px-2 text-xs"
                    >
                      Exact Amount
                    </Button>
                  </div>
                  <Input
                    id="payment-received"
                    type="number"
                    value={paymentReceived === 0 ? "" : (paymentReceived || totalAmount.toFixed(2))}
                    onChange={(e) => {
                      const value = e.target.value
                      if (value === "") {
                        setPaymentReceived(0)
                      } else {
                        setPaymentReceived(Number(value))
                      }
                    }}
                    placeholder={totalAmount.toFixed(2)}
                    step="0.01"
                    min="0"
                    className={`mt-1 ${paymentReceived > 0 && paymentReceived < totalAmount ? 'border-red-300 bg-red-50' : ''}`}
                  />
                  {paymentReceived > 0 && (
                    <div className="text-xs text-gray-600 mt-1">
                      <p>Payment received: {formatCurrency(paymentReceived, currency)}</p>
                      {paymentReceived < totalAmount && (
                        <p className="text-red-600 font-medium">⚠️ Short by {formatCurrency(totalAmount - paymentReceived, currency)}</p>
                      )}
                      {changeAmount > 0 && (
                        <p className="text-green-600">Change to give: {formatCurrency(changeAmount, currency)}</p>
                      )}
                    </div>
                  )}
                </div>

                {calculatedDiscount > 0 && (
                  <div className="flex justify-between text-sm text-red-600 font-medium">
                    <span>Discount Applied</span>
                    <span>-{formatCurrency(calculatedDiscount, currency)}</span>
                  </div>
                )}

                {additionalCharge > 0 && (
                  <div className="flex justify-between text-sm text-green-600 font-medium">
                    <span>Additional Charge</span>
                    <span>+{formatCurrency(additionalCharge, currency)}</span>
                  </div>
                )}

                {selectedPayment.feeType !== "none" && selectedPayment.feeValue > 0 && (
                  <div className="flex justify-between text-sm text-blue-600 font-medium">
                    <span>Payment Fee ({selectedPayment.feeType === "percent" ? `${selectedPayment.feeValue}%` : formatCurrency(selectedPayment.feeValue, currency)})</span>
                    <span>+{formatCurrency(paymentFee, currency)}</span>
                  </div>
                )}

                <div className="flex justify-between font-bold text-lg border-t pt-4">
                  <span>Total</span>
                  <span>{formatCurrency(totalAmount, currency)}</span>
                </div>

                {paymentReceived > 0 && (
                  <>
                    <div className="flex justify-between text-sm text-blue-600 font-medium">
                      <span>Payment Received</span>
                      <span>{formatCurrency(paymentReceived, currency)}</span>
                    </div>
                    {changeAmount > 0 && (
                      <div className="flex justify-between text-sm text-green-600 font-medium">
                        <span>Change Amount</span>
                        <span>{formatCurrency(changeAmount, currency)}</span>
                      </div>
                    )}
                  </>
                )}

                <div className="flex justify-between text-sm text-gray-700">
                  <span>Total Cost</span>
                  <span>{formatCurrency(totalCost, currency)}</span>
                </div>
                <div className="flex justify-between font-semibold text-base">
                  <span>Store Profit {selectedVariants.some(v => v.ownerType === 'consignor') ? '(for team distribution)' : ''}</span>
                  <span className={netProfit < 0 ? "text-red-600" : "text-green-600"}>{formatCurrency(netProfit, currency)}</span>
                </div>

                {/* Shipping Toggle */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex flex-col">
                      <Label htmlFor="shipping-toggle" className="text-sm font-medium">
                        Shipping Order
                      </Label>
                      {selectedPreorders.length > 0 && (
                        <span className="text-xs text-orange-600 mt-1">
                          Shipping not available with pre-orders in cart
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="shipping-toggle"
                        checked={shippingMode}
                        onCheckedChange={setShippingMode}
                        disabled={selectedPreorders.length > 0}
                      />
                    </div>
                  </div>
                  
                  {shippingMode && (
                    <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex justify-between items-start">
                        <p className="text-sm text-blue-700 font-medium">
                          Shipping Mode: Customer will pay down payment now, remaining balance on delivery
                        </p>
                        {selectedCustomer && (
                          <Badge variant="secondary" className="text-xs">
                            Pre-filled from {selectedCustomer.name}
                          </Badge>
                        )}
                      </div>
                      
                      {/* Down Payment Input */}
                      <div>
                        <Label htmlFor="down-payment" className="text-sm">
                          Down Payment Amount
                        </Label>
                        <Input
                          id="down-payment"
                          type="number"
                          step="0.01"
                          min="0"
                          max={totalAmount}
                          value={shippingDetails.downPaymentAmount || ""}
                          onChange={(e) => setShippingDetails(prev => ({ 
                            ...prev, 
                            downPaymentAmount: parseFloat(e.target.value) || 0 
                          }))}
                          placeholder="Enter down payment amount"
                          className="mt-1"
                        />
                        <p className="text-xs text-gray-600 mt-1">
                          Remaining: {formatCurrency(totalAmount - shippingDetails.downPaymentAmount, currency)}
                        </p>
                      </div>

                      {/* Shipping Details Button */}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowShippingForm(true)}
                        className="w-full"
                      >
                        <MapPin className="h-4 w-4 mr-2" />
                        {shippingDetails.address ? 'Edit' : 'Add'} Shipping Details
                      </Button>
                      
                      {shippingDetails.address && (
                        <div className="text-sm text-gray-600 bg-white p-3 rounded border">
                          <p className="font-medium">{shippingDetails.customerName || 'No Name'}</p>
                          <p>{shippingDetails.address}</p>
                          <p>{shippingDetails.city}, {shippingDetails.state} {shippingDetails.zipCode}</p>
                          <p>{shippingDetails.country}</p>
                          {shippingDetails.customerPhone && <p>Phone: {shippingDetails.customerPhone}</p>}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Consignment Summary */}
            {selectedVariants.some(v => v.ownerType === 'consignor') && (
              <Card className="border border-blue-100">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    Consignment Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(() => {
                    const consignedItems = selectedVariants.filter(v => v.ownerType === 'consignor');
                    
                    // Calculate real-time commission and payout from input values
                    let actualStoreCommission = 0;
                    let actualConsignorPayout = 0;
                    
                    // Group by consignor to get input values
                    const consignorGroups = consignedItems.reduce((groups, variant) => {
                      const key = variant.consignorId || 'unknown';
                      if (!groups[key]) {
                        groups[key] = {
                          name: variant.consignorName!,
                          totalSale: 0,
                          originalCommissionRate: variant.consignorCommissionRate || 20,
                          variants: []
                        };
                      }
                      groups[key].totalSale += variant.productSalePrice;
                      groups[key].variants.push(variant);
                      return groups;
                    }, {} as Record<string, { name: string; totalSale: number; originalCommissionRate: number; variants: any[] }>);

                    // Calculate totals using per-variant payout methods
                    Object.entries(consignorGroups).forEach(([consignorId, group]) => {
                      let calculatedStoreAmount = 0;
                      let calculatedConsignorAmount = 0;
                      
                      group.variants.forEach(v => {
                        const variant = {
                          id: v.id,
                          cost_price: v.costPrice,
                          costPrice: v.costPrice,
                          owner_type: v.ownerType,
                          consignor_id: v.consignorId ? parseInt(v.consignorId) : undefined,
                          user_id: '',
                          isArchived: false,
                          size_label: v.sizeLabel,
                          serial_number: v.serialNumber || '',
                          serialNumber: v.serialNumber || '',
                          size: v.size,
                          productName: v.productName,
                          productBrand: v.productBrand,
                          variant_sku: v.variantSku,
                          date_added: '',
                          product_id: 0,
                          color: '',
                          quantity: 1,
                          location: v.location || '',
                          status: v.status,
                          qr_code_url: null,
                          created_at: '',
                          updated_at: ''
                        };
                        
                        const consignorData = {
                          payout_method: variantPayoutMethods[v.id] || v.variantPayoutMethod || v.consignorPayoutMethod || 'percentage_split',
                          fixed_markup: variantFixedMarkups[v.id] !== undefined ? variantFixedMarkups[v.id] : (v.variantFixedMarkup ?? v.consignorFixedMarkup),
                          markup_percentage: variantMarkupPercentages[v.id] !== undefined ? variantMarkupPercentages[v.id] : (v.variantMarkupPercentage ?? v.consignorMarkupPercentage)
                        };
                        
                        const split = calculateSaleSplit(
                          variant,
                          v.productSalePrice,
                          customCommissionRates[consignorId] || v.consignorCommissionRate,
                          commissionFrom,
                          consignorData
                        );
                        
                        calculatedStoreAmount += split.store_gets;
                        calculatedConsignorAmount += split.consignor_gets;
                      });
                      
                      // Use input values if available, otherwise use calculated
                      const storeAmount = customStoreAmounts[consignorId] !== undefined 
                        ? (parseFloat(customStoreAmounts[consignorId]) || 0)
                        : calculatedStoreAmount;
                      const consignorAmount = customConsignorAmounts[consignorId] !== undefined 
                        ? (parseFloat(customConsignorAmounts[consignorId]) || 0)
                        : calculatedConsignorAmount;
                      
                      actualStoreCommission += storeAmount;
                      actualConsignorPayout += consignorAmount;
                    });

                    const totalSale = actualStoreCommission + actualConsignorPayout;

                    return (
                      <>
                        <div className="text-sm text-gray-600 mb-3">
                          {consignedItems.length} consigned item{consignedItems.length !== 1 ? 's' : ''} • Total: {formatCurrency(totalSale, currency)}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-100">
                            <p className="text-sm text-gray-600 mb-1">Your Commission</p>
                            <p className="text-lg font-bold text-green-600">{formatCurrency(actualStoreCommission, currency)}</p>
                          </div>
                          <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                            <p className="text-sm text-gray-600 mb-1">Consignor Payout</p>
                            <p className="text-lg font-bold text-blue-600">{formatCurrency(actualConsignorPayout, currency)}</p>
                          </div>
                        </div>
                        
                        <div className="text-xs text-gray-600 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                          <span className="text-amber-600">💡</span>
                          <span>Only your commission earnings ({formatCurrency(actualStoreCommission, currency)}) will be distributed to team members, not the full profit amount.</span>
                        </div>
                      </>
                    );
                  })()}
                </CardContent>
              </Card>
            )}

            <ProfitDistributionCalculator
              netProfit={netProfit}
              avatars={avatars}
              profitTemplates={profitTemplates}
              onRecordSale={(profitDistribution) => Promise.resolve(handleRecordSaleClick(profitDistribution))}
              isRecordingSale={isConfirmingSale}
              shippingMode={shippingMode}
              downPaymentAmount={shippingDetails.downPaymentAmount}
              isShippingValid={isShippingValid}
              shippingValidationErrors={getShippingValidationErrors()}
            />
          </div>
        </div>
      </div>

      {/* Shipping Details Modal */}
      <Dialog open={showShippingForm} onOpenChange={setShowShippingForm}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Shipping Details</DialogTitle>
            <DialogDescription>
              {selectedCustomer 
                ? `Shipping details pre-filled from ${selectedCustomer.name}. You can modify as needed.`
                : "Enter the shipping address and contact information for this order."
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ship-name">Full Name</Label>
                <Input
                  id="ship-name"
                  value={localShippingDetails.customerName}
                  onChange={(e) => setLocalShippingDetails(prev => ({ 
                    ...prev, 
                    customerName: e.target.value 
                  }))}
                  placeholder="Recipient's full name"
                />
              </div>
              <div>
                <Label htmlFor="ship-phone">Phone Number</Label>
                <Input
                  id="ship-phone"
                  value={localShippingDetails.customerPhone}
                  onChange={(e) => setLocalShippingDetails(prev => ({ 
                    ...prev, 
                    customerPhone: e.target.value 
                  }))}
                  placeholder="Contact number"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="ship-email">Email (Optional)</Label>
              <Input
                id="ship-email"
                type="email"
                value={localShippingDetails.customerEmail}
                onChange={(e) => setLocalShippingDetails(prev => ({ 
                  ...prev, 
                  customerEmail: e.target.value 
                }))}
                placeholder="Email address"
              />
            </div>
            
            <div>
              <Label htmlFor="ship-address">Street Address</Label>
              <Input
                id="ship-address"
                value={localShippingDetails.address}
                onChange={(e) => setLocalShippingDetails(prev => ({ 
                  ...prev, 
                  address: e.target.value 
                }))}
                placeholder="House number, street name"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ship-city">City</Label>
                <Input
                  id="ship-city"
                  value={localShippingDetails.city}
                  onChange={(e) => setLocalShippingDetails(prev => ({ 
                    ...prev, 
                    city: e.target.value 
                  }))}
                  placeholder="City"
                />
              </div>
              <div>
                <Label htmlFor="ship-state">State/Province</Label>
                <Input
                  id="ship-state"
                  value={localShippingDetails.state}
                  onChange={(e) => setLocalShippingDetails(prev => ({ 
                    ...prev, 
                    state: e.target.value 
                  }))}
                  placeholder="State or Province"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ship-zip">Zip Code</Label>
                <Input
                  id="ship-zip"
                  value={localShippingDetails.zipCode}
                  onChange={(e) => setLocalShippingDetails(prev => ({ 
                    ...prev, 
                    zipCode: e.target.value 
                  }))}
                  placeholder="Postal code"
                />
              </div>
              <div>
                <Label htmlFor="ship-country">Country</Label>
                <Input
                  id="ship-country"
                  value={localShippingDetails.country}
                  onChange={(e) => setLocalShippingDetails(prev => ({ 
                    ...prev, 
                    country: e.target.value 
                  }))}
                  placeholder="Country"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="ship-notes">Shipping Notes (Optional)</Label>
              <Textarea
                id="ship-notes"
                value={localShippingDetails.shippingNotes}
                onChange={(e) => setLocalShippingDetails(prev => ({ 
                  ...prev, 
                  shippingNotes: e.target.value 
                }))}
                placeholder="Special delivery instructions..."
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              // Reset local changes on cancel
              setLocalShippingDetails(shippingDetails);
              setShowShippingForm(false);
            }}>
              Cancel
            </Button>
            {selectedCustomer && (
              <Button 
                variant="secondary" 
                onClick={async () => {
                  // Update customer address
                  try {
                    const { createClient } = await import("@/lib/supabase/client");
                    const supabase = createClient();
                    const { data: { session } } = await supabase.auth.getSession();

                    const updateRes = await fetch('/api/customers/list', {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${session?.access_token || ""}`,
                      },
                      body: JSON.stringify({
                        id: selectedCustomer.id,
                        name: localShippingDetails.customerName,
                        phone: localShippingDetails.customerPhone,
                        email: localShippingDetails.customerEmail,
                        address: localShippingDetails.address,
                        city: localShippingDetails.city,
                        state: localShippingDetails.state,
                        zip_code: localShippingDetails.zipCode,
                        country: localShippingDetails.country,
                        customer_type: selectedCustomer.customer_type
                      }),
                    });

                    if (updateRes.ok) {
                      toast({
                        title: "Customer Updated",
                        description: "Customer address has been updated with shipping details.",
                      });
                    }
                  } catch (error) {
                    console.error('Error updating customer:', error);
                  }
                  // Save local changes to main state
                  setShippingDetails(localShippingDetails);
                  setShowShippingForm(false);
                }}
              >
                Save & Update Customer
              </Button>
            )}
            <Button onClick={() => {
              // Save local changes to main state
              setShippingDetails(localShippingDetails);
              setShowShippingForm(false);
            }}>
              Save Shipping Details
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}


