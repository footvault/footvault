"use client"

import { useState } from "react"
import { Select, SelectItem, SelectContent, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useMemo, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Search, Plus, X, DollarSign, Loader2, CheckCircle, User } from "lucide-react"
import Image from "next/image"
import { CheckoutCart } from "@/components/checkout-cart"
import { useEffect } from "react"
import { ProfitDistributionCalculator } from "@/components/profit-distribution-calculator"

import { toast } from "@/hooks/use-toast"
import Link from "next/link"
import { Avatar, ProfitDistributionTemplateDetail } from "@/lib/types"
import { ConfirmationModal } from "@/components/confirmation-modal"
import { SaleSuccessModal } from "@/components/sale-success-modal"
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
  const variantsPerPage = 50;
  const [allVariants, setAllVariants] = useState<TransformedVariant[]>(initialVariants)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedVariants, setSelectedVariants] = useState<TransformedVariant[]>([])
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("fixed")
  const [discountValue, setDiscountValue] = useState<number>(0)
  const [customerName, setCustomerName] = useState<string>("")
  const [customerPhone, setCustomerPhone] = useState<string>("")
  const [avatars] = useState<Avatar[]>(initialAvatars) // Avatars are static after initial load
  const [profitTemplates] = useState<ProfitDistributionTemplateDetail[]>(initialProfitTemplates) // Use imported type
  const [isRecordingSale, startSaleTransition] = useTransition()
  const [isLoadingVariants, startLoadingVariantsTransition] = useTransition() // For re-fetching variants after sale
  const [showConfirmSaleModal, setShowConfirmSaleModal] = useState(false)
  const [isConfirmingSale, startConfirmSaleTransition] = useTransition() // For the confirmation modal's loading state
  const [showSaleSuccessModal, setShowSaleSuccessModal] = useState(false)
  const [pendingProfitDistribution, setPendingProfitDistribution] = useState<
    { avatarId: string; percentage: number; amount: number }[]
  >([])
  const router = useRouter()

  const { currency } = useCurrency(); // Get the user's selected currency

  const availableVariants = useMemo(() => {
    const selectedIds = new Set(selectedVariants.map((v) => v.id))
    return allVariants.filter((variant) => !selectedIds.has(variant.id))
  }, [allVariants, selectedVariants])

  const filteredVariants = useMemo(() => {
    if (!searchTerm) return availableVariants
    const lowerCaseSearchTerm = searchTerm.toLowerCase()
    return availableVariants.filter((variant) => {
      const searchableFields = [
        variant.productName,
        variant.productBrand,
        variant.productSku,
        variant.serialNumber,
        variant.variantSku,
        variant.size,
      ].map((field) => (field || "").toLowerCase())
      return searchableFields.some((field) => field.includes(lowerCaseSearchTerm))
    })
  }, [searchTerm, availableVariants])

  // Pagination logic for variants
  const totalVariantPages = filteredVariants.length > 50 ? Math.ceil(filteredVariants.length / variantsPerPage) : 1
  const paginatedVariants = filteredVariants.length > 50
    ? filteredVariants.slice((variantPage - 1) * variantsPerPage, variantPage * variantsPerPage)
    : filteredVariants

  const handleAddVariantToCart = (variant: TransformedVariant) => {
    setSelectedVariants((prev) => [...prev, variant])
    setSearchTerm("") // Clear search after adding
  }

  const handleRemoveVariantFromCart = (variantId: string) => {
    setSelectedVariants((prev) => prev.filter((v) => v.id !== variantId))
  }



  // Payment type state (API-driven)
  const [paymentTypes, setPaymentTypes] = useState<any[]>([{ id: 'cash', name: "Cash", feeType: "none", feeValue: 0, appliesTo: "profit" }]);
  const [selectedPaymentType, setSelectedPaymentType] = useState<string>("cash");
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
  const selectedPayment = paymentTypes.find(pt => pt.id === selectedPaymentType) || paymentTypes[0];

  // Fetch payment types from API
  useEffect(() => {
    const fetchPayments = async () => {
      setLoadingPayments(true);
      try {
        const res = await fetch("/api/payment-types");
        const result = await res.json();
        if (result.data) {
          setPaymentTypes([
            { id: 'cash', name: "Cash", feeType: "none", feeValue: 0, appliesTo: "profit" },
            ...result.data.map((pt: any) => ({
              id: pt.id,
              name: pt.name,
              feeType: pt.fee_type,
              feeValue: pt.fee_value,
              appliesTo: pt.applies_to || "profit"
            }))
          ]);
        }
      } catch (e) {
        // fallback to cash only
        setPaymentTypes([{ id: 'cash', name: "Cash", feeType: "none", feeValue: 0, appliesTo: "profit" }]);
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
    } else {
      toast({ title: "Error", description: result.error || "Failed to update payment type.", variant: "destructive" });
    }
  };

  // Delete payment type via API
  const handleDeletePaymentType = async (id: string) => {
    setDeleteModalId(id);
    const res = await fetch("/api/payment-types", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    const result = await res.json();
    if (result.success) {
      setPaymentTypes(prev => prev.filter(pt => pt.id !== id));
      if (selectedPaymentType === id) setSelectedPaymentType("cash");
    } else {
      toast({ title: "Error", description: result.error || "Failed to delete payment type.", variant: "destructive" });
    }
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


  // Total amount due from customer: subtotal minus discount (add payment fee if applies to cost)
  const totalAmount = useMemo(() => {
    let total = subtotal - calculatedDiscount;
    if (paymentFeeAppliesTo === "cost") {
      total += paymentFee;
    }
    return total;
  }, [subtotal, calculatedDiscount, paymentFee, paymentFeeAppliesTo]);

  // Cost and profit calculations, payment fee can apply to cost or profit
  const totalCost = useMemo(() => {
    let baseCost = selectedVariants.reduce((sum, variant) => sum + variant.productOriginalPrice, 0);
    if (paymentFeeAppliesTo === "cost") {
      baseCost += paymentFee;
    }
    return baseCost;
  }, [selectedVariants, paymentFee, paymentFeeAppliesTo]);

  const netProfit = useMemo(() => {
    let baseProfit = selectedVariants.reduce((sum, variant) => sum + (variant.productSalePrice - variant.productOriginalPrice), 0);
    if (paymentFeeAppliesTo === "profit") {
      baseProfit -= paymentFee;
    }
    return baseProfit;
  }, [selectedVariants, paymentFee, paymentFeeAppliesTo]);

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
          toast({
            title: "Sale Recorded Successfully!",
            description: `Sale of $${totalAmount.toFixed(2)} completed.`,
          })
          setSelectedVariants([]) // Clear cart
          setDiscountValue(0) // Reset discount
          setSearchTerm("") // Clear search
          setCustomerName("") // Reset customer name
          setCustomerPhone("") // Reset customer phone
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
        redirectPath="/" // Redirect to inventory page
        redirectDelay={3000} // 3 seconds
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-96 overflow-y-auto pr-2">
                    {paginatedVariants.map((variant) => (
                      <Card key={variant.id} className="flex flex-col">
                        <CardContent className="p-3 flex-grow">
                          <Image
                            src={variant.productImage || "/placeholder.svg?height=100&width=100"}
                            alt={variant.productName || "Placeholder image"}
                            width={80}
                            height={80}
                            className="rounded-md object-cover mx-auto mb-2"
                          />
                          <h3 className="font-semibold text-sm line-clamp-2">{variant.productName}</h3>
                          <p className="text-xs text-gray-600">{variant.productBrand}</p>
                          <p className="text-xs font-mono text-gray-500">SKU: {variant.productSku}</p>
                          <p className="text-xs font-mono text-gray-500">Serial: {variant.serialNumber}</p>
                          <p className="text-xs text-gray-500">
                            Size: {variant.size} ({variant.sizeLabel})
                          </p>
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
                  {filteredVariants.length > 50 && (
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

            <CheckoutCart selectedVariants={selectedVariants} onRemove={handleRemoveVariantFromCart} />

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
                  <Select value={selectedPaymentType} onValueChange={value => setSelectedPaymentType(value)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select payment type" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentTypes.map(pt => (
                        <div key={pt.id} className="flex items-center justify-between group">
                          <SelectItem value={pt.id} className="flex-1">
                            <div className="flex items-center gap-2">
                              <span>{pt.name}</span>
                              {pt.feeType !== "none" && (
                                <span className="text-xs text-gray-500">{pt.feeType === "percent" ? `${pt.feeValue}%` : `₱${pt.feeValue}`}</span>
                              )}
                            </div>
                          </SelectItem>
                          {pt.id !== 'cash' && (
                            <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button size="sm" variant="ghost" onClick={e => {
                                e.stopPropagation();
                                setEditingPaymentId(pt.id);
                                setEditPaymentName(pt.name);
                                setEditFeeType(pt.feeType);
                                setEditFeeValue(pt.feeValue);
                                setEditAppliesTo(pt.appliesTo || "profit");
                                setSelectedPaymentType(pt.id); // close dropdown
                              }}>
                                Edit
                              </Button>
                              <Button size="sm" variant="ghost" className="text-red-500" onClick={e => {
                                e.stopPropagation();
                                setDeleteModalId(pt.id);
                              }}>
                                Delete
                              </Button>
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
                            </div>
                          )}
                        </div>
                      ))}
                      <SelectItem value="__add_new__" className="text-blue-600">+ Add new...</SelectItem>
                    </SelectContent>
                  </Select>
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
                          value={newFeeValue}
                          onChange={e => setNewFeeValue(Number(e.target.value))}
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
                          value={editFeeValue}
                          onChange={e => setEditFeeValue(Number(e.target.value))}
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
                      value={discountValue}
                      onChange={(e) => setDiscountValue(Number(e.target.value))}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      className="flex-1"
                    />
                  </div>
                  {calculatedDiscount > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Applied: -${safeToFixed(calculatedDiscount)} (
                      {discountType === "percentage" ? `${discountValue}%` : `$${safeToFixed(discountValue)}`})
                    </p>
                  )}
                </div>

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
                <div className="flex justify-between text-sm text-gray-700">
                  <span>Total Cost</span>
                  <span>{formatCurrency(totalCost, currency)}</span>
                </div>
                <div className="flex justify-between font-semibold text-base">
                  <span>Net Profit</span>
                  <span className={netProfit < 0 ? "text-red-600" : "text-green-600"}>{formatCurrency(netProfit, currency)}</span>
                </div>
              </CardContent>
            </Card>

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


