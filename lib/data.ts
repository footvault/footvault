"use server"

import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import type { Product } from "./utils/types"

// Helper function to map snake_case from DB to camelCase for components
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
  variants: [],
})

const mapVariantToCamelCase = (variant: any) => ({
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
})

export async function getProducts(): Promise<Product[]> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore)
  // Get current user
  const { data: { user }, error: userError } = await (await supabase).auth.getUser();
  if (userError || !user) {
    console.error("Error fetching user for products:", userError)
    return []
  }
  console.log("Current user id:", user.id); // Log user id
  // Fetch only products for this user
  const { data: products, error } = await (await supabase)
    .from("products")
    .select("*")
    .eq("user_id", user.id)
    .order("name", { ascending: true })

  if (error) {
    console.error("Error fetching products:", error)
    return []
  }
  console.log("Fetched products:", products);
  if (!products || products.length === 0) {
    console.warn("No products found for user:", user.id);
  }

  const productsWithVariants = await Promise.all(
    products.map(async (product) => {
      console.log("Fetching variants for product:", product.id, product.name);
      const { data: variants, error: variantError } = await (await supabase)
        .from("variants")
        .select("*")
        .eq("product_id", product.id)
        .in("status", ["Available", "In Display", "Used"]) // Filter for only these statuses
        .order("size", { ascending: true })
        .order("serial_number", { ascending: true })

      if (variantError) {
        console.error(`Error fetching variants for product ${product.id}:`, variantError)
        return { ...mapProductToCamelCase(product), variants: [] }
      }
      console.log(`Variants for product ${product.id}:`, variants);
      return {
        ...mapProductToCamelCase(product),
        variants: variants.map(mapVariantToCamelCase),
      }
    }),
  )

  console.log("Final productsWithVariants:", productsWithVariants);
   // @ts-ignore
  return productsWithVariants
}

export async function getProductById(productId: number): Promise<Product | null> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore)
  // Get current user
  const { data: { user }, error: userError } = await (await supabase).auth.getUser();
  if (userError || !user) {
    console.error("Error fetching user for product:", userError)
    return null
  }
  console.log("Current user id:", user.id); // Log user id
  // Fetch only product for this user
  const { data: product, error } = await (await supabase)
    .from("products")
    .select("*")
    .eq("id", productId)
    .eq("user_id", user.id)
    .single()

  if (error) {
    console.error(`Error fetching product ${productId}:`, error)
    return null
  }
  console.log("Fetched product:", product);

  const { data: variants, error: variantError } = await (await supabase)
    .from("variants")
    .select("*")
    .eq("product_id", productId)
    .in("status", ["Available", "In Display", "Used"]) // Filter for only these statuses
    .order("size", { ascending: true })
    .order("serial_number", { ascending: true })

  if (variantError) {
    console.error(`Error fetching variants for product ${productId}:`, variantError)
    return { ...mapProductToCamelCase(product), variants: [] }
  }
  console.log(`Variants for product ${productId}:`, variants);

  return {
    ...mapProductToCamelCase(product),
     // @ts-ignore
    variants: variants.map(mapVariantToCamelCase),
  }
}
