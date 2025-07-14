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

// ✅ Fetch Active Products with Non-Archived Variants
export async function getProducts(): Promise<Product[]> {
  const cookieStore = cookies()
  const supabase = await createClient(cookieStore)

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    console.error("Error fetching user:", userError)
    return []
  }

  const { data: products, error } = await supabase
    .from("products")
    .select("*")
    .eq("user_id", user.id)
    .eq("isArchived", false)
    .order("name", { ascending: true })

  if (error || !products) {
    console.error("Error fetching products:", error)
    return []
  }

  const productsWithVariants = await Promise.all(
    products.map(async (product: { id: any; original_price: any }) => {
      const { data: variants, error: variantError } = await supabase
        .from("variants")
        .select("*")
        .eq("product_id", product.id)
        .eq("isArchived", false)
        .in("status", ["Available", "In Display", "Used"])
        .order("size", { ascending: true })
        .order("serial_number", { ascending: true })

      if (variantError || !variants) {
        console.error(`Error fetching variants for product ${product.id}:`, variantError)
        return { ...mapProductToCamelCase(product), variants: [] }
      }

      return {
        ...mapProductToCamelCase(product),
        variants: variants.map((variant: any) =>
          mapVariantToCamelCase(variant, product.original_price ?? 0)
        ),
      }
    })
  )

  return productsWithVariants
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

  const { data: products, error } = await supabase
    .from("products")
    .select("*")
    .eq("user_id", user.id)
    .eq("isArchived", true)
    .order("name", { ascending: true })

  if (error || !products) {
    console.error("Error fetching archived products:", error)
    return []
  }

  const productsWithVariants = await Promise.all(
    products.map(async (product: { id: any; original_price: any }) => {
      const { data: variants, error: variantError } = await supabase
        .from("variants")
        .select("*")
        .eq("product_id", product.id)
        .eq("isArchived", true)
        .order("size", { ascending: true })
        .order("serial_number", { ascending: true })

      if (variantError || !variants) {
        console.error(`Error fetching archived variants for product ${product.id}:`, variantError)
        return { ...mapProductToCamelCase(product), variants: [] }
      }

      return {
        ...mapProductToCamelCase(product),
        variants: variants.map((variant: any) =>
          mapVariantToCamelCase(variant, product.original_price ?? 0)
        ),
      }
    })
  )

  return productsWithVariants
}
