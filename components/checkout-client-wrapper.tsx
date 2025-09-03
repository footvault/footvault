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
import { Search, Plus, X, DollarSign, Loader2, CheckCircle, User } from "lucide-react"
import Image from "next/image"
import { CheckoutCart } from "@/components/checkout-cart"
import { processConsignmentSalesForCheckout, calculateSaleSplit } from "@/lib/utils/consignment"
import { useEffect } from "react"
import { ProfitDistributionCalculator } from "@/components/profit-distribution-calculator"

import { toast } from "@/hooks/use-toast"
import Link from "next/link"
import { Avatar, ProfitDistributionTemplateDetail } from "@/lib/types"
import { ConfirmationModal } from "@/components/confirmation-modal"
import { SaleSuccessModal } from "@/components/sale-success-modal"
import { ReceiptGenerator } from "@/components/receipt-generator"
import { useRouter } from "next/navigation"
import { useCurrency } from "@/context/CurrencyContext"
import { formatCurrency } from "@/lib/utils/currency"

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
  consignorPayoutMethod?: 'cost_price' | 'cost_plus_fixed' | 'cost_plus_percentage' | 'percentage_split'
  consignorFixedMarkup?: number
  consignorMarkupPercentage?: number
}

interface CheckoutClientWrapperProps {
  initialVariants: TransformedVariant[]
  initialAvatars: Avatar[]
  initialProfitTemplates: ProfitDistributionTemplateDetail[] // Use imported type
}

export function CheckoutClientWrapper({
  // THIS IS THE CORRECT NAMED EXPORT
  initialVariants,
  initialAvatars,
  initialProfitTemplates,
}: CheckoutClientWrapperProps) {
  // Pagination for variants
  const [variantPage, setVariantPage] = useState(1);
  const variantsPerPage = 12;
  const [allVariants, setAllVariants] = useState<TransformedVariant[]>(initialVariants)
  const [searchTerm, setSearchTerm] = useState("")
  const [brandFilter, setBrandFilter] = useState<string>("all")
  const [sizeCategoryFilter, setSizeCategoryFilter] = useState<string>("all")
  const [locationFilter, setLocationFilter] = useState<string>("all")
  const [sizeFilter, setSizeFilter] = useState<string[]>([]) // array of selected sizes
  const [sizeSearch, setSizeSearch] = useState("")
  const [selectedVariants, setSelectedVariants] = useState<TransformedVariant[]>([])
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("fixed")
  const [discountValue, setDiscountValue] = useState<number>(0)
  const [customerName, setCustomerName] = useState<string>("")
  const [customerPhone, setCustomerPhone] = useState<string>("")
  const [paymentReceived, setPaymentReceived] = useState<number>(0)
  const [additionalCharge, setAdditionalCharge] = useState<number>(0)
  const [commissionFrom, setCommissionFrom] = useState<'total' | 'profit'>('total')
  const [consignorCommissionType, setConsignorCommissionType] = useState<'percentage' | 'from_cost'>('percentage')
  const [customCommissionRates, setCustomCommissionRates] = useState<Record<string, number>>({}) // Override commission rates by consignor ID
  const [customStoreAmounts, setCustomStoreAmounts] = useState<Record<string, string>>({}) // Independent store amounts
  const [customConsignorAmounts, setCustomConsignorAmounts] = useState<Record<string, string>>({}) // Independent consignor amounts
  const [avatars] = useState<Avatar[]>(initialAvatars) // Avatars are static after initial load
  const [profitTemplates] = useState<ProfitDistributionTemplateDetail[]>(initialProfitTemplates) // Use imported type
  const [isRecordingSale, startSaleTransition] = useTransition()
  const [isLoadingVariants, startLoadingVariantsTransition] = useTransition() // For re-fetching variants after sale
  const [showConfirmSaleModal, setShowConfirmSaleModal] = useState(false)
  const [isConfirmingSale, startConfirmSaleTransition] = useTransition() // For the confirmation modal's loading state
  const [showSaleSuccessModal, setShowSaleSuccessModal] = useState(false)
  const [completedSaleId, setCompletedSaleId] = useState<string | null>(null)
  const [isPrintingReceipt, setIsPrintingReceipt] = useState(false)
  const [pendingProfitDistribution, setPendingProfitDistribution] = useState<
    { avatarId: string; percentage: number; amount: number }[]
  >([])
  const router = useRouter()

  const { currency } = useCurrency(); // Get the user's selected currency

  const availableVariants = useMemo(() => {
    const selectedIds = new Set(selectedVariants.map((v) => v.id))
    return allVariants.filter((variant) => !selectedIds.has(variant.id))
  }, [allVariants, selectedVariants])

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

    return filtered
  }, [searchTerm, availableVariants, brandFilter, sizeCategoryFilter, locationFilter, sizeFilter])

  // Pagination logic for variants
  const totalVariantPages = filteredVariants.length > 12 ? Math.ceil(filteredVariants.length / variantsPerPage) : 1
  const paginatedVariants = filteredVariants.length > 12
    ? filteredVariants.slice((variantPage - 1) * variantsPerPage, variantPage * variantsPerPage)
    : filteredVariants

  const handleAddVariantToCart = (variant: TransformedVariant) => {
    setSelectedVariants((prev) => [...prev, variant])
    setSearchTerm("") // Clear search after adding
    
    console.log('🛒 Adding variant to cart:', variant.productName, variant.size);
    
    // Show success toast
    toast({
      title: "Item Added to Cart",
      description: `${variant.productName} (Size ${variant.size}) added to cart.`,
      duration: 3000, // 3 seconds
    })
    
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



  // Payment type state (API-driven)
  const [paymentTypes, setPaymentTypes] = useState<any[]>([]);
  const [selectedPaymentType, setSelectedPaymentType] = useState<string>("");
  const [newPaymentName, setNewPaymentName] = useState("");
  const [newFeeType, setNewFeeType] = useState("percent");
  const [newFeeValue, setNewFeeValue] = useState(0);
  const [newAppliesTo, setNewAppliesTo] = useState("profit");
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [editPaymentName, setEditPaymentName] = useState("");
  const [editFeeType, setEditFeeType] = useState("percent");
  const [editFeeValue, setEditFeeValue] = useState(0);
  const [editAppliesTo, setEditAppliesTo] = useState("profit");
  const [loadingPayments, setLoadingPayments] = useState(false);
        // For delete confirmation modal
        const [deleteModalId, setDeleteModalId] = useState<string | null>(null);

  // Find selected payment type object
  const selectedPayment = paymentTypes.find(pt => pt.id === selectedPaymentType) || {
    id: '',
    name: 'No Payment Type',
    feeType: 'none',
    feeValue: 0,
    appliesTo: 'profit'
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
            feeValue: pt.fee_value,
            appliesTo: pt.applies_to || "profit"
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

  // Add new payment type via API
  const handleAddPaymentType = async () => {
    if (!newPaymentName.trim()) return;
    const body = { name: newPaymentName.trim(), fee_type: newFeeType, fee_value: Number(newFeeValue), applies_to: newAppliesTo };
    const res = await fetch("/api/payment-types", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await res.json();
    if (result.data) {
      setPaymentTypes(prev => [...prev, { id: result.data.id, name: result.data.name, feeType: result.data.fee_type, feeValue: result.data.fee_value, appliesTo: result.data.applies_to || "profit" }]);
      setSelectedPaymentType(result.data.id);
      setNewPaymentName("");
      setNewFeeType("percent");
      setNewFeeValue(0);
      setNewAppliesTo("profit");
    } else {
      toast({ title: "Error", description: result.error || "Failed to add payment type.", variant: "destructive" });
    }
  };

  // Edit payment type via API
  const handleEditPaymentType = async (id: string) => {
    if (!editPaymentName.trim()) return;
    const body = { id, name: editPaymentName.trim(), fee_type: editFeeType, fee_value: Number(editFeeValue), applies_to: editAppliesTo };
    const res = await fetch("/api/payment-types", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await res.json();
    if (result.data) {
      setPaymentTypes(prev => prev.map(pt => pt.id === id ? { id, name: result.data.name, feeType: result.data.fee_type, feeValue: result.data.fee_value, appliesTo: result.data.applies_to || "profit" } : pt));
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
    return selectedVariants.reduce((sum, variant) => sum + variant.productSalePrice, 0)
  }, [selectedVariants])

  // Payment fee calculation
  let paymentFee = 0;
  if (selectedPayment.feeType === "percent") {
    paymentFee = subtotal * (selectedPayment.feeValue / 100);
  } else if (selectedPayment.feeType === "fixed") {
    paymentFee = selectedPayment.feeValue;
  }
  // Applies to: profit or cost
  const paymentFeeAppliesTo = selectedPayment.appliesTo || "profit";

  const calculatedDiscount = useMemo(() => {
    if (discountType === "percentage") {
      return Math.min(subtotal * (discountValue / 100), subtotal) // Cap discount at subtotal
    } else {
      return Math.min(discountValue, subtotal) // Cap discount at subtotal
    }
  }, [subtotal, discountType, discountValue])


  // Total amount due from customer: subtotal minus discount plus additional charge (add payment fee if applies to cost)
  const totalAmount = useMemo(() => {
    let total = subtotal - calculatedDiscount + additionalCharge;
    if (paymentFeeAppliesTo === "cost") {
      total += paymentFee;
    }
    return total;
  }, [subtotal, calculatedDiscount, additionalCharge, paymentFee, paymentFeeAppliesTo]);

  // Calculate change amount
  const changeAmount = useMemo(() => {
    return Math.max(0, paymentReceived - totalAmount);
  }, [paymentReceived, totalAmount]);

  // Cost and profit calculations, payment fee can apply to cost or profit
  const totalCost = useMemo(() => {
    let baseCost = selectedVariants.reduce((sum, variant) => sum + variant.productOriginalPrice, 0);
    if (paymentFeeAppliesTo === "cost") {
      baseCost += paymentFee;
    }
    return baseCost;
  }, [selectedVariants, paymentFee, paymentFeeAppliesTo]);

  // Calculate true store profit (only commission from consigned items + full profit from store items)
  const storeProfit = useMemo(() => {
    let totalStoreProfit = 0;
    
    selectedVariants.forEach(variant => {
      const salePrice = variant.productSalePrice;
      const costPrice = variant.productOriginalPrice;
      
      if (variant.ownerType === 'consignor' && variant.consignorCommissionRate) {
        // For consigned items: use actual input value if available, otherwise calculate
        const consignorId = variant.consignorId || 'unknown';
        if (customStoreAmounts[consignorId] !== undefined && customStoreAmounts[consignorId] !== '') {
          // Use the actual input value
          const inputAmount = parseFloat(customStoreAmounts[consignorId]) || 0;
          totalStoreProfit += inputAmount;
        } else {
          // Fall back to calculated commission
          const commissionRate = customCommissionRates[consignorId] || variant.consignorCommissionRate;
          const commissionAmount = salePrice * (commissionRate / 100);
          totalStoreProfit += commissionAmount;
        }
      } else {
        // For store items: full profit (sale price - cost price)
        totalStoreProfit += (salePrice - costPrice);
      }
    });
    
    // Subtract discount and fees from store profit
    totalStoreProfit -= calculatedDiscount;
    if (paymentFeeAppliesTo === "profit") {
      totalStoreProfit -= paymentFee;
    }
    
    return totalStoreProfit;
  }, [selectedVariants, paymentFee, paymentFeeAppliesTo, calculatedDiscount, customCommissionRates, customStoreAmounts]);

  // Calculate total consignor payouts for display
  const totalConsignorPayout = useMemo(() => {
    return selectedVariants
      .filter(v => v.ownerType === 'consignor')
      .reduce((sum, v) => {
        const salePrice = v.productSalePrice;
        const variant = {
          id: v.id,
          cost_price: v.costPrice,
          owner_type: 'consignor' as const,
          // Add minimal required fields to satisfy Variant type
          date_added: '',
          variant_sku: v.variantSku,
          serial_number: v.serialNumber || '',
          product_id: 0,
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
          payout_method: v.consignorPayoutMethod || 'percentage_split',
          fixed_markup: v.consignorFixedMarkup,
          markup_percentage: v.consignorMarkupPercentage
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
  }, [selectedVariants, commissionFrom, customCommissionRates]);

  // Keep netProfit for backwards compatibility but use storeProfit
  const netProfit = storeProfit;

  const handleConfirmSale = async (profitDistribution: { avatarId: string; percentage: number; amount: number }[]) => {
    startConfirmSaleTransition(async () => {
      const saleDate = new Date().toISOString().split("T")[0] // Current date in YYYY-MM-DD format

      const items = selectedVariants.map((variant) => ({
        variantId: variant.id,
        soldPrice: variant.productSalePrice, // Assuming sale price is the sold price
        costPrice: variant.costPrice,
        quantity: 1,
      }))

      // --- ADDED CONSOLE LOG HERE ---
      console.log("Items being sent to recordSale:", items)
      // --- END CONSOLE LOG ---

      // Compose payment type JSON for new sales.payment_type jsonb column
      const paymentTypeJson = {
        id: selectedPaymentType,
        name: selectedPayment.name,
        feeType: selectedPayment.feeType,
        feeValue: selectedPayment.feeValue,
        feeAmount: paymentFee,
        appliesTo: paymentFeeAppliesTo
      };

      const payload = {
        saleDate,
        totalAmount,
        totalDiscount: calculatedDiscount,
        netProfit,
        items,
        profitDistribution,
        customerName, // Add customer name
        customerPhone, // Add customer phone
        paymentType: paymentTypeJson, // Save as JSONB
        paymentReceived,
        changeAmount,
        additionalCharge,
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

          toast({
            title: "Sale Recorded Successfully!",
            description: `Sale of $${totalAmount.toFixed(2)} completed.`,
          })
          setCompletedSaleId(result.saleId) // Store the sale ID
          setSelectedVariants([]) // Clear cart
          setDiscountValue(0) // Reset discount
          setSearchTerm("") // Clear search
          setCustomerName("") // Reset customer name
          setCustomerPhone("") // Reset customer phone
          setPaymentReceived(0) // Reset payment received
          setAdditionalCharge(0) // Reset additional charge
          setShowConfirmSaleModal(false) // Close confirmation modal
          setShowSaleSuccessModal(true) // Show success modal

          // Re-fetch all variants to update available stock using the API
          startLoadingVariantsTransition(async () => {
            try {
              const { createClient } = await import("@/lib/supabase/client")
              const supabase = createClient()
              const { data: { session } } = await supabase.auth.getSession()
              const response = await fetch("/api/get-available-variants-client", {
                headers: {
                  Authorization: `Bearer ${session?.access_token || ''}`
                }
              })
              const result = await response.json()
              if (result.success && result.data) {
                setAllVariants(result.data)
              } else {
                console.error("Failed to refresh variants after sale:", result.error)
                toast({
                  title: "Data Refresh Warning",
                  description: "Failed to refresh available shoes. Please refresh the page manually.",
                  variant: "destructive",
                })
              }
            } catch (refreshError) {
              console.error("Failed to refresh variants after sale:", refreshError)
              toast({
                title: "Data Refresh Warning",
                description: "Failed to refresh available shoes. Please refresh the page manually.",
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

  // Add this new function before the return statement
  const handleRecordSaleClick = (profitDistribution: { avatarId: string; percentage: number; amount: number }[]) => {
    const totalDistributedPercentage = profitDistribution.reduce((sum, item) => sum + item.percentage, 0)
    const currentDistribution = profitDistribution

    if (selectedVariants.length === 0) {
      toast({
        title: "No Items Selected",
        description: "Please add at least one individual shoe to the cart to complete a sale.",
        variant: "destructive",
      })
      return
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
        onPrintReceipt={() => {
          if (completedSaleId) {
            setIsPrintingReceipt(true)
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
                <Search className="h-5 w-5" /> Add Individual Shoes to Sale
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
              <div className="flex flex-wrap gap-2">
                <Select value={brandFilter} onValueChange={setBrandFilter}>
                  <SelectTrigger className="w-[150px]">
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
                  <SelectTrigger className="w-[150px]">
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
                  <SelectTrigger className="w-[150px]">
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

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[150px] justify-between">
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
                            {variant.ownerType === 'consignor' && (
                              <div className="absolute top-1 right-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs px-2 py-1 rounded-md shadow-sm">
                                Consigned
                              </div>
                            )}
                          </div>
                          <h3 className="font-semibold text-sm line-clamp-2">{variant.productName}</h3>
                          <p className="text-xs text-gray-600">{variant.productBrand}</p>
                          <p className="text-xs font-mono text-gray-500">SKU: {variant.productSku}</p>
                          <p className="text-xs font-mono text-gray-500">Serial: {variant.serialNumber}</p>
                          <p className="text-xs text-gray-500">
                            Size: {variant.size} ({variant.sizeLabel})
                          </p>
                          <p className="text-xs text-gray-500">
                            Location: {variant.location || 'Not specified'}
                          </p>
                          {variant.ownerType === 'consignor' && variant.consignorName && (
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
                            <Plus className="h-4 w-4 mr-1" /> Add to Cart
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
                <div>
                  <Label htmlFor="customer-name">Customer Name</Label>
                  <Input
                    id="customer-name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter customer name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="customer-phone">Phone Number (Optional)</Label>
                  <Input
                    id="customer-phone"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Enter phone number"
                    type="tel"
                  />
                </div>
              </CardContent>
            </Card>

            <CheckoutCart 
              selectedVariants={selectedVariants} 
              onRemove={handleRemoveVariantFromCart} 
              commissionFrom={commissionFrom}
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
                                setEditAppliesTo(currentPayment.appliesTo || "profit");
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
                        <label className="text-xs ml-2">Affects:</label>
                        <Select value={newAppliesTo} onValueChange={setNewAppliesTo}>
                          <SelectTrigger className="w-[100px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="profit">Profit</SelectItem>
                            <SelectItem value="cost">Cost</SelectItem>
                          </SelectContent>
                        </Select>
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
                        <label className="text-xs ml-2">Affects:</label>
                        <Select value={editAppliesTo} onValueChange={setEditAppliesTo}>
                          <SelectTrigger className="w-[100px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="profit">Profit</SelectItem>
                            <SelectItem value="cost">Cost</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex gap-2 flex-nowrap">
                          <Button size="sm" variant="default" onClick={() => handleEditPaymentType(editingPaymentId)}>Save</Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingPaymentId(null)}>Cancel</Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-between text-sm">
                  <span>Subtotal ({selectedVariants.length} items)</span>
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

                {/* Commission Configuration */}
                {selectedVariants.some(v => v.ownerType === 'consignor') && (
                  <div className="border-t pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <Label className="text-sm font-medium">Commission Settings</Label>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="commission-from" className="text-xs text-gray-600">
                          Commission from:
                        </Label>
                        <Select value={commissionFrom} onValueChange={(value: 'total' | 'profit') => setCommissionFrom(value)}>
                          <SelectTrigger className="w-full mt-1 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="total">Total sale</SelectItem>
                            <SelectItem value="profit">Profit only</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="consignor-commission-type" className="text-xs text-gray-600">
                          Payout method:
                        </Label>
                        <Select value={consignorCommissionType} onValueChange={(value: 'percentage' | 'from_cost') => setConsignorCommissionType(value)}>
                          <SelectTrigger className="w-full mt-1 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">% Split</SelectItem>
                            <SelectItem value="from_cost">Cost + Markup</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Consignment Split */}
                {selectedVariants.some(v => v.ownerType === 'consignor') && (
                  <div className="border-t pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <Label className="text-sm font-medium">Split Adjustment</Label>
                    </div>
                    <div className="space-y-3">
                      {(() => {
                        const consignedTotal = selectedVariants
                          .filter(v => v.ownerType === 'consignor')
                          .reduce((sum, v) => sum + v.productSalePrice, 0);

                        const totalStoreCommission = (() => {
                          // Calculate real-time commission from input values
                          const consignorGroups = selectedVariants
                            .filter(v => v.ownerType === 'consignor' && v.consignorName)
                            .reduce((groups, variant) => {
                              const key = variant.consignorId || 'unknown';
                              if (!groups[key]) {
                                groups[key] = {
                                  totalSale: 0,
                                  originalCommissionRate: variant.consignorCommissionRate || 20
                                };
                              }
                              groups[key].totalSale += variant.productSalePrice;
                              return groups;
                            }, {} as Record<string, { totalSale: number; originalCommissionRate: number }>);

                          return Object.entries(consignorGroups).reduce((total, [consignorId, group]) => {
                            const currentCommissionRate = customCommissionRates[consignorId] || group.originalCommissionRate;
                            const calculatedStoreAmount = group.totalSale * (currentCommissionRate / 100);
                            
                            // Use input value if available, otherwise use calculated
                            const storeAmount = customStoreAmounts[consignorId] !== undefined && customStoreAmounts[consignorId] !== ''
                              ? (parseFloat(customStoreAmounts[consignorId]) || 0)
                              : calculatedStoreAmount;
                            
                            return total + storeAmount;
                          }, 0);
                        })();

                        const consignorGroups = selectedVariants
                          .filter(v => v.ownerType === 'consignor' && v.consignorName)
                          .reduce((groups, variant) => {
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

                        return (
                          <div className="space-y-2">
                            {Object.entries(consignorGroups).map(([consignorId, group]) => {
                              const currentCommissionRate = customCommissionRates[consignorId] || group.originalCommissionRate;
                              const calculatedStoreAmount = group.totalSale * (currentCommissionRate / 100);
                              const calculatedConsignorAmount = group.totalSale - calculatedStoreAmount;
                              
                              // Get current input values or use calculated defaults
                              const currentStoreAmount = customStoreAmounts[consignorId] !== undefined 
                                ? customStoreAmounts[consignorId] 
                                : calculatedStoreAmount.toFixed(2);
                              const currentConsignorAmount = customConsignorAmounts[consignorId] !== undefined 
                                ? customConsignorAmounts[consignorId] 
                                : calculatedConsignorAmount.toFixed(2);
                              
                              // Parse values for validation and percentage calculation
                              const storeValue = parseFloat(currentStoreAmount) || 0;
                              const consignorValue = parseFloat(currentConsignorAmount) || 0;
                              const totalInput = storeValue + consignorValue;
                              const isInvalid = Math.abs(totalInput - group.totalSale) > 0.01;
                              
                              // Calculate actual commission percentage from inputs
                              const actualCommissionRate = totalInput > 0 ? (storeValue / totalInput) * 100 : currentCommissionRate;

                              return (
                                <div key={consignorId} className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-3 border">
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="font-medium text-sm">{group.name}</span>
                                    <span className="text-xs text-gray-600">{formatCurrency(group.totalSale, currency)}</span>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <Label className="text-xs text-green-700">You get</Label>
                                      <Input
                                        type="number"
                                        value={currentStoreAmount}
                                        onChange={(e) => {
                                          const value = e.target.value;
                                          setCustomStoreAmounts(prev => ({
                                            ...prev,
                                            [consignorId]: value
                                          }));
                                        }}
                                        className={`h-7 text-sm ${storeValue > group.totalSale ? 'border-red-300 bg-red-50' : ''}`}
                                        step="0.01"
                                        min="0"
                                        max={group.totalSale}
                                        placeholder="0.00"
                                      />
                                      {storeValue > group.totalSale && (
                                        <p className="text-xs text-red-600 mt-1">⚠️ Cannot exceed total sale</p>
                                      )}
                                    </div>
                                    <div>
                                      <Label className="text-xs text-blue-700">They get</Label>
                                      <Input
                                        type="number"
                                        value={currentConsignorAmount}
                                        onChange={(e) => {
                                          const value = e.target.value;
                                          setCustomConsignorAmounts(prev => ({
                                            ...prev,
                                            [consignorId]: value
                                          }));
                                        }}
                                        className={`h-7 text-sm ${consignorValue > group.totalSale ? 'border-red-300 bg-red-50' : ''}`}
                                        step="0.01"
                                        min="0"
                                        max={group.totalSale}
                                        placeholder="0.00"
                                      />
                                      {consignorValue > group.totalSale && (
                                        <p className="text-xs text-red-600 mt-1">⚠️ Cannot exceed total sale</p>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center justify-between mt-2">
                                    <span className={`text-xs px-2 py-1 rounded-full border ${
                                      Math.abs(actualCommissionRate - currentCommissionRate) > 0.1 
                                        ? 'bg-blue-50 border-blue-200 text-blue-700' 
                                        : 'bg-white text-gray-600'
                                    }`}>
                                      {actualCommissionRate.toFixed(1)}% commission
                                      {Math.abs(actualCommissionRate - currentCommissionRate) > 0.1 && (
                                        <span className="ml-1 text-xs">
                                          (was {currentCommissionRate.toFixed(1)}%)
                                        </span>
                                      )}
                                    </span>
                                    {isInvalid && (
                                      <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full border border-red-200">
                                        ⚠️ Total: {formatCurrency(totalInput, currency)} ≠ {formatCurrency(group.totalSale, currency)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                            
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 flex items-center gap-2">
                              <span className="text-amber-600 text-sm">💡</span>
                              <span className="text-xs text-amber-800">
                                Team gets {formatCurrency(totalStoreCommission, currency)} commission earnings
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

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
                  <div className="flex justify-between text-sm font-medium">
                    <span>Payment Fee ({selectedPayment.feeType === "percent" ? `${selectedPayment.feeValue}%` : formatCurrency(selectedPayment.feeValue, currency)}):</span>
                    <span className="text-red-500">- {formatCurrency(paymentFee, currency)} <span className="text-xs">(applies to {paymentFeeAppliesTo})</span></span>
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
                          originalCommissionRate: variant.consignorCommissionRate || 20
                        };
                      }
                      groups[key].totalSale += variant.productSalePrice;
                      return groups;
                    }, {} as Record<string, { name: string; totalSale: number; originalCommissionRate: number }>);

                    // Calculate totals from input values or defaults
                    Object.entries(consignorGroups).forEach(([consignorId, group]) => {
                      const currentCommissionRate = customCommissionRates[consignorId] || group.originalCommissionRate;
                      const calculatedStoreAmount = group.totalSale * (currentCommissionRate / 100);
                      const calculatedConsignorAmount = group.totalSale - calculatedStoreAmount;
                      
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
            />
          </div>
        </div>
      </div>
    </>
  )
}


