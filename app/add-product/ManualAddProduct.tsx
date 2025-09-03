"use client"
import { useState, ChangeEvent, useEffect } from "react"
import { v4 as uuidv4 } from "uuid"
import { useTransition } from "react"
import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import Image from "next/image"
import { toast } from "@/hooks/use-toast"

export function ManualAddProduct({ onProductAdded, onClose }: { onProductAdded?: () => void, onClose?: () => void }) {
  const supabase = createClient();
  const [isPending, startTransition] = useTransition()
  const [product, setProduct] = useState({
    name: "",
    brand: "",
    sku: "",
    category: "",
    originalPrice: "",
    salePrice: "0",
    status: "In Stock",
    image: "",
    sizeCategory: "Men's",
  })
  type Variant = {
    size: string
    location: string
    status: string
    quantity: number
    condition?: string
  }
  const [variants, setVariants] = useState<Variant[]>([
    { size: "", location: "", status: "Available", quantity: 1 }
  ])
  // For dynamic size label (US/UK/EU/CM)
  const [sizeLabel, setSizeLabel] = useState("US");
  // For location dropdown and add
  const [addingLocationIdx, setAddingLocationIdx] = useState<number|null>(null);
  const [newLocation, setNewLocation] = useState("");
  const [customLocations, setCustomLocations] = useState<string[]>([]);
  
  // Variant limits state
  const [variantLimits, setVariantLimits] = useState<{
    current: number
    limit: number
    remaining: number
    plan: string
  } | null>(null);
  const [loadingLimits, setLoadingLimits] = useState(false);

  // Fetch user custom locations from Supabase on mount
  useEffect(() => {
    const fetchLocations = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from("custom_locations")
        .select("name")
        .eq("user_id", user.id);
      let locs = (data || []).map((row: any) => row.name);
      // Add placeholder locations if not present
      ["Warehouse A", "Warehouse B", "Warehouse C"].forEach(ph => {
        if (!locs.includes(ph)) locs.push(ph);
      });
      setCustomLocations(locs);
    };
    fetchLocations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch variant limits on mount
  useEffect(() => {
    const fetchVariantLimits = async () => {
      setLoadingLimits(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const response = await fetch("/api/variant-limits", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setVariantLimits(result.data);
          }
        }
      } catch (error) {
        console.warn("Could not fetch variant limits:", error);
      } finally {
        setLoadingLimits(false);
      }
    };

    fetchVariantLimits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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
      case "T-Shirts":
        if (sizeLabel === "Clothing") {
          sizes.push("XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL")
        }
        break
      case "Figurines":
        if (sizeLabel === "Standard") {
          sizes.push("1/6 Scale", "1/12 Scale", "1/18 Scale", "1/24 Scale", "1/32 Scale", "1/64 Scale")
        } else if (sizeLabel === "Series") {
          sizes.push("Series 1", "Series 2", "Series 3", "Series 4", "Series 5", "Series 6", "Series 7", "Series 8", "Series 9", "Series 10")
        }
        break
      case "Collectibles":
        if (sizeLabel === "Standard") {
          sizes.push("Small", "Medium", "Large", "XL", "Jumbo")
        } else if (sizeLabel === "Series") {
          sizes.push("Common", "Uncommon", "Rare", "Ultra Rare", "Secret Rare", "Chase", "Grail")
        }
        break
      case "Pop Marts":
        if (sizeLabel === "Standard") {
          sizes.push("Regular", "Mini", "Large", "Mega")
        } else if (sizeLabel === "Series") {
          sizes.push("Series 1", "Series 2", "Series 3", "Series 4", "Series 5", "Series 6", "Series 7", "Series 8", "Series 9", "Series 10")
        } else if (sizeLabel === "Limited") {
          sizes.push("Regular", "Chase", "Secret", "Hidden", "Special Edition", "Convention Exclusive")
        }
        break
    }
    // Use a Set to ensure uniqueness before sorting
    return Array.from(new Set(sizes)).sort((a, b) => Number.parseFloat(a) - Number.parseFloat(b)) // Ensure numerical sort
  }
  // No serial status needed for auto serials
  const [isSaving, setIsSaving] = useState(false)
  const [showRequired, setShowRequired] = useState(false)

  const handleProductChange = (e: any) => {
    setProduct({ ...product, [e.target.name]: e.target.value })
  }
  const handleVariantChange = (idx: number, e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setVariants(prev => prev.map((variant, i) =>
      i === idx ? { ...variant, [name]: name === "quantity" ? Math.max(1, parseInt(value) || 1) : value } : variant
    ))
  }


  // No serial check needed for auto serials
  const addVariant = () => {
    // Prevent adding if last variant is incomplete
    const last = variants[variants.length - 1]
    if (!last.size || !last.location) {
      setShowRequired(true)
      toast({ title: "Required Fields", description: "Please fill in size and location for the last variant before adding another." })
      return
    }
    setShowRequired(false)
    setVariants([...variants, { size: "", location: "", status: "Available", quantity: 1 }])
  }
  const removeVariant = (idx: number) => {
    setVariants(variants.filter((_, i) => i !== idx))
  }

  const requiredFields: Array<keyof typeof product> = ["name", "brand", "sku", "category", "originalPrice", "salePrice", "status", "image", "sizeCategory"];
  const isProductMissing = requiredFields.some(field => !product[field]);
  const isVariantMissing = variants.some(v => !v.size || !v.location || !v.quantity);

  const handleManualSave = async () => {
    setShowRequired(true);
    if (isProductMissing || isVariantMissing) {
      toast({ title: "Missing Fields", description: "Please fill in all required fields before saving." });
      return;
    }
    setIsSaving(true)
    startTransition(async () => {
      try {
        // Validate all product fields (redundant, but keeps logic safe)
        for (const field of requiredFields) {
          if (!product[field]) {
            setIsSaving(false);
            return;
          }
        }
        for (let i = 0; i < variants.length; i++) {
          const v = variants[i];
          if (!v.size || !v.location || !v.quantity) {
            setIsSaving(false);
            return;
          }
        }

        // Get user session
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw new Error("Not authenticated");

        // Get session for API authentication
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) throw new Error("Authentication required");

        // Calculate total variants to be added
        const totalVariantsToAdd = variants.reduce((sum, v) => {
          return sum + (parseInt(v.quantity as any, 10) || 1);
        }, 0);

        // Check variant limits before proceeding
        try {
          const variantLimitResponse = await fetch("/api/variant-limits", {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          });
          const variantLimitData = await variantLimitResponse.json();
          
          if (variantLimitData.success) {
            if (variantLimitData.data.current + totalVariantsToAdd > variantLimitData.data.limit) {
              const remaining = variantLimitData.data.remaining;
              toast({
                title: "Variant Limit Exceeded",
                description: remaining === 0 
                  ? `Variant limit reached. Your ${variantLimitData.data.plan} plan allows up to ${variantLimitData.data.limit.toLocaleString()} available variants. You currently have ${variantLimitData.data.current.toLocaleString()} available variants. Please upgrade your plan to add more variants.`
                  : `Variant limit exceeded. Your ${variantLimitData.data.plan} plan allows up to ${variantLimitData.data.limit.toLocaleString()} available variants. You currently have ${variantLimitData.data.current.toLocaleString()} available variants and are trying to add ${totalVariantsToAdd} more. Only ${remaining} slots remaining. Please adjust your quantities to ${remaining} total or upgrade your plan.`,
                variant: "destructive",
              });
              setIsSaving(false);
              return;
            }
          }
        } catch (limitError) {
          console.warn("Could not check variant limits:", limitError);
          // Continue with submission if limit check fails
        }

        // Get the highest serial_number for this user
        const { data: maxSerialData } = await supabase
          .from("variants")
          .select("serial_number")
          .eq("user_id", user.id)
          .order("serial_number", { ascending: false })
          .limit(1)
          .maybeSingle();

        let nextSerial = 1;
        if (maxSerialData && maxSerialData.serial_number) {
          const last = parseInt(maxSerialData.serial_number, 10);
          nextSerial = isNaN(last) ? 1 : last + 1;
        }

        // For each variant row, create N variants (N = quantity)
        let variantsToInsert: any[] = [];
        const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
        for (const v of variants) {
          const qty = parseInt(v.quantity as any, 10) || 1;
          for (let i = 0; i < qty; i++) {
            variantsToInsert.push({
              id: uuidv4(),
              size: v.size,
              location: v.location,
              status: v.status,
              serial_number: nextSerial++,
              user_id: user.id,
              variant_sku: product.sku,
              date_added: today,
              condition: v.condition || null,
              size_label: sizeLabel,
              cost_price: 0.00,
              isArchived: false,
              // product_id will be set below
            });
          }
        }

        // Check if product exists
        const { data: existingProduct, error: checkError } = await supabase
          .from("products")
          .select("id, sku")
          .eq("sku", product.sku)
          .eq("user_id", user.id)
          .single();
        let productId;
        if (!existingProduct) {
          // Insert product
          const { data: insertedProduct, error: productError } = await supabase
            .from("products")
            .insert([
              {
                name: product.name,
                brand: product.brand,
                sku: product.sku,
                category: product.category,
                original_price: product.originalPrice,
                sale_price: product.salePrice,
                status: product.status,
                image: product.image,
                size_category: product.sizeCategory,
                user_id: user.id,
              },
            ])
            .select()
            .single();
          if (productError) throw new Error(productError.message);
          productId = insertedProduct.id;
        } else {
          productId = existingProduct.id;
        }
        // Insert variants
        if (variantsToInsert.length > 0) {
          variantsToInsert = variantsToInsert.map(v => ({ ...v, product_id: productId }));
          const { error: variantError } = await supabase
            .from("variants")
            .insert(variantsToInsert);
          if (variantError) throw new Error(variantError.message);
        }
        toast({ title: "Product Added", description: "Product saved to Supabase." });
        setProduct({ name: "", brand: "", sku: "", category: "", originalPrice: "", salePrice: "0", status: "In Stock", image: "", sizeCategory: "US" });
        setVariants([{ size: "", location: "", status: "Available", quantity: 1 }]);
        if (onProductAdded) onProductAdded();
        if (onClose) onClose();
      } catch (e: any) {
        toast({ title: "Error", description: e.message || "Could not save to Supabase." });
      } finally {
        setIsSaving(false);
      }
    });
  };

  return (
    <Card className="mt-4 max-w-lg mx-auto shadow-xl border-0 rounded-2xl bg-white dark:bg-zinc-900 max-h-[90vh] overflow-y-auto">
      <CardHeader className="flex flex-col items-center gap-2 pb-4">
        <CardTitle className="text-2xl font-bold text-center">Add New Product</CardTitle>
        <p className="text-sm text-gray-500 text-center">Fill in the details below to add a product to your inventory.</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-6">
          {/* Product Image */}
          <div>
            <label className="block text-sm font-medium mb-2">Product Image</label>
            <div className="w-32 h-32 rounded-xl border-2 border-dashed border-gray-300 dark:border-zinc-600 bg-gray-50 dark:bg-zinc-800 flex items-center justify-center overflow-hidden mb-2">
              {product.image ? (
                <Image src={product.image} alt="Product Image" width={128} height={128} className="object-contain w-full h-full rounded-xl bg-white" />
              ) : (
                <div className="text-center text-gray-400">
                  <div className="text-3xl mb-1">📷</div>
                  <div className="text-xs">No Image</div>
                </div>
              )}
            </div>
            <Input
              name="image"
              value={product.image}
              onChange={handleProductChange}
              placeholder="Paste image URL here..."
              className="text-sm"
              required={true}
            />
            {showRequired && !product.image && <span className="text-xs text-red-500">Image URL is required</span>}
          </div>

          {/* Product Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Product Name *</label>
              <Input 
                name="name" 
                value={product.name} 
                onChange={handleProductChange} 
                placeholder="e.g. Nike Dunk Low" 
                className="text-sm"
                required 
              />
              {showRequired && !product.name && <span className="text-xs text-red-500 mt-1">Required field</span>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Brand *</label>
              <Input 
                name="brand" 
                value={product.brand} 
                onChange={handleProductChange} 
                placeholder="e.g. Nike" 
                className="text-sm"
                required 
              />
              {showRequired && !product.brand && <span className="text-xs text-red-500 mt-1">Required field</span>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">SKU *</label>
              <Input 
                name="sku" 
                value={product.sku} 
                onChange={handleProductChange} 
                placeholder="e.g. DD1391-100" 
                className="text-sm"
                required 
              />
              {showRequired && !product.sku && <span className="text-xs text-red-500 mt-1">Required field</span>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Category *</label>
              <Input 
                name="category" 
                value={product.category} 
                onChange={handleProductChange} 
                placeholder="e.g. Sneakers" 
                className="text-sm"
                required 
              />
              {showRequired && !product.category && <span className="text-xs text-red-500 mt-1">Required field</span>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Size Category *</label>
              <Select
                value={product.sizeCategory}
                onValueChange={val => setProduct(prev => ({ ...prev, sizeCategory: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Size Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Men's">Men's</SelectItem>
                  <SelectItem value="Women's">Women's</SelectItem>
                  <SelectItem value="Unisex">Unisex</SelectItem>
                  <SelectItem value="Youth">Youth</SelectItem>
                  <SelectItem value="Toddlers">Toddlers</SelectItem>
                  <SelectItem value="T-Shirts">T-Shirts</SelectItem>
                  <SelectItem value="Figurines">Figurines</SelectItem>
                  <SelectItem value="Collectibles">Collectibles</SelectItem>
                  <SelectItem value="Pop Marts">Pop Marts</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Original Price *</label>
              <Input 
                name="originalPrice" 
                value={product.originalPrice} 
                onChange={handleProductChange} 
                type="number" 
                step="0.01"
                placeholder="0.00" 
                className="text-sm"
                required 
              />
              {showRequired && !product.originalPrice && <span className="text-xs text-red-500 mt-1">Required field</span>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Sale Price *</label>
              <Input 
                name="salePrice" 
                value={product.salePrice} 
                onChange={handleProductChange} 
                type="number" 
                step="0.01"
                placeholder="0.00" 
                className="text-sm"
                required 
              />
              {showRequired && !product.salePrice && <span className="text-xs text-red-500 mt-1">Required field</span>}
            </div>
          </div>

          {/* Inventory Details (Size, Location, Quantity) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
            <div>
              <label className="block text-sm font-medium mb-2">Size Label *</label>
              <Select
                value={sizeLabel}
                onValueChange={val => {
                  setSizeLabel(val);
                  // Reset size if label changes
                  setVariants(prev => prev.map((v, i) => i === 0 ? { ...v, size: "" } : v));
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Size Label" />
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
              <label className="block text-sm font-medium mb-2">Size *</label>
              <Select
                value={variants[0].size}
                onValueChange={val => handleVariantChange(0, { target: { name: 'size', value: val } } as any)}
                disabled={!sizeLabel || !product.sizeCategory}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Size" />
                </SelectTrigger>
                <SelectContent>
                  {getDynamicSizes(product.sizeCategory, sizeLabel).length > 0 ? (
                    getDynamicSizes(product.sizeCategory, sizeLabel).map(sizeOpt => (
                      <SelectItem key={sizeOpt} value={sizeOpt}>{sizeOpt}</SelectItem>
                    ))
                  ) : (
                    <SelectItem value="placeholder-size-select" disabled>
                      Select Size Label & Category First
                    </SelectItem>
                  )}
                  <SelectItem value="custom-size-input">Custom Size...</SelectItem>
                </SelectContent>
              </Select>
              {variants[0].size === "custom-size-input" && (
                <Input
                  placeholder="Enter custom size"
                  value={variants[0].size === "custom-size-input" ? "" : variants[0].size}
                  onChange={e => handleVariantChange(0, { target: { name: 'size', value: e.target.value } } as any)}
                  className="mt-2 text-xs"
                />
              )}
              {showRequired && !variants[0].size && <span className="text-xs text-red-500 mt-1">Required field</span>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Location *</label>
              <Select
                value={variants[0].location}
                onValueChange={val => handleVariantChange(0, { target: { name: 'location', value: val } } as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Location" />
                </SelectTrigger>
                <SelectContent>
                  {customLocations.map(loc => (
                    <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {showRequired && !variants[0].location && <span className="text-xs text-red-500 mt-1">Required field</span>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Quantity *</label>
              <Input
                name="quantity"
                type="number"
                min={1}
                value={variants[0].quantity}
                onChange={e => handleVariantChange(0, e)}
                placeholder="1"
                className="text-sm"
                required
              />
            </div>
          </div>
          
          {/* Variant Limits Visual Indicator */}
          {loadingLimits ? (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="w-full h-2 rounded-full" />
              <div className="p-3 rounded-lg border bg-gray-50">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-3 w-full mt-2" />
              </div>
            </div>
          ) : variantLimits ? (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Variant Usage:</span>
                <span className="text-muted-foreground">
                  {variantLimits.current.toLocaleString()} / {variantLimits.limit.toLocaleString()} used
                </span>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    variantLimits.current / variantLimits.limit >= 0.9 
                      ? 'bg-red-500' 
                      : variantLimits.current / variantLimits.limit >= 0.7 
                      ? 'bg-yellow-500' 
                      : 'bg-green-500'
                  }`}
                  style={{
                    width: `${Math.min((variantLimits.current / variantLimits.limit) * 100, 100)}%`
                  }}
                />
              </div>
              
              {/* Impact Indicator */}
              {variants.length > 0 && variants[0].quantity > 0 && (
                <div className={`p-3 rounded-lg border ${
                  variants[0].quantity > variantLimits.remaining
                    ? 'bg-red-50 border-red-200 text-red-800'
                    : variantLimits.remaining <= 10
                    ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                    : 'bg-green-50 border-green-200 text-green-800'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Adding {variants[0].quantity} variant{variants[0].quantity !== 1 ? 's' : ''}
                    </span>
                    <span className="text-xs">
                      {Math.max(0, variantLimits.remaining - variants[0].quantity)} slot{Math.max(0, variantLimits.remaining - variants[0].quantity) !== 1 ? 's' : ''} remaining
                    </span>
                  </div>
                  {variants[0].quantity > variantLimits.remaining && (
                    <p className="text-xs mt-1">
                      Exceeds limit by {variants[0].quantity - variantLimits.remaining}. 
                      Please reduce quantity or upgrade your {variantLimits.plan} plan.
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t">
          <div className="flex-1">
            <p className="text-sm text-gray-500 mb-2">
              Ready to save? Make sure all required fields are filled out.
            </p>
           
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:w-auto w-full">
            {onClose && (
              <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
                Cancel
              </Button>
            )}
            <Button 
              onClick={handleManualSave} 
              disabled={isSaving || isPending || isProductMissing || isVariantMissing}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
            >
              {isSaving || isPending ? "Saving..." : "Save Product"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
