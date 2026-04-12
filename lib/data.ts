"use server"

import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import type { Product } from "./utils/types"

// Map product fields to camelCase
const mapProductToCamelCase = (product: any) => ({
  id: product.id,
  name: product.name,
  brand: product.brand,
  sku: product.sku,
  category: product.category,
  originalPrice: product.original_price ?? 0,
  salePrice: product.sale_price ?? 0,
  status: product.status,
  image: product.image,
  sizeCategory: product.size_category,
  createdAt: product.created_at,
  updatedAt: product.updated_at,
  isArchived: product.isArchived ?? product.is_archived ?? false,
  variants: [],
})

// Map variant fields to camelCase
const mapVariantToCamelCase = (variant: any, productOriginalPrice: number) => ({
  id: variant.id,
  productId: variant.product_id,
  size: variant.size,
  sizeLabel: variant.size_label,
  variantSku: variant.variant_sku,
  location: variant.location,
  status: variant.status,
  dateAdded: variant.date_added,
  condition: variant.condition,
  serialNumber: variant.serial_number,
  costPrice: variant.cost_price ?? 0,
  createdAt: variant.created_at,
  updatedAt: variant.updated_at,
  productOriginalPrice,
})

// ✅ Fetch Active Products with Non-Archived Variants (optimized: single batch query)
export async function getProducts(): Promise<Product[]> {
  const cookieStore = cookies()
  const supabase = await createClient(cookieStore)

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    console.error("Error fetching user:", userError)
    return []
  }

  // Fetch products and all variants in parallel (2 queries instead of N+1)
  const [productsResult, variantsResult] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, brand, sku, category, original_price, sale_price, status, image, size_category, created_at, updated_at, isArchived, user_id")
      .eq("user_id", user.id)
      .eq("isArchived", false)
      .order("name", { ascending: true }),
    supabase
      .from("variants")
      .select("id, product_id, size, size_label, variant_sku, location, status, date_added, condition, serial_number, cost_price, created_at, updated_at")
      .eq("user_id", user.id)
      .eq("isArchived", false)
      .in("status", ["Available", "In Display", "Used"])
      .order("size", { ascending: true })
      .order("serial_number", { ascending: true })
      .range(0, 9999),
  ])

  if (productsResult.error || !productsResult.data) {
    console.error("Error fetching products:", productsResult.error)
    return []
  }

  // Group variants by product_id
  const variantsByProduct: Record<number, any[]> = {}
  if (variantsResult.data) {
    for (const v of variantsResult.data) {
      if (!variantsByProduct[v.product_id]) variantsByProduct[v.product_id] = []
      variantsByProduct[v.product_id].push(v)
    }
  }

  return productsResult.data.map((product: any) => ({
    ...mapProductToCamelCase(product),
    variants: (variantsByProduct[product.id] || []).map((variant: any) =>
      mapVariantToCamelCase(variant, product.original_price ?? 0)
    ),
  }))
}

export async function getProductById(productId: number): Promise<Product | null> {
  const cookieStore = cookies()
  const supabase = await createClient(cookieStore)

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    console.error("Error fetching user:", userError)
    return null
  }

  const { data: product, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .eq("user_id", user.id)
    .single()

  if (error || !product) {
    console.error(`Error fetching product ${productId}:`, error)
    return null
  }

  const { data: variants, error: variantError } = await supabase
    .from("variants")
    .select("*")
    .eq("product_id", productId)
    .eq("isArchived", false)
    .in("status", ["Available", "In Display", "Used"])
    .order("size", { ascending: true })
    .order("serial_number", { ascending: true })

  if (variantError || !variants) {
    console.error(`Error fetching variants for product ${productId}:`, variantError)
    return { ...mapProductToCamelCase(product), variants: [] }
  }

  return {
    ...mapProductToCamelCase(product),
    variants: variants.map((variant: any) =>
      mapVariantToCamelCase(variant, product.original_price ?? 0)
    ),
  }
}

//
// 🗂 ARCHIVED PRODUCTS FETCHER (for archive page)
//
export async function getArchivedProducts(): Promise<Product[]> {
  const cookieStore = cookies()
  const supabase = await createClient(cookieStore)

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    console.error("Error fetching user for archive:", userError)
    return []
  }

  // Fetch archived products and variants in parallel (2 queries instead of N+1)
  const [productsResult, variantsResult] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, brand, sku, category, original_price, sale_price, status, image, size_category, created_at, updated_at, isArchived, user_id")
      .eq("user_id", user.id)
      .eq("isArchived", true)
      .order("name", { ascending: true }),
    supabase
      .from("variants")
      .select("id, product_id, size, size_label, variant_sku, location, status, date_added, condition, serial_number, cost_price, created_at, updated_at")
      .eq("user_id", user.id)
      .eq("isArchived", true)
      .order("size", { ascending: true })
      .order("serial_number", { ascending: true })
      .range(0, 9999),
  ])

  if (productsResult.error || !productsResult.data) {
    console.error("Error fetching archived products:", productsResult.error)
    return []
  }

  // Group variants by product_id
  const variantsByProduct: Record<number, any[]> = {}
  if (variantsResult.data) {
    for (const v of variantsResult.data) {
      if (!variantsByProduct[v.product_id]) variantsByProduct[v.product_id] = []
      variantsByProduct[v.product_id].push(v)
    }
  }

  return productsResult.data.map((product: any) => ({
    ...mapProductToCamelCase(product),
    variants: (variantsByProduct[product.id] || []).map((variant: any) =>
      mapVariantToCamelCase(variant, product.original_price ?? 0)
    ),
  }))
}
