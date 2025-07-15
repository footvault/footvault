"use client"
import { useState, ChangeEvent, useEffect } from "react"
import { useTransition } from "react"
import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
    salePrice: "",
    status: "In Stock",
    image: "",
    sizeCategory: "Men's",
  })
  type Variant = {
    size: string
    location: string
    status: string
    quantity: number
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
        for (const v of variants) {
          const qty = parseInt(v.quantity as any, 10) || 1;
          for (let i = 0; i < qty; i++) {
            variantsToInsert.push({
              size: v.size,
              location: v.location,
              status: v.status,
              serial_number: String(nextSerial++),
              user_id: user.id,
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
        setProduct({ name: "", brand: "", sku: "", category: "", originalPrice: "", salePrice: "", status: "In Stock", image: "", sizeCategory: "US" });
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
    <Card className="mt-4 max-w-2xl mx-auto shadow-xl border-0 rounded-2xl bg-white dark:bg-zinc-900 max-h-[90vh] overflow-y-auto">
      <CardHeader className="flex flex-col items-center gap-2 pb-2">
        <CardTitle className="text-2xl font-bold text-center">Manual Add Product</CardTitle>
        <p className="text-sm text-gray-500 text-center">Fill in the details below to add a product and its variants.</p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-8 items-start w-full">
          {/* Image preview and input */}
          <div className="flex flex-col items-center w-full md:w-1/3 min-w-[180px]">
            <div className="w-40 h-40 rounded-xl border bg-gray-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden mb-2">
              {product.image ? (
                <Image src={product.image} alt="Product Image" width={160} height={160} className="object-cover w-full h-full" />
              ) : (
                <span className="text-gray-400">No Image</span>
              )}
            </div>
            <Input
              name="image"
              value={product.image}
              onChange={handleProductChange}
              placeholder="Image URL (https://...)"
              className="mt-1 text-xs"
              required={true}
            />
            <span className="text-xs text-gray-400 mt-1">Paste a direct image URL</span>
          </div>
          {/* Product details */}
          <div className="grid grid-cols-1 gap-3 w-full md:w-2/3 min-w-[200px]">
            <div>
              <label className="block text-xs font-medium mb-1">Product Name</label>
              <Input name="name" value={product.name} onChange={handleProductChange} placeholder="e.g. Nike Dunk Low" required />
              {showRequired && !product.name && <span className="text-xs text-red-500 mt-1">Required</span>}
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Brand</label>
              <Input name="brand" value={product.brand} onChange={handleProductChange} placeholder="e.g. Nike" required />
              {showRequired && !product.brand && <span className="text-xs text-red-500 mt-1">Required</span>}
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">SKU</label>
              <Input name="sku" value={product.sku} onChange={handleProductChange} placeholder="e.g. DD1391-100" required />
              {showRequired && !product.sku && <span className="text-xs text-red-500 mt-1">Required</span>}
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Category</label>
              <Input name="category" value={product.category} onChange={handleProductChange} placeholder="e.g. Sneakers" required />
              {showRequired && !product.category && <span className="text-xs text-red-500 mt-1">Required</span>}
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Size Category</label>
              <select
                name="sizeCategory"
                value={product.sizeCategory}
                onChange={handleProductChange}
                className="w-full rounded-md border px-3 py-2 text-sm bg-white dark:bg-zinc-900 dark:text-white"
              >
                <option value="Men's">Men's</option>
                <option value="Women's">Women's</option>
                <option value="Unisex">Unisex</option>
                <option value="Youth">Youth</option>
                <option value="Toddlers">Toddlers</option>
              </select>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs font-medium mb-1">Original Price</label>
                <Input name="originalPrice" value={product.originalPrice} onChange={handleProductChange} type="number" placeholder="0.00" required />
                {showRequired && !product.originalPrice && <span className="text-xs text-red-500 mt-1">Required</span>}
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium mb-1">Sale Price</label>
                <Input name="salePrice" value={product.salePrice} onChange={handleProductChange} type="number" placeholder="0.00" required />
                {showRequired && !product.salePrice && <span className="text-xs text-red-500 mt-1">Required</span>}
              </div>
            </div>
          </div>
        </div>
        {/* Variants Section */}
        <div className="mt-8">
          <h4 className="font-semibold mb-2 text-lg">Variants</h4>
          <div className="flex flex-col gap-2">
            {variants.map((variant, idx) => {
              return (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end bg-gray-50 dark:bg-zinc-800 rounded-lg p-2">
                  <div className="flex flex-col">
                    <div className="flex gap-2">
                      <Select
                        value={variant.size}
                        onValueChange={val => handleVariantChange(idx, { target: { name: "size", value: val } } as any)}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select Size" />
                        </SelectTrigger>
                        <SelectContent>
                          {getDynamicSizes(product.sizeCategory, sizeLabel).map(sizeOpt => (
                            <SelectItem key={sizeOpt} value={sizeOpt}>{sizeOpt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={sizeLabel}
                        onValueChange={val => setSizeLabel(val)}
                      >
                        <SelectTrigger style={{ minWidth: 60 }}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="US">US</SelectItem>
                          <SelectItem value="UK">UK</SelectItem>
                          <SelectItem value="EU">EU</SelectItem>
                          <SelectItem value="CM">CM</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {showRequired && !variant.size && idx === variants.length - 1 && <span className="text-xs text-red-500 mt-1">Required</span>}
                  </div>
                  <div className="flex flex-col">
                    <div className="flex gap-2 items-center">
                      <Select
                        value={variant.location}
                        onValueChange={val => handleVariantChange(idx, { target: { name: "location", value: val } } as any)}
                      >
                        <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select Location" />
                      </SelectTrigger>
                      <SelectContent>
                        {/* User's custom locations + placeholders */}
                        {customLocations.map(loc => (
                          <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                        ))}
                      </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="px-2 py-1"
                        onClick={() => setAddingLocationIdx(idx)}
                        disabled={addingLocationIdx === idx}
                      >
                        Add
                      </Button>
                    </div>
                    {/* Show add location input below if adding for this variant */}
                    {addingLocationIdx === idx && (
                      <div className="flex gap-2 mt-2">
                        <Input
                          value={newLocation}
                          onChange={e => setNewLocation(e.target.value)}
                          placeholder="New location name"
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            if (newLocation && !variants.some(v => v.location === newLocation)) {
                              // Set this variant's location to newLocation
                              setVariants(prev => prev.map((v, i) => i === idx ? { ...v, location: newLocation } : v));
                              setNewLocation("");
                              setAddingLocationIdx(null);
                            }
                          }}
                          disabled={!newLocation || variants.some(v => v.location === newLocation)}
                        >
                          Save
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => { setAddingLocationIdx(null); setNewLocation(""); }}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                    {showRequired && !variant.location && idx === variants.length - 1 && <span className="text-xs text-red-500 mt-1">Required</span>}
                  </div>
                  <div className="flex flex-col">
                    <Input
                      name="quantity"
                      type="number"
                      min={1}
                      value={variant.quantity}
                      onChange={e => handleVariantChange(idx, e)}
                      required
                      placeholder="Quantity"
                    />
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => removeVariant(idx)} disabled={variants.length === 1}>Remove</Button>
                </div>
              )
            })}
            <Button variant="outline" size="sm" onClick={addVariant} className="mt-2 self-start">Add Variant</Button>
          </div>
        </div>
        <div className="flex flex-col md:flex-row gap-2 mt-8 justify-end">
          <Button className="w-full md:w-auto" onClick={handleManualSave} disabled={isSaving || isPending || isProductMissing || isVariantMissing}>
            {isSaving || isPending ? "Saving..." : "Save Product"}
          </Button>
          {onClose && (
            <Button variant="outline" className="w-full md:w-auto" onClick={onClose}>Cancel</Button>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-4 text-center">This will save your product and variants directly to Supabase.</p>
      </CardContent>
    </Card>
  )
}
