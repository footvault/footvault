"use client"
import { useState, ChangeEvent, useEffect } from "react"
import { useTransition } from "react"
import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
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
    serialNumber: string
  }
  const [variants, setVariants] = useState<Variant[]>([
    { size: "", location: "", status: "Available", serialNumber: "" }
  ])
  // Track serial number check status for each variant
  const [serialStatus, setSerialStatus] = useState<{[idx: number]: { loading: boolean, exists: boolean|null }}>(() => ({ 0: { loading: false, exists: null } }))
  const [isSaving, setIsSaving] = useState(false)
  const [showRequired, setShowRequired] = useState(false)

  const handleProductChange = (e: any) => {
    setProduct({ ...product, [e.target.name]: e.target.value })
  }
  const handleVariantChange = (idx: number, e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setVariants(prev => prev.map((variant, i) =>
      i === idx ? { ...variant, [name]: value } : variant
    ))
    // If serialNumber changed, check uniqueness
    if (name === "serialNumber") {
      checkSerialNumber(idx, value)
    }
  }

  // Live check for serial number uniqueness
  const checkSerialNumber = async (idx: number, serialNumber: string) => {
    if (!serialNumber) {
      setSerialStatus(prev => ({ ...prev, [idx]: { loading: false, exists: null } }))
      return
    }
    setSerialStatus(prev => ({ ...prev, [idx]: { loading: true, exists: null } }))
    try {
      // Get user session and access token
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setSerialStatus(prev => ({ ...prev, [idx]: { loading: false, exists: null } }))
        return
      }
      const res = await fetch("/api/check-serial-number", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ serialNumber }),
      })
      const data = await res.json()
      setSerialStatus(prev => ({ ...prev, [idx]: { loading: false, exists: data.success ? !data.isUnique : null } }))
    } catch {
      setSerialStatus(prev => ({ ...prev, [idx]: { loading: false, exists: null } }))
    }
  }

  // Run check on mount and when variants change (for all serials)
  useEffect(() => {
    variants.forEach((v, idx) => {
      if (v.serialNumber) checkSerialNumber(idx, v.serialNumber)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const addVariant = () => {
    // Prevent adding if last variant is incomplete
    const last = variants[variants.length - 1]
    if (!last.size || !last.location) {
      setShowRequired(true)
      toast({ title: "Required Fields", description: "Please fill in size and location for the last variant before adding another." })
      return
    }
    setShowRequired(false)
    setVariants([...variants, { size: "", location: "", status: "Available", serialNumber: "" }])
    setSerialStatus(prev => ({ ...prev, [variants.length]: { loading: false, exists: null } }))
  }
  const removeVariant = (idx: number) => {
    setVariants(variants.filter((_, i) => i !== idx))
  }

  const requiredFields: Array<keyof typeof product> = ["name", "brand", "sku", "category", "originalPrice", "salePrice", "status", "image", "sizeCategory"];
  const isProductMissing = requiredFields.some(field => !product[field]);
  const isVariantMissing = variants.some(v => !v.size || !v.location || !v.serialNumber);

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
          if (!v.size || !v.location || !v.serialNumber) {
            setIsSaving(false);
            return;
          }
        }
        // Check for duplicate serial numbers in the form
        const serialNumbers = variants.map(v => v.serialNumber).filter(sn => sn);
        const localDuplicates = serialNumbers.filter((sn, idx, arr) => arr.indexOf(sn) !== idx);
        if (localDuplicates.length > 0) {
          toast({ title: "Duplicate Serial Number", description: `Duplicate serial number(s) in form: ${[...new Set(localDuplicates)].join(", ")}` });
          setIsSaving(false);
          return;
        }

        // Get user session
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw new Error("Not authenticated");

        // Check for serial number uniqueness using API route
        if (serialNumbers.length > 0) {
          const taken: string[] = [];
          for (const sn of serialNumbers) {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            if (!token) {
              toast({ title: "Serial Number Check Failed", description: "Not authenticated." });
              setIsSaving(false);
              return;
            }
            const res = await fetch("/api/check-serial-number", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
              },
              body: JSON.stringify({ serialNumber: sn }),
            });
            const data = await res.json();
            if (!data.success) {
              toast({ title: "Serial Number Check Failed", description: data.error || "Could not check serial number." });
              setIsSaving(false);
              return;
            }
            if (!data.isUnique) taken.push(sn);
          }
          if (taken.length > 0) {
            toast({ title: "Duplicate Serial Number", description: `Serial number(s) already exist: ${taken.join(", ")}` });
            setIsSaving(false);
            return;
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
        if (variants && variants.length > 0) {
          const variantsToInsert = variants.map((v) => ({
            product_id: productId,
            size: v.size,
            location: v.location,
            status: v.status,
            serial_number: v.serialNumber,
            user_id: user.id,
          }));
          const { error: variantError } = await supabase
            .from("variants")
            .insert(variantsToInsert);
          if (variantError) throw new Error(variantError.message);
        }
        toast({ title: "Product Added", description: "Product saved to Supabase." });
        setProduct({ name: "", brand: "", sku: "", category: "", originalPrice: "", salePrice: "", status: "In Stock", image: "", sizeCategory: "US" });
        setVariants([{ size: "", location: "", status: "Available", serialNumber: "" }]);
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
              const status = serialStatus[idx] || { loading: false, exists: null }
              return (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end bg-gray-50 dark:bg-zinc-800 rounded-lg p-2">
                  <div className="flex flex-col">
                    <Input name="size" placeholder="Size" value={variant.size} onChange={e => handleVariantChange(idx, e)} required />
                    {showRequired && !variant.size && idx === variants.length - 1 && <span className="text-xs text-red-500 mt-1">Required</span>}
                  </div>
                  <div className="flex flex-col">
                    <Input name="location" placeholder="Location" value={variant.location} onChange={e => handleVariantChange(idx, e)} required />
                    {showRequired && !variant.location && idx === variants.length - 1 && <span className="text-xs text-red-500 mt-1">Required</span>}
                  </div>
                  <div className="flex flex-col">
                    <Input
                      name="serialNumber"
                      placeholder="Serial Number"
                      value={variant.serialNumber}
                      onChange={e => handleVariantChange(idx, e)}
                      required
                      className={
                        status.loading
                          ? "border-yellow-400 focus:border-yellow-500 focus:ring-yellow-500"
                          : status.exists === true
                          ? "border-red-500 focus:border-red-600 focus:ring-red-500"
                          : status.exists === false && variant.serialNumber
                          ? "border-green-500 focus:border-green-600 focus:ring-green-500"
                          : ""
                      }
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
