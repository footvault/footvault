"use client"

import type React from "react"

import { useState, useTransition, useEffect } from "react"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Loader2, Trash2, Edit, Save, CheckCircle, XCircle } from "lucide-react"
import Image from "next/image"
import {
  addProduct,
  addCustomLocation,
  getCustomLocations,
  checkSerialNumberUniqueness,
  addVariant,
} from "@/app/actions" // Our existing server action
import { toast } from "@/hooks/use-toast" // Assuming this toast hook exists
import { Card } from "@/components/ui/card"
import { formatCurrency, getCurrencySymbol } from "@/lib/utils/currency"
import { useCurrency } from "@/context/CurrencyContext"
import { fetchCustomLocations } from "@/lib/fetchCustomLocations"
import { v4 as uuidv4 } from 'uuid';
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"


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
  existingProductDetails: any | null // New prop for existing product from DB
  onProductAdded: () => void // Callback to refresh parent data
}

interface ProductFormState {
  name: string
  brand: string
  sku: string
  category: string
  originalPrice: number
  salePrice: number
  image: string
  sizeCategory: string // Added
}

interface VariantFormState {
  tempId: string // For UI keying before actual ID is assigned
  id?: string // Optional ID property for compatibility
  size: string | undefined
  location: string | undefined
  status: string
  dateAdded: string
  condition: string
  serialNumber: string
  sizeLabel: string // Added
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
      if (sizeLabel === "US") generateRange(4, 12, 0.5)
      else if (sizeLabel === "UK") generateRange(2, 10, 0.5)
      else if (sizeLabel === "EU")
        generateRange(34, 44, 0.5) // Approx
      else if (sizeLabel === "CM") generateRange(21, 29, 0.5) // Approx
      break
    case "Youth": // YC
      if (sizeLabel === "US" || sizeLabel === "YC")
        generateRange(1, 7, 0.5) // Youth sizes typically 1Y-7Y
      else if (sizeLabel === "UK")
        generateRange(13.5, 6.5, 0.5) // UK youth sizes
      else if (sizeLabel === "EU")
        generateRange(31, 40, 0.5) // EU youth sizes
      else if (sizeLabel === "CM") generateRange(19, 25, 0.5) // CM youth sizes
      break
    case "Toddlers": // TD
      if (sizeLabel === "US" || sizeLabel === "TD")
        generateRange(1, 10, 0.5) // Toddler sizes typically 1C-10C
      else if (sizeLabel === "UK")
        generateRange(0.5, 9.5, 0.5) // UK toddler sizes
      else if (sizeLabel === "EU")
        generateRange(16, 27, 0.5) // EU toddler sizes
      else if (sizeLabel === "CM") generateRange(8, 16, 0.5) // CM toddler sizes
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
}: AddProductFormProps) {
  const { currency } = useCurrency(); // Get the user's selected currency
  const currencySymbol = getCurrencySymbol(currency); // Get the currency symbol
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
  const [variantsToAdd, setVariantsToAdd] = useState<VariantFormState[]>([])
  const [newVariant, setNewVariant] = useState<Omit<VariantFormState, "tempId">>({
    size: undefined,
    location: "Warehouse A", // Default location
    status: "Available", // Default status
    dateAdded: new Date().toISOString().split("T")[0], // Default to current date
    condition: "New", // Default condition
    serialNumber: "",
    sizeLabel: "US", // Default value
  })
  const [customLocations, setCustomLocations] = useState<string[]>([])
  const [showCustomLocationInput, setShowCustomLocationInput] = useState(false)
  const [newCustomLocationName, setNewCustomLocationName] = useState("")
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null)
  const [editingVariantValues, setEditingVariantValues] = useState<VariantFormState | null>(null)
  const [newVariantSerialNumberError, setNewVariantSerialNumberError] = useState<string | null>(null);
  const [editingVariantSerialNumberError, setEditingVariantSerialNumberError] = useState<string | null>(null)
  const [newVariantSerialNumberValid, setNewVariantSerialNumberValid] = useState(false);

  const isAddingToExistingProduct = !!existingProductDetails

  useEffect(() => {
  const fetchLocations = async () => {
    const { success, data, error } = await fetchCustomLocations()

    if (success && data) {
      setCustomLocations(data)
    } else {
      console.error("Failed to fetch custom locations:", error)
    }
  }

  fetchLocations()
}, [])

  useEffect(() => {
    if (isAddingToExistingProduct) {
      // If adding to existing product, pre-fill product form with existing details (read-only)
      setProductForm({
        name: existingProductDetails.name,
        brand: existingProductDetails.brand,
        sku: existingProductDetails.sku,
        category: existingProductDetails.category || "Uncategorized",
        originalPrice: existingProductDetails.originalPrice || 0,
        salePrice: existingProductDetails.salePrice || 0,
        image: existingProductDetails.image || "/placeholder.svg?height=100&width=100",
        sizeCategory: existingProductDetails.sizeCategory || "Men's", // Use existing size category
      })
      setVariantsToAdd([]) // Start with an empty list for new variants
    } else if (productDataFromApi) {
      // If adding a new product from API, pre-fill product form with API data
      const retailPriceTrait = productDataFromApi.traits?.find((t) => t.trait === "Retail Price")
      const retailPrice = retailPriceTrait ? Number.parseFloat(retailPriceTrait.value) : productDataFromApi.min_price

      setProductForm({
        name: productDataFromApi.title,
        brand: productDataFromApi.brand,
        sku: productDataFromApi.sku,
        category: productDataFromApi.category || productDataFromApi.secondary_category || "Uncategorized",
        originalPrice: retailPrice || 0,
        salePrice: productDataFromApi.avg_price || 0,
        image: productDataFromApi.image || "/placeholder.svg?height=100&width=100",
        sizeCategory: "Men's", // Default or infer if API provides
      })
      setVariantsToAdd([]) // Reset variants when a new product is selected
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
      setVariantsToAdd([])
    }

    // Reset newVariant and errors regardless of mode
    setNewVariant({
      size: undefined,
      location: "Warehouse A",
      status: "Available",
      dateAdded: new Date().toISOString().split("T")[0],
      condition: "New",
      serialNumber: "",
      sizeLabel: "US", // Reset to default
    })
    setNewVariantSerialNumberError(null) // Clear error on product change
    setEditingVariantId(null)
    setEditingVariantValues(null)
    setEditingVariantSerialNumberError(null)
  }, [productDataFromApi, existingProductDetails, open]) // Depend on 'open' to reset when modal closes/opens

  const handleProductFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { id, value } = e.target
    setProductForm((prev) => ({
      ...prev,
      [id]:
        id === "originalPrice" || id === "salePrice" ? Math.ceil((Number.parseFloat(value) || 0) * 100) / 100 : value,
    }))
  }

  const handleNewVariantChange = async (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setNewVariant((prev) => ({ ...prev, [id]: value }));
    
    // Immediately validate serial number when it changes
    if (id === "serialNumber") {
      setNewVariantSerialNumberError(null);
      setNewVariantSerialNumberValid(false); // Reset validation state
      
      if (value.trim()) {
        try {
          const supabase = createClient();
          const { data: { session } } = await supabase.auth.getSession();
          
          if (!session) {
            toast({
              title: "Authentication Required",
              description: "Please sign in to continue",
              variant: "destructive",
            });
            return;
          }

          const response = await fetch('/api/check-serial-number', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              serialNumber: value.trim(),
            }),
          });

          if (!response.ok) {
            throw new Error(`Failed to check serial number: ${response.status}`);
          }

          const result = await response.json();

          if (!result.success) {
            setNewVariantSerialNumberError("Error checking serial number: " + (result.error || "Unknown error"));
            setNewVariantSerialNumberValid(false);
            return;
          }

          if (!result.isUnique) {
            setNewVariantSerialNumberError("This serial number is already in use");
            setNewVariantSerialNumberValid(false);
          } else {
            setNewVariantSerialNumberError("");
            setNewVariantSerialNumberValid(true);
          }
        } catch (error: any) {
          console.error("Error checking serial number:", error);
          setNewVariantSerialNumberError("Error checking serial number: " + error.message);
          setNewVariantSerialNumberValid(false);
          
          if (error.message.includes("Authentication")) {
            toast({
              title: "Authentication Required",
              description: "Please sign in to continue",
              variant: "destructive",
            });
          }
        }
      }
    }
  }

  const validateNewVariantSerialNumber = async () => {
    if (newVariant.serialNumber.trim()) {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          toast({
            title: "Authentication Required",
            description: "Please sign in to continue",
            variant: "destructive",
          });
          return;
        }

        const response = await fetch('/api/check-serial-number', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            serialNumber: newVariant.serialNumber.trim(),
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to check serial number: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
          setNewVariantSerialNumberError("Error checking serial number: " + (result.error || "Unknown error"));
          return;
        }

        if (!result.isUnique) {
          setNewVariantSerialNumberError("This serial number is already in use");
          setNewVariantSerialNumberValid(false);
        } else {
          setNewVariantSerialNumberError("");
          setNewVariantSerialNumberValid(true);
        }
      } catch (error: any) {
        console.error("Error checking serial number:", error);
        setNewVariantSerialNumberError("Error checking serial number: " + error.message);
        setNewVariantSerialNumberValid(false);
        
        if (error.message.includes("Authentication")) {
          toast({
            title: "Authentication Required",
            description: "Please sign in to continue",
            variant: "destructive",
          });
        }
      }
    } else {
      setNewVariantSerialNumberError("");
      setNewVariantSerialNumberValid(false);
    }
  }

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
        const supabase = createClient();
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
          setCustomLocations((prev) => [...prev, newCustomLocationName.trim()].sort());
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

  const addVariantToList = () => {
    if (
      !newVariant.size ||
      !newVariant.location ||
      !newVariant.status ||
      !newVariant.dateAdded ||
      !newVariant.condition ||
      !newVariant.serialNumber.trim() // Now mandatory and trimmed
    ) {
      toast({
        title: "Missing Variant Details",
        description: "Please fill in all required fields for the new individual shoe.",
        variant: "destructive",
      })
      return
    }

    if (newVariantSerialNumberError) {
      toast({
        title: "Serial Number Error",
        description: newVariantSerialNumberError,
        variant: "destructive",
      })
      return
    }

    setVariantsToAdd((prev) => [...prev, { ...newVariant, tempId: crypto.randomUUID() }])
    setNewVariant({
      size: undefined,
      location: "Warehouse A",
      status: "Available",
      dateAdded: new Date().toISOString().split("T")[0],
      condition: "New",
      serialNumber: "",
      sizeLabel: "US",
    })
    setNewVariantSerialNumberError(null) // Clear error after adding
  }

  const removeVariantFromList = (tempId: string) => {
    setVariantsToAdd((prev) => prev.filter((v) => v.tempId !== tempId))
  }

  const handleEditVariant = (variant: VariantFormState) => {
    setEditingVariantId(variant.tempId)
    setEditingVariantValues({ ...variant })
    setEditingVariantSerialNumberError(null) // Clear error when starting edit
  }

  const validateEditingVariantSerialNumber = async (serialNumber: string, currentVariantTempId: string) => {
    if (serialNumber.trim()) {
      // Check if the serial number is unique, but allow it if it's the original serial number of this variant
      const isOriginal =
        variantsToAdd.find((v) => v.tempId === currentVariantTempId)?.serialNumber === serialNumber.trim()
      if (isOriginal) {
        setEditingVariantSerialNumberError(null)
        return
      }

      const { isUnique, error } = await checkSerialNumberUniqueness(serialNumber.trim())
      if (error) {
        setEditingVariantSerialNumberError("Error checking serial number: " + error)
      } else if (!isUnique) {
        setEditingVariantSerialNumberError("Serial number already exists.")
      } else {
        setEditingVariantSerialNumberError(null)
      }
    } else {
      setEditingVariantSerialNumberError("Serial number is required.")
    }
  }

  const handleSaveEditedVariant = () => {
    if (!editingVariantValues) return

    if (
      !editingVariantValues.size ||
      !editingVariantValues.location ||
      !editingVariantValues.status ||
      !editingVariantValues.dateAdded ||
      !editingVariantValues.condition ||
      !editingVariantValues.serialNumber.trim()
    ) {
      toast({
        title: "Missing Variant Details",
        description: "Please fill in all required fields for the edited individual shoe.",
        variant: "destructive",
      })
      return
    }

    if (editingVariantSerialNumberError) {
      toast({
        title: "Serial Number Error",
        description: editingVariantSerialNumberError,
        variant: "destructive",
      })
      return
    }

    setVariantsToAdd((prev) => prev.map((v) => (v.tempId === editingVariantId ? { ...editingVariantValues } : v)))
    setEditingVariantId(null)
    setEditingVariantValues(null)
    setEditingVariantSerialNumberError(null) // Clear error after saving
  }

  const handleCancelEdit = () => {
    setEditingVariantId(null)
    setEditingVariantValues(null)
    setEditingVariantSerialNumberError(null) // Clear error on cancel
  }

  const handleEditedVariantChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target
    setEditingVariantValues((prev) => (prev ? { ...prev, [id]: value } : null))
    if (id === "serialNumber") {
      setEditingVariantSerialNumberError(null) // Clear error on change
    }
  }

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error("Authentication required");
      }

      // Validate and sanitize productForm and variantsToAdd
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

      // Ensure IDs are integers where required
      const sanitizedVariants = variantsToAdd.map(variant => ({
        ...variant,
        id: parseInt(variant.id ?? "", 10) || null, // Convert id to integer or null
      }));

      const response = await fetch('/api/add-product', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          productForm,
          variantsToAdd: sanitizedVariants,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to add product');
      }

      if (result.success) {
        toast({
          title: "Product Added",
          description: result.message || "Product has been added successfully.",
        });
        onOpenChange(false);
        onProductAdded();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to add product",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error adding product:", error);
      toast({
        title: "Error",
        description: error.message || "An error occurred while adding the product",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const dynamicSizes = getDynamicSizes(productForm.sizeCategory, newVariant.sizeLabel)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />{" "}
            {isAddingToExistingProduct ? `Add Individual Shoes to ${existingProductDetails.name}` : "Add New Product"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
          {/* Product Info Column */}
          <div className="md:col-span-2 space-y-4">
            <h3 className="text-lg font-semibold">Product Details</h3>
            <div className="flex items-center gap-4">
              <Image
                src={productForm.image || "/placeholder.svg"}
                alt="Product Image"
                width={100}
                height={100}
                className="rounded-md object-cover border"
              />
              <div className="flex-1 space-y-2">
                <div>
                  <Label htmlFor="name">Product Name</Label>
                  <Input
                    id="name"
                    value={productForm.name}
                    onChange={handleProductFormChange}
                    disabled={isAddingToExistingProduct}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="brand">Brand</Label>
                    <Input
                      id="brand"
                      value={productForm.brand}
                      onChange={handleProductFormChange}
                      disabled={isAddingToExistingProduct}
                    />
                  </div>
                  <div>
                    <Label htmlFor="sku">SKU</Label>
                    <Input
                      id="sku"
                      value={productForm.sku}
                      onChange={handleProductFormChange}
                      disabled={isAddingToExistingProduct}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={productForm.category}
                onChange={handleProductFormChange}
                disabled={isAddingToExistingProduct}
              />
            </div>
            <div>
              <Label htmlFor="sizeCategory">Size Category</Label>
              <Select
                value={productForm.sizeCategory}
                onValueChange={(value) => setProductForm((prev) => ({ ...prev, sizeCategory: value }))}
                disabled={isAddingToExistingProduct}
              >
                <SelectTrigger id="sizeCategory" className="w-full">
                  <SelectValue placeholder="Select size category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Men's">Men's</SelectItem>
                  <SelectItem value="Women's">Women's</SelectItem>
                  <SelectItem value="Toddlers">Toddlers</SelectItem>
                  <SelectItem value="Youth">Youth</SelectItem>
                  <SelectItem value="Unisex">Unisex</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="originalPrice">Original Price ({currencySymbol})</Label>
                <Input
                  id="originalPrice"
                  type="number"
                  value={productForm.originalPrice}
                  onChange={handleProductFormChange}
                  step="0.01"
                  max={99999}
                  
                />
              </div>
              <div>
                <Label htmlFor="salePrice">Sale Price ({currencySymbol})</Label>
                <Input
                  id="salePrice"
                  type="number"
                  value={productForm.salePrice}
                  onChange={handleProductFormChange}
                  step="0.01"
                  max={99999}
                  
                />
              </div>
            </div>
            <div>
              <Label htmlFor="image">Image URL</Label>
              <Input
                id="image"
                value={productForm.image}
                onChange={handleProductFormChange}
                disabled={isAddingToExistingProduct}
              />
            </div>
          </div>

          {/* Variants Column */}
          <div className="md:col-span-1 space-y-4">
            <h3 className="text-lg font-semibold">Individual Shoes (Variants)</h3>

            {/* Add New Variant Form */}
            <div className="border p-4 rounded-md space-y-3 bg-gray-50">
              <h4 className="font-medium text-sm">Add New Individual Shoe</h4>
              <div>
                <Label htmlFor="sizeLabel" className="text-xs">
                  Size Label
                </Label>
                <Select
                  value={newVariant.sizeLabel}
                  onValueChange={(value) => setNewVariant((prev) => ({ ...prev, sizeLabel: value, size: undefined }))} // Reset size when label changes
                >
                  <SelectTrigger id="sizeLabel" className="w-full text-xs">
                    <SelectValue placeholder="Select size label" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="US">US</SelectItem>
                    <SelectItem value="UK">UK</SelectItem>
                    <SelectItem value="EU">EU</SelectItem>
                    <SelectItem value="CM">CM</SelectItem>
                    <SelectItem value="TD">TD</SelectItem>
                    <SelectItem value="YC">YC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="size" className="text-xs">
                  Size
                </Label>
                <Select
                  value={newVariant.size}
                  onValueChange={(value) => setNewVariant((prev) => ({ ...prev, size: value }))}
                  disabled={!newVariant.sizeLabel || !productForm.sizeCategory}
                >
                  <SelectTrigger id="size" className="w-full text-xs">
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    {dynamicSizes.length > 0 ? (
                      dynamicSizes.map((size) => (
                        <SelectItem key={size} value={size}>
                          {size}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="placeholder-size-select" disabled>
                        Select Size Label & Category First
                      </SelectItem>
                    )}
                    <SelectItem value="custom-size-input">Custom Size...</SelectItem>
                  </SelectContent>
                </Select>
                {newVariant.size === "custom-size-input" && (
                  <Input
                    id="customSize"
                    placeholder="Enter custom size"
                    value={newVariant.size === "custom-size-input" ? "" : newVariant.size}
                    onChange={(e) => setNewVariant((prev) => ({ ...prev, size: e.target.value }))
                    }
                    className="mt-2 text-xs"
                  />
                )}
              </div>
              <div>
                <Label htmlFor="location" className="text-xs">
                  Location
                </Label>
                <Select
                  value={newVariant.location}
                  onValueChange={(value) => {
                    if (value === "add-custom-location") {
                      setShowCustomLocationInput(true)
                      setNewVariant((prev) => ({ ...prev, location: undefined })) // Clear current selection
                    } else {
                      setShowCustomLocationInput(false)
                      setNewVariant((prev) => ({ ...prev, location: value }))
                    }
                  }}
                >
                  <SelectTrigger id="location" className="w-full text-xs">
                    <SelectValue placeholder="Select location or add new" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Warehouse A">Warehouse A</SelectItem>
                    <SelectItem value="Warehouse B">Warehouse B</SelectItem>
                    {customLocations.map((loc) => (
                      <SelectItem key={loc} value={loc}>
                        {loc}
                      </SelectItem>
                    ))}
                    <SelectItem value="add-custom-location">Add Custom Location...</SelectItem>
                  </SelectContent>
                </Select>
                {showCustomLocationInput && (
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="newCustomLocationName"
                      placeholder="Enter new location name"
                      value={newCustomLocationName}
                      onChange={(e) => setNewCustomLocationName(e.target.value)}
                      className="text-xs flex-1"
                      disabled={isPending}
                    />
                    <Button
                      type="button"
                      onClick={handleAddCustomLocation}
                      size="sm"
                      className="h-8"
                      disabled={isPending}
                    >
                      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    </Button>
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="status" className="text-xs">
                  Status
                </Label>
                <Select
                  value={newVariant.status}
                  onValueChange={(value) => setNewVariant((prev) => ({ ...prev, status: value }))}
                >
                  <SelectTrigger id="status" className="w-full text-xs">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Available">Available</SelectItem>
                    <SelectItem value="In Display">In Display</SelectItem>
                    <SelectItem value="Used">Used</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="condition" className="text-xs">
                  Condition
                </Label>
                <Select
                  value={newVariant.condition}
                  onValueChange={(value) => setNewVariant((prev) => ({ ...prev, condition: value }))}
                >
                  <SelectTrigger id="condition" className="w-full text-xs">
                    <SelectValue placeholder="Select condition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="New">New</SelectItem>
                    <SelectItem value="Used">Used</SelectItem>
                    <SelectItem value="Damaged">Damaged</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="serialNumber" className="text-xs">
                  Serial Number
                </Label>
                <div className="relative">
                  <Input
                    id="serialNumber"
                    value={newVariant.serialNumber}
                    onChange={handleNewVariantChange}
                    className={cn(
                      "text-xs pr-8",
                      newVariantSerialNumberValid && "border-green-500",
                      newVariantSerialNumberError && "border-red-500"
                    )}
                    required
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    {newVariantSerialNumberValid && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    {newVariantSerialNumberError && (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>
                {newVariantSerialNumberError && (
                  <p className="text-red-500 text-xs mt-1">{newVariantSerialNumberError}</p>
                )}
              </div>
              <div>
                <Label htmlFor="dateAdded" className="text-xs">
                  Date Added
                </Label>
                <Input
                  id="dateAdded"
                  type="date"
                  value={newVariant.dateAdded}
                  onChange={handleNewVariantChange}
                  className="text-xs"
                />
              </div>
              <Button
                type="button"
                onClick={addVariantToList}
                className="w-full"
                disabled={!!newVariantSerialNumberError || !newVariantSerialNumberValid} // Disable if error or not validated as unique
              >
                <Plus className="h-4 w-4 mr-2" /> Add Shoe to List
              </Button>
            </div>

            {/* List of Variants to Add as Grid Cards */}
            {variantsToAdd.length > 0 && (
              <div className="space-y-2 max-h-64 overflow-y-auto border p-3 rounded-md">
                <h4 className="font-medium text-sm mb-3">Shoes to be Added ({variantsToAdd.length})</h4>
                <div className="grid grid-cols-1 gap-3">
                  {variantsToAdd.map((variant) => (
                    <Card key={variant.tempId} className="p-3">
                      {editingVariantId === variant.tempId ? (
                        // Edit mode
                        <div className="space-y-2">
                          <div>
                            <Label htmlFor="editSizeLabel" className="text-xs">
                              Size Label
                            </Label>
                            <Select
                              value={editingVariantValues?.sizeLabel || undefined}
                              onValueChange={(value) =>
                                setEditingVariantValues((prev) => (prev ? { ...prev, sizeLabel: value } : null))
                              }
                            >
                              <SelectTrigger id="editSizeLabel" className="w-full text-xs">
                                <SelectValue placeholder="Select size label" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="US">US</SelectItem>
                                <SelectItem value="UK">UK</SelectItem>
                                <SelectItem value="EU">EU</SelectItem>
                                <SelectItem value="CM">CM</SelectItem>
                                <SelectItem value="TD">TD</SelectItem>
                                <SelectItem value="YC">YC</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="editSize" className="text-xs">
                              Size
                            </Label>
                            <Select
                              value={editingVariantValues?.size || undefined}
                              onValueChange={(value) =>
                                setEditingVariantValues((prev) => (prev ? { ...prev, size: value } : null))
                              }
                            >
                              <SelectTrigger id="editSize" className="w-full text-xs">
                                <SelectValue placeholder="Select size" />
                              </SelectTrigger>
                              <SelectContent>
                                {getDynamicSizes(productForm.sizeCategory, editingVariantValues?.sizeLabel || "").map(
                                  (size) => (
                                    <SelectItem key={size} value={size}>
                                      {size}
                                    </SelectItem>
                                  ),
                                )}
                                <SelectItem value="custom-size-input">Custom Size...</SelectItem>
                              </SelectContent>
                            </Select>
                            {editingVariantValues?.size === "custom-size-input" && (
                              <Input
                                id="editCustomSize"
                                placeholder="Enter custom size"
                                value={
                                  editingVariantValues?.size === "custom-size-input" ? "" : editingVariantValues?.size
                                }
                                onChange={(e) =>
                                  setEditingVariantValues((prev) => (prev ? { ...prev, size: e.target.value } : null))
                                }
                                className="mt-2 text-xs"
                              />
                            )}
                          </div>
                          <div>
                            <Label htmlFor="editLocation" className="text-xs">
                              Location
                            </Label>
                            <Select
                              value={editingVariantValues?.location || undefined}
                              onValueChange={(value) => {
                                if (value === "add-custom-location") {
                                  setShowCustomLocationInput(true)
                                  setEditingVariantValues((prev) => (prev ? { ...prev, location: undefined } : null))
                                } else {
                                  setShowCustomLocationInput(false)
                                  setEditingVariantValues((prev) => (prev ? { ...prev, location: value } : null))
                                }
                              }}
                            >
                              <SelectTrigger id="editLocation" className="w-full text-xs">
                                <SelectValue placeholder="Select location or add new" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Warehouse A">Warehouse A</SelectItem>
                                <SelectItem value="Warehouse B">Warehouse B</SelectItem>
                                {customLocations.map((loc) => (
                                  <SelectItem key={loc} value={loc}>
                                    {loc}
                                  </SelectItem>
                                ))}
                                <SelectItem value="add-custom-location">Add Custom Location...</SelectItem>
                              </SelectContent>
                            </Select>
                            {showCustomLocationInput && editingVariantId === variant.tempId && (
                              <div className="flex gap-2 mt-2">
                                <Input
                                  id="newCustomLocationName"
                                  placeholder="Enter new location name"
                                  value={newCustomLocationName}
                                  onChange={(e) => setNewCustomLocationName(e.target.value)}
                                  className="text-xs flex-1"
                                  disabled={isPending}
                                />
                                <Button
                                  type="button"
                                  onClick={handleAddCustomLocation}
                                  size="sm"
                                  className="h-8"
                                  disabled={isPending}
                                >
                                  {isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Plus className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            )}
                          </div>
                          <div>
                            <Label htmlFor="editStatus" className="text-xs">
                              Status
                            </Label>
                            <Select
                              value={editingVariantValues?.status || undefined}
                              onValueChange={(value) =>
                                setEditingVariantValues((prev) => (prev ? { ...prev, status: value } : null))
                              }
                            >
                              <SelectTrigger id="editStatus" className="w-full text-xs">
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Available">Available</SelectItem>
                                <SelectItem value="In Display">In Display</SelectItem>
                                <SelectItem value="Used">Used</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="editCondition" className="text-xs">
                              Condition
                            </Label>
                            <Select
                              value={editingVariantValues?.condition || undefined}
                              onValueChange={(value) =>
                                setEditingVariantValues((prev) => (prev ? { ...prev, condition: value } : null))
                              }
                            >
                              <SelectTrigger id="editCondition" className="w-full text-xs">
                                <SelectValue placeholder="Select condition" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="New">New</SelectItem>
                                <SelectItem value="Used">Used</SelectItem>
                                <SelectItem value="Damaged">Damaged</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="editSerialNumber" className="text-xs">
                              Serial Number
                            </Label>
                            <Input
                              id="editSerialNumber"
                              value={editingVariantValues?.serialNumber || ""}
                              onChange={handleEditedVariantChange}
                              className="text-xs"
                              required
                              aria-invalid={editingVariantSerialNumberError ? "true" : "false"}
                            />
                            {editingVariantSerialNumberError && (
                              <p className="text-red-500 text-xs mt-1">{editingVariantSerialNumberError}</p>
                            )}
                          </div>
                          <div>
                            <Label htmlFor="editDateAdded" className="text-xs">
                              Date Added
                            </Label>
                            <Input
                              id="editDateAdded"
                              type="date"
                              value={editingVariantValues?.dateAdded || ""}
                              onChange={handleEditedVariantChange}
                              className="text-xs"
                            />
                          </div>
                          <div className="flex gap-2 mt-3">
                            <Button
                              size="sm"
                              onClick={handleSaveEditedVariant}
                              className="flex-1"
                              disabled={!!editingVariantSerialNumberError}
                            >
                              <Save className="h-4 w-4 mr-2" /> Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={handleCancelEdit} className="flex-1">
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        // Display mode
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">Size:</span>
                            <span>
                              {variant.size} ({variant.sizeLabel})
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="font-medium">Location:</span>
                            <span>{variant.location}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="font-medium">Status:</span>
                            <span>{variant.status}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="font-medium">Condition:</span>
                            <span>{variant.condition}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="font-medium">Serial:</span>
                            <span className="font-mono">{variant.serialNumber}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="font-medium">Added:</span>
                            <span>{variant.dateAdded}</span>
                          </div>
                          <div className="flex gap-2 mt-3">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditVariant(variant)}
                              className="flex-1"
                            >
                              <Edit className="h-4 w-4 mr-2" /> Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => removeVariantFromList(variant.tempId)}
                              className="flex-1"
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </Button>
                          </div>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              isPending ||
              variantsToAdd.length === 0 ||
              !!newVariantSerialNumberError ||
              !!editingVariantSerialNumberError
            }
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isAddingToExistingProduct ? "Add Individual Shoes" : "Add Product & Shoes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

