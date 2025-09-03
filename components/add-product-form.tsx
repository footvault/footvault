"use client"

import type React from "react"

import { useState, useTransition, useEffect } from "react"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Loader2, Trash2, Edit, Save, CheckCircle, XCircle, ExternalLink, RefreshCw } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"

import { toast } from "@/hooks/use-toast" // Assuming this toast hook exists
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency, getCurrencySymbol } from "@/lib/utils/currency"
import { useCurrency } from "@/context/CurrencyContext"
import { fetchCustomLocations } from "@/lib/fetchCustomLocations"
import { v4 as uuidv4 } from 'uuid';
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

// Helper functions for number formatting with commas
const formatNumberWithCommas = (value: number | string): string => {
  if (value === "" || value === null || value === undefined) return ""
  const numValue = typeof value === "string" ? parseFloat(value) : value
  if (isNaN(numValue)) return ""
  if (numValue === 0) return "0"
  
  // Format with commas and preserve up to 2 decimal places
  return numValue.toLocaleString('en-US', { 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 2,
    useGrouping: true 
  })
}

const parseNumberFromCommaSeparated = (value: string): number => {
  if (!value || value === "") return 0
  // Remove commas and parse as float
  const cleaned = value.replace(/,/g, "")
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? 0 : parsed
}

const formatInputValue = (value: string): string => {
  // Remove any non-digit characters except decimal point
  let cleaned = value.replace(/[^\d.]/g, "")
  
  // Handle multiple decimal points - keep only the first one
  const parts = cleaned.split('.')
  if (parts.length > 2) {
    cleaned = parts[0] + '.' + parts.slice(1).join('')
  }
  
  // Limit to 2 decimal places
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
  existingProductDetails: any | null // New prop for existing product from DB
  onProductAdded: () => void // Callback to refresh parent data
  inferredSizeCategory?: string // New optional prop for inferred size category
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
        generateRange(2, 10, 0.5) // Nike/Adidas standard: 2C-10C
      else if (sizeLabel === "UK")
        generateRange(1.5, 9.5, 0.5) // UK toddler sizes
      else if (sizeLabel === "EU")
        generateRange(17, 27, 0.5) // EU toddler sizes
      else if (sizeLabel === "CM") generateRange(9, 16, 0.5) // CM toddler sizes
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
    location: "Warehouse A", // Default location
    status: "Available", // Default status
    dateAdded: new Date().toISOString().split("T")[0], // Default to current date
    condition: "New", // Default condition
    sizeLabel: "US", // Default value
    quantity: 1,
    owner_type: "store", // Default to store ownership
    consignor_id: null, // Default to no consignor
  })
  const [customLocations, setCustomLocations] = useState<string[]>([])
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
  }>>([])
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
        .select('id, name, commission_rate, status')
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
  }, [open])

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
        originalPrice: retailPrice || 0,
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

  // All variant editing/removal logic removed; only single quantity input is used now.

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const supabase = createClient(undefined);
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error("Authentication required");
      }

      // Check variant limits before proceeding
      try {
        const variantLimitResponse = await fetch("/api/variant-limits", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        const variantLimitData = await variantLimitResponse.json();
        
        if (variantLimitData.success) {
          const variantsToAdd = typeof newVariant.quantity === "string" ? parseInt(newVariant.quantity) || 1 : newVariant.quantity || 1;
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
      const quantityNum = typeof newVariant.quantity === "string" ? parseInt(newVariant.quantity) || 0 : newVariant.quantity;
      if (!newVariant.size || !newVariant.location || !newVariant.status || !newVariant.dateAdded || !newVariant.condition || !newVariant.quantity || quantityNum < 1) {
        toast({
          title: "Missing Variant Details",
          description: "Please fill in all required fields for the variant.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

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

      // 2. Get max serial_number for this user
      const { data: maxSerialData, error: maxSerialError } = await supabase
        .from('variants')
        .select('serial_number')
        .eq('user_id', session.user.id)
        .order('serial_number', { ascending: false })
        .limit(1);
      let maxSerial = 0;
      if (maxSerialData && maxSerialData.length > 0 && maxSerialData[0].serial_number) {
        const parsed = parseInt(maxSerialData[0].serial_number, 10);
        if (!isNaN(parsed)) maxSerial = parsed;
      }

      // 3. Prepare N variants with incremented serials
      const variants = Array.from({ length: quantityNum }, (_, i) => ({
        id: uuidv4(),
        product_id: productId,
        size: newVariant.size,
        variant_sku: productForm.sku,
        location: newVariant.location,
        status: newVariant.status,
        date_added: newVariant.dateAdded,
        condition: newVariant.condition,
        serial_number: maxSerial + i + 1,
        size_label: newVariant.sizeLabel,
        cost_price: 0.00,
        user_id: session.user.id,
        isArchived: false,
        owner_type: newVariant.owner_type,
        consignor_id: newVariant.owner_type === 'consignor' ? newVariant.consignor_id : null,
      }));

      // 4. Insert all variants
      const { error: variantError } = await supabase
        .from('variants')
        .insert(variants);
      if (variantError) {
        throw new Error(variantError.message || 'Failed to add variants');
      }

      toast({
        title: "Product Added Successfully! 🎉",
        description: `Added ${quantityNum} ${quantityNum === 1 ? 'variant' : 'variants'} of "${productForm.name || productDataFromApi?.title || existingProductDetails?.name}" to your inventory.`,
      });
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />{" "}
            {isAddingToExistingProduct ? `Add Individual Shoes to ${existingProductDetails.name}` : "Add New Product"}
          </DialogTitle>
        </DialogHeader>

        {/* Variant Limits Display */}
        {variantLimits && (
          <div className="space-y-2">
            <div className={cn(
              "flex items-center justify-between p-3 rounded-lg border",
              variantLimits.remaining <= 10 ? "bg-red-50 border-red-200" :
              variantLimits.remaining <= 50 ? "bg-yellow-50 border-yellow-200" :
              "bg-blue-50 border-blue-200"
            )}>
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  variantLimits.remaining <= 10 ? "bg-red-500" :
                  variantLimits.remaining <= 50 ? "bg-yellow-500" :
                  "bg-blue-500"
                )} />
                <span className="text-sm font-medium">
                  Available Variants: {variantLimits.current.toLocaleString()} / {variantLimits.limit.toLocaleString()}
                </span>
                <span className="text-xs text-gray-600">
                  ({variantLimits.plan} Plan)
                </span>
              </div>
              <div className="text-xs text-gray-600">
                {variantLimits.remaining > 0 ? (
                  <span>{variantLimits.remaining.toLocaleString()} slots remaining</span>
                ) : (
                  <span className="text-red-600 font-medium">Limit reached</span>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-500 px-1">
              <strong>Note:</strong> Only "Available" status variants count towards your limit. Sold shoes don't affect your quota.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
          {/* Product Info Column */}
          <div className="md:col-span-2 space-y-4">
            <h3 className="text-lg font-semibold">Product Details</h3>
            <div className="flex items-center gap-4">
              <div className="relative">
                {imageLoading && (
                  <Skeleton className="w-[100px] h-[100px] rounded-md" />
                )}
                <Image
                  src={productForm.image || "/placeholder.svg"}
                  alt="Product Image"
                  width={100}
                  height={100}
                  className={cn(
                    "rounded-md object-cover border transition-opacity duration-200",
                    imageLoading ? "opacity-0 absolute inset-0" : "opacity-100"
                  )}
                  onLoad={() => setImageLoading(false)}
                  onError={() => setImageLoading(false)}
                />
              </div>
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
                value={productForm.sizeCategory || "Men's"}
                onValueChange={(value) => setProductForm((prev) => ({ ...prev, sizeCategory: value }))}
                disabled={isAddingToExistingProduct}
              >
                <SelectTrigger id="sizeCategory" className="w-full">
                  <SelectValue>{productForm.sizeCategory || "Men's"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Men's">Men's</SelectItem>
                  <SelectItem value="Women's">Women's</SelectItem>
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="originalPrice">Cost Price ({currencySymbol})</Label>
                <Input
                  id="originalPrice"
                  type="text"
                  value={displayPrices.originalPrice}
                  onChange={handleProductFormChange}
                  onFocus={() => handlePriceFocus("originalPrice")}
                  onBlur={() => handlePriceBlur("originalPrice")}
                  placeholder="0"
                  max={99999}
                />
              </div>
              <div>
                <Label htmlFor="salePrice">Sale Price ({currencySymbol})</Label>
                <Input
                  id="salePrice"
                  type="text"
                  value={displayPrices.salePrice}
                  onChange={handleProductFormChange}
                  onFocus={() => handlePriceFocus("salePrice")}
                  onBlur={() => handlePriceBlur("salePrice")}
                  placeholder="0"
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
              <h4 className="font-medium text-sm">Variant Details</h4>
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
                    <SelectItem value="Clothing">Clothing</SelectItem>
                    <SelectItem value="Standard">Standard</SelectItem>
                    <SelectItem value="Series">Series</SelectItem>
                    <SelectItem value="Limited">Limited</SelectItem>
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
                  </SelectContent>
                </Select>
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
              {/* Status is always 'Available' for new variants, so no UI needed */}
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
              <div>
                <Label htmlFor="quantity" className="text-xs">
                  Quantity
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  min={1}
                  max={variantLimits ? variantLimits.remaining : undefined}
                  value={newVariant.quantity}
                  onChange={handleNewVariantChange}
                  onBlur={(e) => {
                    if (e.target.value === "" || parseInt(e.target.value) < 1) {
                      setNewVariant(prev => ({ ...prev, quantity: 1 }))
                    }
                  }}
                  className={cn(
                    "text-xs",
                    variantLimits && (typeof newVariant.quantity === "string" ? parseInt(newVariant.quantity) || 0 : newVariant.quantity) > variantLimits.remaining
                      ? "border-red-300 focus:border-red-500"
                      : ""
                  )}
                />
                {variantLimits && (typeof newVariant.quantity === "string" ? parseInt(newVariant.quantity) || 0 : newVariant.quantity) > variantLimits.remaining && (
                  <p className="text-xs text-red-600 mt-1">
                    Cannot add {typeof newVariant.quantity === "string" ? parseInt(newVariant.quantity) || 0 : newVariant.quantity} variants. Only {variantLimits.remaining} available variant slots remaining on your {variantLimits.plan} plan. 
                    {variantLimits.remaining > 0 && (
                      <span className="block font-medium">
                        Please adjust your quantity to {variantLimits.remaining} or upgrade your plan.
                      </span>
                    )}
                  </p>
                )}
              </div>
              
              {/* Owner Type Selection */}
              <div>
                <Label htmlFor="owner_type" className="text-xs">
                  Owner
                </Label>
                <Select
                  value={newVariant.owner_type}
                  onValueChange={(value: 'store' | 'consignor') => {
                    setNewVariant((prev) => ({ 
                      ...prev, 
                      owner_type: value,
                      consignor_id: value === 'store' ? null : prev.consignor_id
                    }))
                  }}
                >
                  <SelectTrigger id="owner_type" className="w-full text-xs">
                    <SelectValue placeholder="Select owner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="store">You (Store Inventory)</SelectItem>
                    <SelectItem value="consignor">Consignor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Consignor Selection - only show if owner_type is 'consignor' */}
              {newVariant.owner_type === 'consignor' && (
                <div>
                  <Label htmlFor="consignor_id" className="text-xs">
                    Select Consignor
                  </Label>
                  
                  {consignors.length === 0 ? (
                    <div className="space-y-2">
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                        <p className="text-xs text-yellow-800 mb-2">
                          No consignors found. You need to add consignors before you can create consignment variants.
                        </p>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              onOpenChange(false); // Close the modal first
                              router.push('/consignors');
                            }}
                            className="flex-1 text-xs h-8"
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Add Consignors
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              await fetchConsignors();
                            }}
                            className="text-xs h-8 px-3"
                            title="Refresh consignors list"
                          >
                            <RefreshCw className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Select
                        value={newVariant.consignor_id?.toString() || ""}
                        onValueChange={(value) => setNewVariant((prev) => ({ ...prev, consignor_id: parseInt(value) }))}
                      >
                        <SelectTrigger id="consignor_id" className="w-full text-xs">
                          <SelectValue placeholder="Select consignor" />
                        </SelectTrigger>
                        <SelectContent>
                          {consignors.map((consignor) => (
                            <SelectItem key={consignor.id} value={consignor.id.toString()}>
                              <div className="flex flex-col">
                                <span className="font-medium">{consignor.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {consignor.commission_rate}% commission
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      {/* Commission Info Display */}
                      {newVariant.consignor_id && (
                        <div className="mt-2 p-2 bg-blue-50 rounded-md">
                          {(() => {
                            const selectedConsignor = consignors.find(c => c.id === newVariant.consignor_id);
                            if (!selectedConsignor) return null;
                            
                            const salePrice = typeof productForm.salePrice === "number" ? productForm.salePrice : parseFloat(productForm.salePrice) || 0;
                            const commissionAmount = (salePrice * selectedConsignor.commission_rate) / 100;
                            const storeAmount = salePrice - commissionAmount;
                            
                            return (
                              <div className="text-xs space-y-1">
                                <div className="font-medium text-blue-700">Commission Breakdown Sample:</div>
                                <div className="flex justify-between">
                                  <span>Sale Price:</span>
                                  <span>{formatCurrency(salePrice, currency)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Consignor ({selectedConsignor.commission_rate}%):</span>
                                  <span>{formatCurrency(commissionAmount, currency)}</span>
                                </div>
                                <div className="flex justify-between font-medium">
                                  <span>Store Cut:</span>
                                  <span>{formatCurrency(storeAmount, currency)}</span>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-end gap-2 py-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="px-6"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className={cn("px-6", isSubmitting && "opacity-50 cursor-not-allowed")}
            disabled={isSubmitting}
          >
            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Save Product"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
