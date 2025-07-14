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
import { ProfitDistributionCalculator } from "@/components/profit-distribution-calculator"
import { recordSale, getAllAvailableVariantsForClient } from "@/app/actions"
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

  const subtotal = useMemo(() => {
    return selectedVariants.reduce((sum, variant) => sum + variant.productSalePrice, 0)
  }, [selectedVariants])

  const calculatedDiscount = useMemo(() => {
    if (discountType === "percentage") {
      return Math.min(subtotal * (discountValue / 100), subtotal) // Cap discount at subtotal
    } else {
      return Math.min(discountValue, subtotal) // Cap discount at subtotal
    }
  }, [subtotal, discountType, discountValue])

  const totalAmount = useMemo(() => {
    return subtotal - calculatedDiscount
  }, [subtotal, calculatedDiscount])

  const totalCost = useMemo(() => {
    return selectedVariants.reduce((sum, variant) => sum + variant.productOriginalPrice, 0)
  }, [selectedVariants])

  const netProfit = useMemo(() => {
    // PROFIT CALCULATION: sum of (sale_price - original_price) for each item, where original_price is the cost
    return selectedVariants.reduce((sum, variant) => sum + (variant.productSalePrice - variant.productOriginalPrice), 0)
  }, [selectedVariants])

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

      const payload = {
        saleDate,
        totalAmount,
        totalDiscount: calculatedDiscount,
        netProfit,
        items,
        profitDistribution,
        customerName, // Add customer name
        customerPhone, // Add customer phone
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


