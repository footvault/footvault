"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server" // Import createAdminClient
import { v4 as uuidv4 } from "uuid" // For generating unique IDs
import { getProducts as getProductsFromLib } from "@/lib/data" // Import getProducts from lib/data
import { format } from "date-fns"
import type {
  Product,
  Variant,
  CustomLocation,
  Sale,
  SaleItem,
  ProfitDistributionTemplate,
  SalesStats,
  SaleProfitDistribution,
  ProfitDistributionTemplateDetail,
  ProductVariant,
  Avatar,
} from "@/lib/types"
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js"
import { searchKicksDev } from "@/lib/searchKickDevs"
import { cookies } from "next/headers"

const KICKS_DEV_API_KEY = process.env.KICKS_DEV_API_KEY
const KICKS_DEV_BASE_URL = "https://api.kicks.dev/v3/stockx"

interface KicksDevProduct {
  id: string
  title: string
  brand: string
  model: string
  description: string
  image: string
  sku: string
  slug: string
  category: string
  secondary_category: string
  gallery: string[]
  min_price: number
  avg_price: number
  max_price: number
  traits: Array<{ trait: string; value: string }>
  variants: Array<{
    id: string
    size: string
    size_type: string
    lowest_ask: number
    total_asks: number
    previous_lowest_ask: number
    sizes: Array<{ size: string; size_type: string }>
  }>
}

export interface KicksDevSearchItem {
  id: string
  title: string
  image: string
  brand: string
  sku: string
  category: string
}

// Helper function to get Supabase client
const getSupabaseClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase URL or Key is not set in environment variables.")
  }

  return createClient({
    supabaseUrl,
    supabaseKey,
  })
}

export async function fetchKicksDevProduct(
  id: string,
): Promise<{ success: boolean; data?: KicksDevProduct; error?: string }> {
  if (!KICKS_DEV_API_KEY) {
    return { success: false, error: "KICKS_DEV_API_KEY is not set." }
  }
  if (!id) {
    return { success: false, error: "Product ID cannot be empty." }
  }

  try {
    const response = await fetch(`${KICKS_DEV_BASE_URL}/products/${encodeURIComponent(id)}`, {
      method: "GET",
      headers: {
        Authorization: KICKS_DEV_API_KEY,
        "Content-Type": "application/json",
      },
      next: { revalidate: 3600 }, // Cache for 1 hour
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Kicks.dev product API error: ${response.status} - ${errorText}`)
      return { success: false, error: `Failed to fetch product details: ${response.statusText}` }
    }

    const result = await response.json()
    if (result.status === "success" && result.data) {
      return { success: true, data: result.data }
    } else {
      return { success: false, error: result.message || "Unexpected API response format." }
    }
  } catch (e: any) {
    console.error("Error calling Kicks.dev product details API:", e)
    return { success: false, error: `Network error: ${e.message}` }
  }
}

// Helper to convert camelCase to snake_case for database insertion
const toSnakeCase = (obj: any) => {
  const newObj: any = {}
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const snakeKey = key.replace(/([A-Z])/g, "_$1").toLowerCase()
      newObj[snakeKey] = obj[key]
    }
  }
  return newObj
}

// New action to add a custom location
export async function addCustomLocation(locationName: string) {
  const supabase = createAdminClient() // Use admin client for adding locations
  try {
    const { data, error } = await supabase.from("custom_locations").insert({ name: locationName }).select().single()

    if (error) {
      console.error("Error adding custom location:", error)
      return { success: false, error: error.message }
    }
    // Removed revalidatePath("/add-product") to prevent full page refresh
    return { success: true, data }
  } catch (e: any) {
    console.error("Exception adding custom location:", e)
    return { success: false, error: e.message }
  }
}

// New action to get custom locations
export async function getCustomLocations() {
  const supabase = await getSupabaseClient() // Use regular client for fetching locations
 // Use regular client for fetching locations
  try {
    const { data, error } = await supabase.from("custom_locations").select("name").order("name", { ascending: true })

    if (error) {
      console.error("Error fetching custom locations:", error)
      return { success: false, error: error.message }
    }
    return { success: true, data: data.map((item) => item.name) }
  } catch (e: any) {
    console.error("Exception fetching custom locations:", e)
    return { success: false, error: e.message }
  }
}

/**
 * Checks if a serial number already exists in the variants table.
 * @param serialNumber The serial number to check.
 * @returns An object indicating if it's unique and any error.
 */
export async function checkSerialNumberUniqueness(
  serialNumber: string,
): Promise<{ isUnique: boolean; error?: string }> {
  const supabase = await getSupabaseClient() // Use regular client for checking uniqueness (RLS should allow SELECT)
 // Use regular client for checking uniqueness (RLS should allow SELECT)
  try {
    const { data, error } = await supabase
      .from("variants")
      .select("serial_number")
      .eq("serial_number", serialNumber)
      .limit(1)

    if (error) {
      console.error("Error checking serial number uniqueness:", error)
      return { isUnique: false, error: error.message }
    }

    return { isUnique: data.length === 0 }
  } catch (e: any) {
    console.error("Exception checking serial number uniqueness:", e)
    return { isUnique: false, error: e.message }
  }
}

/**
 * Updates the status and location of a single variant.
 * @param variantId The ID of the variant to update.
 * @param newStatus The new status for the variant.
 * @param newLocation The new location for the variant.
 */
export async function updateVariantStatusAndLocation(variantId: string, newStatus: string, newLocation: string) {
  const supabase = createAdminClient() // Use admin client for updating variants

  try {
    const { data, error } = await supabase
      .from("variants")
      .update({
        status: newStatus,
        location: newLocation,
        updated_at: new Date().toISOString(),
      })
      .eq("id", variantId)
      .select()

    if (error) {
      console.error("Error updating variant:", error)
      return { success: false, error: error.message }
    }

    revalidatePath("/")
    return { success: true, data }
  } catch (e: any) {
    console.error("Exception updating variant:", e)
    return { success: false, error: e.message }
  }
}

/**
 * Adds a single new variant to an existing product.
 * @param productId The ID of the product to add the variant to.
 * @param variantData The data for the new variant.
 */
export async function addVariant(productId: number, variantData: any) {
  const supabase = createAdminClient() // Use admin client for adding single variant

  try {
    const variantToInsert = {
      ...toSnakeCase(variantData),
      id: uuidv4(), // Generate a unique ID for the new variant
      product_id: productId,
      date_added: variantData.dateAdded || new Date().toISOString().split("T")[0],
      serial_number: variantData.serialNumber || `SN-${uuidv4().slice(0, 8).toUpperCase()}`,
      variant_sku: variantData.variantSku || `VAR-${uuidv4().slice(0, 4).toUpperCase()}`,
    }

    const { data, error } = await supabase.from("variants").insert(variantToInsert).select().single()

    if (error) {
      console.error("Error adding variant:", error)
      return { success: false, error: error.message }
    }

    revalidatePath("/")
    return { success: true, data }
  } catch (e: any) {
    console.error("Exception adding variant:", e)
    return { success: false, error: e.message }
  }
}

/**
 * Adds a new product and its initial variants.
 * If a product with the same SKU exists, it updates the product details and adds the new variants.
 * @param productData The data for the product.
 * @param variantsData An array of variant data to add.
 */
export async function addProduct(productData: any, variantsData: any[]) {
  const supabase = createAdminClient() // Use admin client for product and variant operations

  try {
    // 1. Check if a product with the given SKU already exists
    const { data: existingProduct, error: fetchError } = await supabase
      .from("products")
      .select("id")
      .eq("sku", productData.sku)
      .single()

    if (fetchError && fetchError.code !== "PGRST116") {
      // PGRST116 means "No rows found", which is expected if product doesn't exist
      console.error("Error checking for existing product:", fetchError)
      return { success: false, error: fetchError.message }
    }

    let targetProductId: number
    let productAction: "inserted" | "updated"

    if (existingProduct) {
      // Product exists, update its details and use its ID
      targetProductId = existingProduct.id
      productAction = "updated"
      const { error: updateError } = await supabase
        .from("products")
        .update(toSnakeCase(productData)) // Update product details
        .eq("id", targetProductId)

      if (updateError) {
        console.error("Error updating existing product:", updateError)
        return { success: false, error: updateError.message }
      }
    } else {
      // Product does not exist, insert a new one
      productAction = "inserted"
      const { data: newProduct, error: productError } = await supabase
        .from("products")
        .insert(toSnakeCase(productData))
        .select("id")
        .single()

      if (productError) {
        console.error("Error adding new product:", productError)
        return { success: false, error: productError.message }
      }
      targetProductId = newProduct.id
    }

    // 2. Prepare and insert variants
    const variantsToInsert = variantsData.map((variant) => {
      const { tempId, ...rest } = variant // Destructure to exclude tempId
      return {
        ...toSnakeCase(rest), // Convert remaining properties to snake_case
        id: uuidv4(), // Generate a unique ID for each new variant
        product_id: targetProductId, // Link to the existing or newly inserted product
        date_added: variant.dateAdded || new Date().toISOString().split("T")[0],
        serial_number: variant.serialNumber || `SN-${uuidv4().slice(0, 8).toUpperCase()}`,
        variant_sku: variant.variantSku || `${productData.sku}-${variant.size}-${uuidv4().slice(0, 4).toUpperCase()}`,
      }
    })

    const { error: variantsError } = await supabase.from("variants").insert(variantsToInsert)

    if (variantsError) {
      console.error("Error adding variants:", variantsError)
      // Consider rolling back product insertion if variants fail, though for now, we'll just report the error.
      return { success: false, error: variantsError.message }
    }

    revalidatePath("/")
    return { success: true, data: { productId: targetProductId, productAction } }
  } catch (e: any) {
    console.error("Exception adding product:", e)
    return { success: false, error: e.message }
  }
}

/**
 * Fetches a product by its SKU, including its variants.
 * @param sku The SKU of the product to fetch.
 * @returns An object containing the product data and its variants, or an error.
 */
export async function getProductBySku(sku: string) {
  const supabase = await getSupabaseClient() // Use regular client for fetching
 // Use regular client for fetching

  try {
    const { data: product, error: productError } = await supabase.from("products").select("*").eq("sku", sku).single()

    if (productError && productError.code !== "PGRST116") {
      // PGRST116 means "No rows found", which is expected if product doesn't exist
      console.error("Error fetching product by SKU:", productError)
      return { success: false, error: productError.message }
    }

    if (!product) {
      return { success: false, error: "Product not found." }
    }

    const { data: variants, error: variantsError } = await supabase
      .from("variants")
      .select("*")
      .eq("product_id", product.id)
      .order("size", { ascending: true })
      .order("serial_number", { ascending: true })

    if (variantsError) {
      console.error(`Error fetching variants for product ${product.id}:`, variantsError)
      return { success: false, error: variantsError.message }
    }

    // Map to camelCase for consistency with frontend components
    const mapProductToCamelCase = (p: any) => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
      sku: p.sku,
      category: p.category,
      originalPrice: p.original_price,
      salePrice: p.sale_price,
      status: p.status,
      image: p.image,
      sizeCategory: p.size_category,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    })

    const mapVariantToCamelCase = (v: any) => ({
      id: v.id,
      productId: v.product_id,
      size: v.size,
      sizeLabel: v.size_label,
      variantSku: v.variant_sku,
      location: v.location,
      status: v.status,
      dateAdded: v.date_added,
      condition: v.condition,
      serialNumber: v.serial_number,
      costPrice: v.cost_price, // Include cost_price
      createdAt: v.created_at,
      updatedAt: v.updated_at,
    })

    return {
      success: true,
      data: {
        ...mapProductToCamelCase(product),
        variants: variants.map(mapVariantToCamelCase),
      },
    }
  } catch (e: any) {
    console.error("Exception fetching product by SKU:", e)
    return { success: false, error: e.message }
  }
}

/**
 * Deletes a product by its ID.
 * Due to CASCADE DELETE, associated variants will also be removed.
 * @param productId The ID of the product to delete.
 */
export async function deleteProduct(productId: number) {
  const supabase = createAdminClient() // Use admin client for deleting products

  try {
    const { error } = await supabase.from("products").delete().eq("id", productId)

    if (error) {
      console.error("Error deleting product:", error)
      return { success: false, error: error.message }
    }

    revalidatePath("/")
    return { success: true }
  } catch (e: any) {
    console.error("Exception deleting product:", e)
    return { success: false, error: e.message }
  }
}

/**
 * Deletes multiple variants by their IDs.
 * @param variantIds An array of variant IDs to delete.
 */
export async function deleteVariants(variantIds: string[]) {
  const supabase = createAdminClient() // Use admin client for deleting variants

  try {
    const { error } = await supabase.from("variants").delete().in("id", variantIds)

    if (error) {
      console.error("Error deleting variants:", error)
      return { success: false, error: error.message }
    }

    revalidatePath("/")
    return { success: true }
  } catch (e: any) {
    console.error("Exception deleting variants:", e)
    return { success: false, error: e.message }
  }
}

/**
 * Performs a bulk update of status for multiple variants.
 * @param variantIds An array of variant IDs to update.
 * @param newStatus The new status to set for all selected variants.
 */
export async function bulkUpdateVariantStatus(variantIds: string[], newStatus: string) {
  const supabase = createAdminClient() // Use admin client for bulk updates

  try {
    const { error } = await supabase
      .from("variants")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .in("id", variantIds)

    if (error) {
      console.error("Error bulk updating variant status:", error)
      return { success: false, error: error.message }
    }

    revalidatePath("/")
    return { success: true }
  } catch (e: any) {
    console.error("Exception bulk updating variant status:", e)
    return { success: false, error: e.message }
  }
}

/**
 * Performs a bulk update of location for multiple variants.
 * @param variantIds An array of variant IDs to update.
 * @param newLocation The new location to set for all selected variants.
 */
export async function bulkMoveVariantLocation(variantIds: string[], newLocation: string) {
  const supabase = createAdminClient() // Use admin client for bulk moves

  try {
    const { error } = await supabase
      .from("variants")
      .update({ location: newLocation, updated_at: new Date().toISOString() })
      .in("id", variantIds)

    if (error) {
      console.error("Error bulk moving variant location:", error)
      return { success: false, error: error.message }
    }

    revalidatePath("/")
    return { success: true }
  } catch (e: any) {
    console.error("Exception bulk moving variant location:", e)
    return { success: false, error: e.message }
  }
}

/**
 * Marks multiple variants as 'Used' (or 'Sold').
 * @param variantIds An array of variant IDs to mark as sold.
 */
export async function markVariantsAsSold(variantIds: string[]) {
  return bulkUpdateVariantStatus(variantIds, "Used") // Using 'Used' as 'Sold' for now based on schema
}

/**
 * Marks multiple variants as 'In Display' (or 'Reserved').
 * @param variantIds An array of variant IDs to mark as reserved.
 */
export async function markVariantsAsReserved(variantIds: string[]) {
  return bulkUpdateVariantStatus(variantIds, "In Display") // Using 'In Display' as 'Reserved' for now based on schema
}

/**
 * Duplicates a product and all its associated variants.
 * Generates new unique IDs and SKUs for the duplicated items.
 * @param productId The ID of the product to duplicate.
 */
export async function duplicateProduct(productId: number) {
  const supabase = createAdminClient() // Use admin client for duplication

  try {
    // 1. Fetch the original product and its variants
    const { data: originalProduct, error: productFetchError } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .single()

    if (productFetchError || !originalProduct) {
      console.error("Error fetching original product for duplication:", productFetchError)
      return { success: false, error: productFetchError?.message || "Product not found." }
    }

    const { data: originalVariants, error: variantsFetchError } = await supabase
      .from("variants")
      .select("*")
      .eq("product_id", productId)

    if (variantsFetchError) {
      console.error("Error fetching original variants for duplication:", variantsFetchError)
      return { success: false, error: variantsFetchError.message }
    }

    // 2. Create data for the new product
    const newProductData = {
      ...originalProduct,
      id: undefined, // Let Supabase generate new ID
      name: `Copy of ${originalProduct.name}`,
      sku: `${originalProduct.sku}-COPY-${uuidv4().slice(0, 4).toUpperCase()}`, // New unique SKU
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    delete newProductData.created_at // Remove auto-generated fields for insert
    delete newProductData.updated_at

    const { data: duplicatedProduct, error: insertProductError } = await supabase
      .from("products")
      .insert(toSnakeCase(newProductData))
      .select()
      .single()

    if (insertProductError) {
      console.error("Error inserting duplicated product:", insertProductError)
      return { success: false, error: insertProductError.message }
    }

    // 3. Create data for the new variants
    const duplicatedVariantsData = originalVariants.map((variant: { variant_sku: any }) => ({
      ...variant,
      id: uuidv4(), // New unique variant ID
      product_id: duplicatedProduct.id,
      variant_sku: `${variant.variant_sku}-COPY-${uuidv4().slice(0, 4).toUpperCase()}`, // New unique variant SKU
      serial_number: `SN-COPY-${uuidv4().slice(0, 8).toUpperCase()}`, // New unique serial number
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }))

    // Remove auto-generated fields for insert
    duplicatedVariantsData.forEach((v: { created_at: any; updated_at: any }) => {
      delete v.created_at
      delete v.updated_at
    })

    const { error: insertVariantsError } = await supabase
      .from("variants")
      .insert(duplicatedVariantsData.map(toSnakeCase))

    if (insertVariantsError) {
      console.error("Error inserting duplicated variants:", insertVariantsError)
      // Optionally, roll back product insertion here if variants fail, though for now, we'll just report the error.
      return { success: false, error: insertVariantsError.message }
    }

    revalidatePath("/")
    return { success: true, data: duplicatedProduct }
  } catch (e: any) {
    console.error("Exception duplicating product:", e)
    return { success: false, error: e.message }
  }
}

interface ImportRow {
  "Product Name": string
  "Product Brand": string
  "Product SKU": string
  "Product Category": string
  "Original Price": number
  "Sale Price": number
  "Product Image URL": string
  "Size Category": string
  Size: string
  "Size Label": string
  Location: string
  "Variant Status": string
  "Date Added": string
  Condition: string
  "Serial Number": string
  "Variant SKU": string
  "Cost Price": number // Added for import
}

/**
 * Imports products and variants from a structured array of data (e.g., parsed from CSV).
 * It handles upserting products by SKU and variants by serial number.
 * Automatically fetches product image from Kicks.dev if not provided in CSV.
 * @param data An array of objects, where each object represents a row from the import file.
 */
export async function importProductsAndVariants(data: ImportRow[]) {
  const supabase = createAdminClient()
  let importedCount = 0
  const errorMessages: string[] = []

  // In-memory cache for Kicks.dev product images to avoid redundant API calls
  const kicksDevProductImageCache = new Map<string, string>() // Map SKU to image URL

  try {
    // Group variants by product SKU to process products first
    const productsMap = new Map<string, { productData: any; variants: any[] }>()

    for (const row of data) {
      const productSku = row["Product SKU"]
      const serialNumber = row["Serial Number"]

      if (!productSku || !serialNumber) {
        errorMessages.push(`Skipping row due to missing Product SKU or Serial Number: ${JSON.stringify(row)}`)
        continue
      }

      if (!productsMap.has(productSku)) {
        productsMap.set(productSku, {
          productData: {
            name: row["Product Name"],
            brand: row["Product Brand"],
            sku: row["Product SKU"],
            category: row["Product Category"],
            originalPrice: row["Original Price"],
            salePrice: row["Sale Price"],
            image: row["Product Image URL"], // Use provided image URL first
            sizeCategory: row["Size Category"],
          },
          variants: [],
        })
      }

      const productEntry = productsMap.get(productSku)
      if (productEntry) {
        productEntry.variants.push({
          size: row["Size"],
          sizeLabel: row["Size Label"],
          location: row["Location"],
          status: row["Variant Status"],
          dateAdded: row["Date Added"],
          condition: row["Condition"],
          serialNumber: row["Serial Number"],
          variantSku: row["Variant SKU"],
          costPrice: row["Cost Price"], // Include costPrice from CSV
        })
      }
    }

    for (const [sku, entry] of productsMap.entries()) {
      const { productData, variants } = entry

      // 1. Fetch product image from Kicks.dev if not provided or is a placeholder
      if (!productData.image || productData.image.includes("/placeholder.svg")) {
        let imageUrl = kicksDevProductImageCache.get(sku)

        if (!imageUrl) {
          console.log(`Attempting to fetch image for SKU: ${sku} from Kicks.dev`)
          const searchResult = await searchKicksDev(sku)
          if (searchResult.success && searchResult.data && searchResult.data.length > 0) {
            const foundItem = searchResult.data.find((item) => item.sku === sku)
            if (foundItem) {
              const fetchResult = await fetchKicksDevProduct(foundItem.id)
              if (fetchResult.success && fetchResult.data && fetchResult.data.image) {
                imageUrl = fetchResult.data.image
                kicksDevProductImageCache.set(sku, imageUrl) // Cache the image URL
                console.log(`Found image for SKU ${sku}: ${imageUrl}`)
              } else {
                errorMessages.push(`Could not fetch full Kicks.dev details for SKU ${sku}: ${fetchResult.error}`)
                console.error(`Failed to fetch full Kicks.dev details for SKU ${sku}:`, fetchResult.error)
              }
            } else {
              errorMessages.push(`Kicks.dev search found results but no exact SKU match for ${sku}`)
              console.warn(`Kicks.dev search found results but no exact SKU match for ${sku}`)
            }
          } else if (!searchResult.success) {
            errorMessages.push(`Kicks.dev search failed for SKU ${sku}: ${searchResult.error}`)
            console.error(`Kicks.dev search failed for SKU ${sku}:`, searchResult.error)
          }
        }
        if (imageUrl) {
          productData.image = imageUrl
        } else {
          // Fallback to placeholder if no image found
          productData.image = "/placeholder.svg?height=100&width=100"
        }
      }

      // 2. Upsert Product
      let targetProductId: number
      const { data: existingProduct, error: fetchProductError } = await supabase
        .from("products")
        .select("id")
        .eq("sku", sku)
        .single()

      if (fetchProductError && fetchProductError.code !== "PGRST116") {
        errorMessages.push(`Error checking product ${sku}: ${fetchProductError.message}`)
        console.error(`Error checking product ${sku}:`, fetchProductError)
        continue
      }

      if (existingProduct) {
        targetProductId = existingProduct.id
        console.log(`Updating existing product: ${sku} (ID: ${targetProductId})`)
        const { error: updateError } = await supabase
          .from("products")
          .update(toSnakeCase(productData))
          .eq("id", targetProductId)
        if (updateError) {
          errorMessages.push(`Error updating product ${sku}: ${updateError.message}`)
          console.error(`Error updating product ${sku}:`, updateError)
          continue
        }
      } else {
        console.log(`Inserting new product: ${sku}`)
        const { data: newProduct, error: insertProductError } = await supabase
          .from("products")
          .insert(toSnakeCase(productData))
          .select("id")
          .single()
        if (insertProductError) {
          errorMessages.push(`Error inserting new product ${sku}: ${insertProductError.message}`)
          console.error(`Error inserting new product ${sku}:`, insertProductError)
          continue
        }
        targetProductId = newProduct.id
        console.log(`New product inserted: ${sku} (ID: ${targetProductId})`)
      }

      // 3. Upsert Variants for this product
      console.log(`Processing ${variants.length} variants for product SKU: ${sku} (ID: ${targetProductId})`)
      for (const variant of variants) {
        const serialNumber = variant.serialNumber
        console.log(`  - Processing variant with Serial Number: ${serialNumber}`)

        if (!serialNumber) {
          errorMessages.push(
            `Skipping variant for product ${sku} due to missing Serial Number: ${JSON.stringify(variant)}`,
          )
          console.warn(`Skipping variant for product ${sku} due to missing Serial Number:`, variant)
          continue
        }

        // Validate and format dateAdded
        let formattedDateAdded = variant.dateAdded
        if (formattedDateAdded) {
          try {
            const dateObj = new Date(formattedDateAdded)
            if (isNaN(dateObj.getTime())) {
              throw new Error("Invalid date string")
            }
            formattedDateAdded = dateObj.toISOString().split("T")[0]
          } catch (e) {
            console.warn(
              `Invalid date format for variant serial ${serialNumber}: '${variant.dateAdded}'. Falling back to current date.`,
            )
            formattedDateAdded = new Date().toISOString().split("T")[0] // Fallback
          }
        } else {
          formattedDateAdded = new Date().toISOString().split("T")[0] // Default if empty
        }

        const { data: existingVariant, error: fetchVariantError } = await supabase
          .from("variants")
          .select("id")
          .eq("serial_number", serialNumber)
          .single()

        if (fetchVariantError && fetchVariantError.code !== "PGRST116") {
          errorMessages.push(`Error checking variant ${serialNumber}: ${fetchVariantError.message}`)
          console.error(`Error checking variant ${serialNumber}:`, fetchVariantError)
          continue
        }

        const variantToInsertOrUpdate = {
          ...toSnakeCase(variant),
          product_id: targetProductId,
          date_added: formattedDateAdded, // Use the validated/formatted date
          variant_sku: variant.variantSku || `${sku}-${variant.size}-${uuidv4().slice(0, 4).toUpperCase()}`,
          cost_price: variant.costPrice || 0, // Ensure cost_price is included
        }

        if (existingVariant) {
          console.log(`  - Data for UPDATE variant ${serialNumber}:`, variantToInsertOrUpdate)
          const { error: updateVariantError } = await supabase
            .from("variants")
            .update({ ...variantToInsertOrUpdate, updated_at: new Date().toISOString() })
            .eq("id", existingVariant.id)
          if (updateVariantError) {
            errorMessages.push(`Error updating variant ${serialNumber}: ${updateVariantError.message}`)
            console.error(`Error updating variant ${serialNumber}:`, updateVariantError)
            continue
          }
        } else {
          console.log(`  - Data for INSERT new variant ${serialNumber}:`, variantToInsertOrUpdate)
          const { error: insertVariantError } = await supabase
            .from("variants")
            .insert({ ...variantToInsertOrUpdate, id: uuidv4() }) // Generate new ID for new variant
          if (insertVariantError) {
            errorMessages.push(`Error inserting new variant ${serialNumber}: ${insertVariantError.message}`)
            console.error(`Error inserting new variant ${serialNumber}:`, insertVariantError)
            continue
          }
        }
        importedCount++
      }
    }

    revalidatePath("/")
    if (errorMessages.length > 0) {
      return { success: false, error: `Import completed with errors: ${errorMessages.join("; ")}`, importedCount }
    }
    return { success: true, importedCount }
  } catch (e: any) {
    console.error("Exception during import:", e)
    return { success: false, error: `An unexpected error occurred: ${e.message}`, importedCount: 0 }
  }
}

// --- New Server Actions for Sales and Profit Distribution ---

interface SaleItemData {
  variantId: string
  soldPrice: number
  costPrice: number
  quantity: number // Should always be 1 for individual shoes
}

interface ProfitDistributionData {
  avatarId: string
  percentage: number
  amount: number
}

interface RecordSalePayload {
  saleDate: string // YYYY-MM-DD
  totalAmount: number
  totalDiscount: number
  netProfit: number
  items: SaleItemData[]
  profitDistribution: ProfitDistributionData[]
  customerName?: string // New: Optional customer name
  customerPhone?: string // New: Optional customer phone
}

/**
 * Records a new sale, updates variant statuses, and records profit distribution.
 * @param payload The sale data including items and profit distribution.
 */
export async function recordSale(payload: RecordSalePayload) {
  const supabase = createAdminClient()
  const errorMessages: string[] = []

  try {
    // 1. Insert into sales table
    const { data: sale, error: saleError } = await supabase
      .from("sales")
      .insert({
        sale_date: payload.saleDate,
        total_amount: payload.totalAmount,
        total_discount: payload.totalDiscount,
        net_profit: payload.netProfit,
        customer_name: payload.customerName || null, // New: Insert customer name
        customer_phone: payload.customerPhone || null, // New: Insert customer phone
      })
      .select("id")
      .single()

    if (saleError || !sale) {
      console.error("Error inserting sale:", saleError)
      return { success: false, error: saleError?.message || "Failed to record sale." }
    }

    const saleId = sale.id

    console.log("Payload items received in recordSale:", payload.items) // Add this line

    // 2. Insert into sale_items and update variant statuses
    const saleItemsToInsert = payload.items.map((item) => ({
      sale_id: saleId,
      variant_id: item.variantId,
      sold_price: item.soldPrice,
      cost_price: item.costPrice,
      quantity: item.quantity,
    }))

    const { error: saleItemsError } = await supabase.from("sale_items").insert(saleItemsToInsert)

    if (saleItemsError) {
      console.error("Error inserting sale items:", saleItemsError)
      // Consider rolling back the sale if items fail
      return { success: false, error: saleItemsError.message }
    } else {
      console.log("Successfully inserted sale items for sale ID:", saleId, saleItemsToInsert)
    }

    // Update status of sold variants to 'Sold'
    const variantIdsToUpdate = payload.items.map((item) => item.variantId)
    const { error: updateVariantsError } = await supabase
      .from("variants")
      .update({ status: "Sold", updated_at: new Date().toISOString() }) // FIX: Changed to "Sold"
      .in("id", variantIdsToUpdate)

    if (updateVariantsError) {
      console.error("Error updating variant statuses to Sold:", updateVariantsError)
      // This is critical, but we might not want to roll back the entire sale for it. Log and alert.
      errorMessages.push(`Failed to update status for some variants: ${updateVariantsError.message}`)
    }

    // 3. Insert into sale_profit_distributions
    const profitDistributionsToInsert = payload.profitDistribution.map((dist) => ({
      sale_id: saleId,
      avatar_id: dist.avatarId,
      amount: dist.amount,
      percentage: dist.percentage,
    }))

    const { error: profitDistError } = await supabase
      .from("sale_profit_distributions")
      .insert(profitDistributionsToInsert)

    if (profitDistError) {
      console.error("Error inserting profit distributions:", profitDistError)
      errorMessages.push(`Failed to record profit distributions: ${profitDistError.message}`)
    }

    revalidatePath("/") // Revalidate inventory page
    revalidatePath("/sales") // Revalidate sales history page
    revalidatePath("/checkout") // Revalidate checkout page

    if (errorMessages.length > 0) {
      return { success: false, error: `Sale recorded with some issues: ${errorMessages.join("; ")}` }
    }
    return { success: true, saleId }
  } catch (e: any) {
    console.error("Exception recording sale:", e)
    return { success: false, error: `An unexpected error occurred: ${e.message}` }
  }
}

/**
 * Fetches all avatars.
 */
export async function getAvatars() {
  const supabase = await getSupabaseClient()
  try {
    const { data, error } = await supabase.from("avatars").select("*").order("name", { ascending: true })
    if (error) {
      console.error("Error fetching avatars:", error)
      return { success: false, error: error.message }
    }
    return { success: true, data }
  } catch (e: any) {
    console.error("Exception fetching avatars:", e)
    return { success: false, error: e.message }
  }
}

/**
 * Fetches all profit distribution templates.
 */
export async function getProfitDistributionTemplates() {
  const supabase = await getSupabaseClient()
  try {
    const { data, error } = await supabase
      .from("profit_distribution_templates")
      .select(
        `
        id,
        name,
        description,
        profit_template_items (
          avatar_id,
          percentage,
          avatars (
            name
          )
        )
      `,
      )
      .order("name", { ascending: true })

    const formattedData = data?.map((template) => ({
      ...template,
      // FIX: Changed 'items' to 'distributions' to match ProfitDistributionTemplateDetail type
      distributions: template.profit_template_items.map((item: any) => ({
        avatar_id: item.avatar_id,
        percentage: item.percentage,
        avatar_name: item.avatars?.name, // Include avatar name for display
      })),
    }))

    return { success: true, data: formattedData }
  } catch (e: any) {
    console.error("Exception fetching profit distribution templates:", e)
    return { success: false, error: e.message }
  }
}

/**
 * Fetches items for a specific profit distribution template.
 * @param templateId The ID of the template.
 */
export async function getProfitTemplateItems(templateId: string) {
  const supabase = await getSupabaseClient()
  try {
    const { data, error } = await supabase
      .from("profit_template_items")
      .select("*, avatars(id, name, default_percentage)") // Join with avatars table
      .eq("template_id", templateId)
    if (error) {
      console.error("Error fetching profit template items:", error)
      return { success: false, error: error.message }
    }
    // Flatten the avatar data
    const flattenedData = data.map((item) => ({
      ...item,
      avatar: item.avatars, // Keep original avatar object
      avatar_id: item.avatars?.id, // Explicitly map avatar_id
      avatar_name: item.avatars?.name, // Explicitly map avatar_name
      avatar_default_percentage: item.avatars?.default_percentage, // Explicitly map default_percentage
      avatars: undefined, // Remove nested avatars object
    }))
    return { success: true, data: flattenedData }
  } catch (e: any) {
    console.error("Exception fetching profit template items:", e)
    return { success: false, error: e.message }
  }
}

/**
 * Fetches all sales with their items and profit distributions.
 */
export async function getSales() {
  // Renamed from fetchSales to getSales for consistency
  const supabase = await getSupabaseClient()
  try {
    const { data: sales, error: salesError } = await supabase
      .from("sales")
      .select(
        `
        id,
        sale_date,
        total_amount,
        total_discount,
        net_profit,
        customer_name,
        customer_phone,
        created_at,
        updated_at,
        sale_items (
          id,
          variant_id,
          sold_price,
          cost_price,
          quantity,
          variants (
            id,
            serial_number,
            size,
            size_label,
            variant_sku,
            cost_price,
            products (name, brand, sku, image)
          )
        ),
        sale_profit_distributions (
          id,
          avatar_id,
          amount,
          percentage,
          avatars (id, name)
        )
      `,
      )
      .order("sale_date", { ascending: false })
      .order("created_at", { ascending: false }) // Secondary sort for consistent order

    if (salesError) {
      console.error("Error fetching sales:", salesError)
      return { success: false, error: salesError.message }
    }

    console.log("Raw sales data from Supabase (getSales):", sales)

    const salesWithDetails = sales.map((sale) => {
      const mappedItems = sale.sale_items.map((item: any) => ({
        id: item.id,
        variant_id: item.variant_id,
        sold_price: item.sold_price,
        cost_price: item.cost_price,
        quantity: item.quantity,
        variant: {
          id: item.variants?.id,
          serialNumber: item.variants?.serial_number,
          size: item.variants?.size,
          sizeLabel: item.variants?.size_label,
          variantSku: item.variants?.variant_sku,
          costPrice: item.variants?.cost_price,
          productName: item.variants?.products?.name,
          productBrand: item.variants?.products?.brand,
          productSku: item.variants?.products?.sku,
          productImage: item.variants?.products?.image,
        },
      }))

      const mappedProfitDistributions = sale.sale_profit_distributions.map((dist: any) => ({
        id: dist.id,
        avatar_id: dist.avatar_id,
        amount: dist.amount,
        percentage: dist.percentage,
        avatar: {
          id: dist.avatars?.id,
          name: dist.avatars?.name,
        },
      }))

      return {
        id: sale.id,
        sale_date: sale.sale_date,
        total_amount: sale.total_amount,
        total_discount: sale.total_discount,
        net_profit: sale.net_profit,
        customer_name: sale.customer_name, // Include customer name
        customer_phone: sale.customer_phone, // Include customer phone
        created_at: sale.created_at,
        updated_at: sale.updated_at,
        items: mappedItems,
        profitDistribution: mappedProfitDistributions,
      }
    })

    return { success: true, data: salesWithDetails }
  } catch (e: any) {
    console.error("Exception fetching sales:", e)
    return { success: false, error: e.message }
  }
}

/**
 * Fetches a single sale with its items and profit distributions.
 * @param saleId The ID of the sale to fetch.
 */
export async function getSaleDetails(saleId: string) {
  const supabase = await getSupabaseClient()
  try {
    const { data: sale, error: saleError } = await supabase.from("sales").select("*").eq("id", saleId).single()

    if (saleError || !sale) {
      console.error(`Error fetching sale ${saleId}:`, saleError)
      return { success: false, error: saleError?.message || "Sale not found." }
    }

    const { data: saleItems, error: itemsError } = await supabase
      .from("sale_items")
      .select(`
      *,
      variants (
        id,
        serial_number,
        size,
        size_label,
        variant_sku,
        cost_price,
        products (
          name,
          brand,
          sku,
          image
        )
      )
    `)
      .eq("sale_id", saleId)

    if (itemsError) {
      console.error(`Error fetching sale items for sale ${saleId}:`, itemsError)
      return { success: false, error: itemsError.message }
    }

    console.log(`Raw sale items for sale ${saleId} (getSaleDetails):`, saleItems)

    const { data: profitDistributions, error: profitDistError } = await supabase
      .from("sale_profit_distributions")
      .select(`
      *,
      avatars (
        id,
        name
      )
    `)
      .eq("sale_id", saleId)

    if (profitDistError) {
      console.error(`Error fetching profit distributions for sale ${saleId}:`, profitDistError)
      return { success: false, error: profitDistError.message }
    }

    // Flatten nested data for easier consumption
    const mappedItems = saleItems.map((item) => ({
      ...item,
      variant: {
        id: item.variants?.id,
        serialNumber: item.variants?.serial_number,
        size: item.variants?.size,
        sizeLabel: item.variants?.size_label,
        variantSku: item.variants?.variant_sku,
        costPrice: item.variants?.cost_price,
        productName: item.variants?.products?.name,
        productBrand: item.variants?.products?.brand,
        productSku: item.variants?.products?.sku,
        productImage: item.variants?.products?.image,
      },
      variants: undefined, // Remove original nested object
    }))

    const mappedProfitDistributions = profitDistributions.map((dist) => ({
      ...dist,
      avatar: {
        id: dist.avatars?.id,
        name: dist.avatars?.name,
      },
      avatars: undefined, // Remove original nested object
    }))

    return {
      success: true,
      data: {
        ...sale,
        items: mappedItems,
        profitDistribution: mappedProfitDistributions,
      },
    }
  } catch (e: any) {
    console.error("Exception fetching sale details:", e)
    return { success: false, error: e.message }
  }
}

/**
 * Deletes a sale and its associated items and profit distributions.
 * @param saleId The ID of the sale to delete.
 */
export async function deleteSale(saleId: string) {
  const supabase = createAdminClient() // Use admin client for deletion

  try {
    // Start a transaction (Supabase client doesn't have explicit transactions for RPC,
    // but cascade deletes handle this for related tables if set up in DB)
    // For explicit transaction-like behavior, you'd typically use a stored procedure or
    // handle rollbacks manually if one step fails. For simplicity, relying on cascade for now.

    // Delete profit distributions first (if not cascaded)
    const { error: deleteProfitDistError } = await supabase
      .from("sale_profit_distributions")
      .delete()
      .eq("sale_id", saleId)

    if (deleteProfitDistError) {
      console.error("Error deleting profit distributions for sale:", deleteProfitDistError)
      return { success: false, error: deleteProfitDistError.message }
    }

    // Delete sale items (if not cascaded)
    const { error: deleteSaleItemsError } = await supabase.from("sale_items").delete().eq("sale_id", saleId)

    if (deleteSaleItemsError) {
      console.error("Error deleting sale items:", deleteSaleItemsError)
      return { success: false, error: deleteSaleItemsError.message }
    }

    // Finally, delete the sale itself
    const { error: deleteSaleError } = await supabase.from("sales").delete().eq("id", saleId)

    if (deleteSaleError) {
      console.error("Error deleting sale:", deleteSaleError)
      return { success: false, error: deleteSaleError.message }
    }

    revalidatePath("/sales") // Revalidate sales history page
    revalidatePath("/checkout") // Revalidate checkout page (in case it affects any stats)
    revalidatePath("/") // Revalidate inventory (if any variant statuses need to revert, though not handled here)

    return { success: true }
  } catch (e: any) {
    console.error("Exception deleting sale:", e)
    return { success: false, error: `An unexpected error occurred: ${e.message}` }
  }
}

// New Server Action to revalidate and get products for ShoesInventoryTable
export async function revalidateAndGetProducts() {
  revalidatePath("/") // Revalidate the root path where ShoesInventoryTable is rendered
  try {
    const products = await getProductsFromLib() // Use getProducts from lib/data
    return { success: true, data: products }
  } catch (e: any) {
    console.error("Exception during revalidation and product fetch:", e)
    return { success: false, error: `An unexpected error occurred: ${e.message}`, data: [] }
  }
}

// --- Product and Variant Actions (Existing, potentially updated) ---

export async function fetchProducts(): Promise<Product[]> {
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase.from("products").select("*")
  if (error) {
    console.error("Error fetching products:", error)
    return []
  }
  return data as Product[]
}

export async function fetchProductById(id: number): Promise<Product | null> {
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase.from("products").select("*").eq("id", id).single()
  if (error) {
    console.error("Error fetching product by ID:", error)
    return null
  }
  return data as Product
}

export async function fetchVariantsByProductId(productId: number): Promise<Variant[]> {
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase.from("variants").select("*").eq("product_id", productId)
  if (error) {
    console.error("Error fetching variants:", error)
    return []
  }
  return data as Variant[]
}

export async function fetchVariantById(id: string): Promise<Variant | null> {
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase.from("variants").select("*").eq("id", id).single()
  if (error) {
    console.error("Error fetching variant by ID:", error)
    return null
  }
  return data as Variant
}

export async function updateVariant(id: string, formData: FormData): Promise<{ success: boolean; message: string }> {
  const supabase = await getSupabaseClient()
  const updates = {
    size: formData.get("size"),
    color: formData.get("color"),
    quantity: Number.parseInt(formData.get("quantity") as string),
    location: formData.get("location"),
    status: formData.get("status"),
    cost_price: Number.parseFloat(formData.get("cost_price") as string), // Ensure cost_price is updated
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase.from("variants").update(updates).eq("id", id)

  if (error) {
    console.error("Error updating variant:", error)
    return { success: false, message: "Failed to update variant." }
  }

  revalidatePath(`/products/${formData.get("product_id")}`)
  return { success: true, message: "Variant updated successfully!" }
}

export async function addVariantFormData(
  productId: number,
  formData: FormData,
): Promise<{ success: boolean; message: string }> {
  const supabase = await getSupabaseClient()
  const newVariant = {
    product_id: productId,
    size: formData.get("size"),
    color: formData.get("color"),
    quantity: Number.parseInt(formData.get("quantity") as string),
    location: formData.get("location"),
    status: formData.get("status"),
    cost_price: Number.parseFloat(formData.get("cost_price") as string), // Ensure cost_price is added
  }

  const { error } = await supabase.from("variants").insert(newVariant)

  if (error) {
    console.error("Error adding variant:", error)
    return { success: false, message: "Failed to add variant." }
  }

  revalidatePath(`/products/${productId}`)
  return { success: true, message: "Variant added successfully!" }
}

export async function deleteVariant(id: string): Promise<{ success: boolean; message: string }> {
  const supabase = await getSupabaseClient()
  const { error } = await supabase.from("variants").delete().eq("id", id)

  if (error) {
    console.error("Error deleting variant:", error)
    return { success: false, message: "Failed to delete variant." }
  }

  revalidatePath("/products") // Revalidate products page as well
  return { success: true, message: "Variant deleted successfully!" }
}

export async function fetchCustomLocations(): Promise<CustomLocation[]> {
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase.from("custom_locations").select("*")
  if (error) {
    console.error("Error fetching custom locations:", error)
    return []
  }
  return data as CustomLocation[]
}

export async function addCustomLocationFormData(formData: FormData): Promise<{ success: boolean; message: string }> {
  const supabase = await getSupabaseClient()
  const name = formData.get("name") as string

  const { error } = await supabase.from("custom_locations").insert({ name })

  if (error) {
    console.error("Error adding custom location:", error)
    return { success: false, message: "Failed to add custom location." }
  }

  revalidatePath("/settings")
  return { success: true, message: "Custom location added successfully!" }
}

export async function deleteCustomLocation(id: string): Promise<{ success: boolean; message: string }> {
  const supabase = await getSupabaseClient()
  const { error } = await supabase.from("custom_locations").delete().eq("id", id)

  if (error) {
    console.error("Error deleting custom location:", error)
    return { success: false, message: "Failed to delete custom location." }
  }

  revalidatePath("/settings")
  return { success: true, message: "Custom location deleted successfully!" }
}

// --- Sales Actions ---

export async function recordSaleFormData(
  saleData: Omit<Sale, "id" | "created_at" | "updated_at" | "sale_date"> & {
    sale_date: Date
  },
  items: Omit<SaleItem, "id" | "sale_id" | "created_at" | "updated_at">[],
  profitDistributions: Omit<SaleProfitDistribution, "id" | "sale_id" | "created_at" | "updated_at">[],
): Promise<{ success: boolean; message: string; saleId?: string }> {
  const supabase = await getSupabaseClient()

  const { data: sale, error: saleError } = await supabase
    .from("sales")
    .insert({
      sale_date: format(saleData.sale_date, "yyyy-MM-dd"),
      total_amount: saleData.total_amount,
      total_discount: saleData.total_discount,
      net_profit: saleData.net_profit,
    })
    .select("id")
    .single()

  if (saleError) {
    console.error("Error recording sale:", saleError)
    return { success: false, message: "Failed to record sale." }
  }

  const saleId = sale.id

  // Insert sale items
  const itemsToInsert = items.map((item) => ({ ...item, sale_id: saleId }))
  const { error: itemsError } = await supabase.from("sale_items").insert(itemsToInsert)

  if (itemsError) {
    console.error("Error recording sale items:", itemsError)
    // Optionally, roll back the sale if items fail
    await supabase.from("sales").delete().eq("id", saleId)
    return { success: false, message: "Failed to record sale items." }
  }

  // Insert profit distributions
  const distributionsToInsert = profitDistributions.map((dist) => ({
    ...dist,
    sale_id: saleId,
  }))
  const { error: distributionsError } = await supabase.from("sale_profit_distributions").insert(distributionsToInsert)

  if (distributionsError) {
    console.error("Error recording profit distributions:", distributionsError)
    // Optionally, roll back the sale and items if distributions fail
    await supabase.from("sale_items").delete().eq("sale_id", saleId)
    await supabase.from("sales").delete().eq("id", saleId)
    return { success: false, message: "Failed to record profit distributions." }
  }

  // Update variant quantities (decrement sold items)
  for (const item of items) {
    const { error: updateError } = await supabase
      .from("variants")
      .update({ quantity: (item.quantity as number) - item.quantity }) // Assuming item.quantity is the sold quantity
      .eq("id", item.variant_id)
    if (updateError) {
      console.error(`Error updating quantity for variant ${item.variant_id}:`, updateError)
      // Decide on rollback strategy if quantity update fails
    }
  }

  revalidatePath("/sales")
  revalidatePath("/products") // Revalidate products as quantities might have changed
  return { success: true, message: "Sale recorded successfully!", saleId }
}

export async function fetchSalesStats(startDate: Date | null, endDate: Date | null): Promise<SalesStats> {
  const supabase = await getSupabaseClient()
  let query = supabase.from("sales").select("total_amount, net_profit")

  if (startDate) {
    query = query.gte("sale_date", format(startDate, "yyyy-MM-dd"))
  }
  if (endDate) {
    query = query.lte("sale_date", format(endDate, "yyyy-MM-dd"))
  }

  const { data, error } = await query

  if (error) {
    console.error("Error fetching sales stats:", error)
    return { totalSalesAmount: 0, totalNetProfit: 0, numberOfSales: 0 }
  }

  const totalSalesAmount = data.reduce((sum, sale) => sum + sale.total_amount, 0)
  const totalNetProfit = data.reduce((sum, sale) => sum + sale.net_profit, 0)
  const numberOfSales = data.length

  return { totalSalesAmount, totalNetProfit, numberOfSales }
}

export async function calculateAvatarProfits(
  sales: Sale[],
  avatars: Avatar[],
): Promise<{ avatarUrl: string; name: string; profit: number }[]> {
  const avatarProfitMap = new Map<string, { name: string; profit: number; avatarUrl: string }>()

  // Initialize map with all avatars, setting profit to 0
  avatars.forEach((avatar) => {
    avatarProfitMap.set(avatar.id, {
      name: avatar.name,
      profit: 0,
      avatarUrl: avatar.image || "/placeholder.svg?height=40&width=40", // Use avatar image or placeholder
    })
  })

  // Aggregate profits from sales
  sales.forEach((sale) => {
    sale.profitDistribution.forEach((dist: { avatar_id: string; amount: number; avatar: { name: any } }) => {
      const current = avatarProfitMap.get(dist.avatar_id)
      if (current) {
        current.profit += dist.amount
      } else {
        // This case should ideally not happen if all avatars are fetched, but as a fallback
        avatarProfitMap.set(dist.avatar_id, {
          name: dist.avatar?.name || `Unknown Avatar (${dist.avatar_id.substring(0, 4)})`,
          profit: dist.amount,
          avatarUrl: "/placeholder.svg?height=40&width=40",
        })
      }
    })
  })

  return Array.from(avatarProfitMap.values())
}

// --- Avatar Actions ---

export async function createAvatar(formData: FormData): Promise<{ success: boolean; message: string }> {
  const supabase = createAdminClient() // FIX: Use admin client
  const name = formData.get("name") as string
  const default_percentage = Number.parseFloat(formData.get("default_percentage") as string)

  if (isNaN(default_percentage) || default_percentage < 0 || default_percentage > 100) {
    return { success: false, message: "Default percentage must be a number between 0 and 100." }
  }

  const { error } = await supabase.from("avatars").insert({ name, default_percentage })

  if (error) {
    console.error("Error creating avatar:", error)
    return { success: false, message: "Failed to create avatar." }
  }

  revalidatePath("/sales") // Avatars are used on sales page
  revalidatePath("/checkout") // Avatars are used on checkout page
  return { success: true, message: "Avatar created successfully!" }
}

export async function updateAvatar(id: string, formData: FormData): Promise<{ success: boolean; message: string }> {
  const supabase = createAdminClient() // FIX: Use admin client
  const name = formData.get("name") as string
  const default_percentage = Number.parseFloat(formData.get("default_percentage") as string)

  if (isNaN(default_percentage) || default_percentage < 0 || default_percentage > 100) {
    return { success: false, message: "Default percentage must be a number between 0 and 100." }
  }

  const { error } = await supabase.from("avatars").update({ name, default_percentage }).eq("id", id)

  if (error) {
    console.error("Error updating avatar:", error)
    return { success: false, message: "Failed to update avatar." }
  }

  revalidatePath("/sales")
  revalidatePath("/checkout")
  return { success: true, message: "Avatar updated successfully!" }
}

export async function deleteAvatar(id: string): Promise<{ success: boolean; message: string }> {
  const supabase = createAdminClient() // FIX: Use admin client
  const { error } = await supabase.from("avatars").delete().eq("id", id)

  if (error) {
    console.error("Error deleting avatar:", error)
    return { success: false, message: "Failed to delete avatar." }
  }

  revalidatePath("/sales")
  revalidatePath("/checkout")
  return { success: true, message: "Avatar deleted successfully!" }
}

// --- Profit Distribution Template Actions ---

export async function fetchProfitTemplates(): Promise<ProfitDistributionTemplate[]> {
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase
    .from("profit_distribution_templates")
    .select("*")
    .order("name", { ascending: true })
  if (error) {
    console.error("Error fetching profit templates:", error)
    return []
  }
  return data as ProfitDistributionTemplate[]
}

export async function fetchProfitTemplateById(id: string): Promise<ProfitDistributionTemplateDetail | null> {
  const supabase = await getSupabaseClient()
  const { data: template, error: templateError } = await supabase
    .from("profit_distribution_templates")
    .select("*")
    .eq("id", id)
    .single()

  if (templateError) {
    console.error("Error fetching profit template by ID:", templateError)
    return null
  }

  const { data: distributions, error: distributionsError } = await supabase
    .from("profit_template_items") // Assuming a new table for template distributions
    .select("avatar_id, percentage")
    .eq("template_id", id)

  if (distributionsError) {
    console.error("Error fetching profit template distributions:", distributionsError)
    return null
  }

  return {
    ...template,
    distributions: distributions || [],
  } as ProfitDistributionTemplateDetail
}

export async function addProfitDistributionTemplate(payload: {
  name: string
  description: string
  items: { avatarId: string; percentage: number }[]
}) {
  const supabase = createAdminClient() // FIX: Use admin client
  const { name, description, items } = payload

  const { data: templateData, error: templateError } = await supabase
    .from("profit_distribution_templates")
    .insert({ name, description })
    .select("id")
    .single()

  if (templateError) {
    console.error("Error adding profit distribution template:", templateError)
    return { success: false, error: templateError.message }
  }

  const templateId = templateData.id

  const templateItemsPayload = items.map((item) => ({
    template_id: templateId,
    avatar_id: item.avatarId,
    percentage: item.percentage,
  }))

  const { error: itemsError } = await supabase.from("profit_template_items").insert(templateItemsPayload)

  if (itemsError) {
    console.error("Error adding profit template items:", itemsError)
    await supabase.from("profit_distribution_templates").delete().eq("id", templateId) // Rollback
    return { success: false, error: itemsError.message }
  }

  revalidatePath("/sales")
  revalidatePath("/checkout")
  return { success: true }
}

export async function updateProfitDistributionTemplate(
  templateId: string,
  payload: {
    name: string
    description: string
    items: { avatarId: string; percentage: number }[]
  },
) {
  const supabase = createAdminClient() // FIX: Use admin client
  const { name, description, items } = payload

  const { error: templateError } = await supabase
    .from("profit_distribution_templates")
    .update({ name, description })
    .eq("id", templateId)

  if (templateError) {
    console.error("Error updating profit template:", templateError)
    return { success: false, message: "Failed to update profit template." }
  }

  // Delete existing items and insert new ones
  const { error: deleteItemsError } = await supabase
    .from("profit_template_items")
    .delete()
    .eq("template_id", templateId)

  if (deleteItemsError) {
    console.error("Error deleting old profit template items:", deleteItemsError)
    return { success: false, message: "Failed to update profit template distributions." }
  }

  const templateItemsPayload = items.map((item) => ({
    template_id: templateId,
    avatar_id: item.avatarId,
    percentage: item.percentage,
  }))

  const { error: insertItemsError } = await supabase.from("profit_template_items").insert(templateItemsPayload)

  if (insertItemsError) {
    console.error("Error inserting new profit template items:", insertItemsError)
    return { success: false, message: "Failed to save new profit template distributions." }
  }

  revalidatePath("/sales")
  revalidatePath("/checkout")
  return { success: true }
}

export async function deleteProfitDistributionTemplate(templateId: string) {
  const supabase = createAdminClient() // FIX: Use admin client
  const { error } = await supabase.from("profit_distribution_templates").delete().eq("id", templateId)

  if (error) {
    console.error("Error deleting profit distribution template:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/sales")
  revalidatePath("/checkout")
  return { success: true }
}

// --- New code from updates ---

// Helper function to create a Supabase client for admin actions
let adminClient: any = null

function createAdminClient() {
  if (adminClient) return adminClient

  // Initialize the Supabase client with the service role key for admin access
  const supabase = createSupabaseAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, // Use NEXT_PUBLIC_SUPABASE_URL for the URL
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // Use the service role key for admin access
    {
      auth: {
        persistSession: false, // Admin client typically doesn't need session persistence
      },
    },
  )
  adminClient = supabase
  return supabase
}

export async function getAllAvailableVariantsForClient(): Promise<{
  data: ProductVariant[] | null
  error: string | null
}> {
  const supabase = await createClient(cookies())

  try {
    const { data, error } = await supabase
      .from("variants")
      .select(
        `
        id,
        product_id,
        size,
        location,
        status,
        serial_number,
        cost_price,
        products (
          name,
          brand,
          sku,
          image,
          sale_price,
          original_price
        )
      `,
      )
      .eq("status", "Available")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching available variants:", error)
      return { data: null, error: error.message }
    }

    const variants: ProductVariant[] = data.map((v: any) => ({
      id: v.id,
      productId: v.product_id,
      size: v.size,
      sizeLabel: v.size, // Assuming size and sizeLabel are the same for now
      variantSku: v.variant_sku || "N/A", // Assuming variant_sku might be missing
      location: v.location,
      status: v.status,
      dateAdded: v.created_at, // Using created_at as dateAdded
      condition: "New", // Assuming default condition
      serialNumber: v.serial_number, // Use serial_number directly
      costPrice: v.cost_price,
      productName: v.products.name,
      productBrand: v.products.brand,
      productSku: v.products.sku,
      productImage: v.products.image,
      productSalePrice: v.products.sale_price,
      productOriginalPrice: v.products.original_price, // Map original_price
    }))

    return { data: variants, error: null }
  } catch (e: any) {
    console.error("Exception fetching available variants:", e)
    return { data: null, error: e.message }
  }
}

export async function getProducts(): Promise<{ data: Product[] | null; error: string | null }> {
  const supabase = await createClient(cookies())
  try {
    const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false })
    if (error) {
      console.error("Error fetching products:", error)
      return { data: null, error: error.message }
    }
    return { data, error: null }
  } catch (e: any) {
    console.error("Exception fetching products:", e)
    return { data: null, error: e.message }
  }
}

export async function getVariantsByProductId(
  productId: number,
): Promise<{ data: Variant[] | null; error: string | null }> {
  const supabase = await createClient(cookies())
  try {
    const { data, error } = await supabase.from("variants").select("*").eq("product_id", productId)
    if (error) {
      console.error("Error fetching variants:", error)
      return { data: null, error: error.message }
    }
    return { data, error: null }
  } catch (e: any) {
    console.error("Exception fetching variants:", e)
    return { data: null, error: e.message }
  }
}

export async function addProductAction(formData: FormData) {
  const supabase = await getSupabaseClient()
  const name = formData.get("name") as string
  const brand = formData.get("brand") as string
  const sku = formData.get("sku") as string
  const category = formData.get("category") as string
  const original_price = Number.parseFloat(formData.get("original_price") as string)
  const sale_price = Number.parseFloat(formData.get("sale_price") as string)
  const status = formData.get("status") as string
  const image = formData.get("image") as string
  const size_category = formData.get("size_category") as string

  const { data, error } = await supabase
    .from("products")
    .insert({
      name,
      brand,
      sku,
      category,
      original_price,
      sale_price,
      status,
      image,
      size_category,
    })
    .select()
    .single()

  if (error) {
    console.error("Error adding product:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/")
  return { success: true, data }
}

export async function addVariantAction(formData: FormData) {
  const supabase = await getSupabaseClient()
  const productId = Number.parseInt(formData.get("productId") as string)
  const size = formData.get("size") as string
  const sizeLabel = formData.get("sizeLabel") as string
  const variantSku = formData.get("variantSku") as string
  const location = formData.get("location") as string
  const status = formData.get("status") as string
  const condition = formData.get("condition") as string
  const serialNumber = formData.get("serialNumber") as string
  const costPrice = Number.parseFloat(formData.get("costPrice") as string)

  const { data, error } = await supabase
    .from("variants")
    .insert({
      productId,
      size,
      sizeLabel,
      variantSku,
      location,
      status,
      condition,
      serialNumber,
      costPrice,
    })
    .select()
    .single()

  if (error) {
    console.error("Error adding variant:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/")
  return { success: true, data }
}

export async function updateVariantStatus(variantId: string, newStatus: string) {
  const supabase = await getSupabaseClient()
  const { error } = await supabase.from("variants").update({ status: newStatus }).eq("id", variantId)

  if (error) {
    console.error("Error updating variant status:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/")
  return { success: true }
}

export async function deleteVariantAction(variantId: string) {
  const supabase = await getSupabaseClient()
  const { error } = await supabase.from("variants").delete().eq("id", variantId)

  if (error) {
    console.error("Error deleting variant:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/")
  return { success: true }
}

export async function updateProduct(productId: number, formData: FormData) {
  const supabase = await getSupabaseClient()
  const name = formData.get("name") as string
  const brand = formData.get("brand") as string
  const sku = formData.get("sku") as string
  const category = formData.get("category") as string
  const original_price = Number.parseFloat(formData.get("original_price") as string)
  const sale_price = Number.parseFloat(formData.get("sale_price") as string)
  const status = formData.get("status") as string
  const image = formData.get("image") as string
  const size_category = formData.get("size_category") as string

  const { error } = await supabase
    .from("products")
    .update({
      name,
      brand,
      sku,
      category,
      original_price,
      sale_price,
      status,
      image,
      size_category,
    })
    .eq("id", productId)

  if (error) {
    console.error("Error updating product:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/")
  return { success: true }
}

// --- Sales Actions ---

export async function recordSaleAction(payload: {
  saleDate: string
  totalAmount: number
  totalDiscount: number
  netProfit: number
  items: { variantId: string; soldPrice: number; costPrice: number; quantity: number }[]
  profitDistribution: { avatarId: string; percentage: number; amount: number }[]
}) {
  const supabase = await getSupabaseClient()

  const { saleDate, totalAmount, totalDiscount, netProfit, items, profitDistribution } = payload

  const { data: saleData, error: saleError } = await supabase
    .from("sales")
    .insert({
      sale_date: saleDate,
      total_amount: totalAmount,
      total_discount: totalDiscount,
      net_profit: netProfit,
    })
    .select("id")
    .single()

  if (saleError) {
    console.error("Error recording sale:", saleError)
    return { success: false, error: saleError.message }
  }

  const saleId = saleData.id

  // Insert sale items
  const saleItemsPayload = items.map((item) => ({
    sale_id: saleId,
    variant_id: item.variantId,
    sold_price: item.soldPrice,
    cost_price: item.costPrice,
    quantity: item.quantity,
  }))

  const { error: saleItemsError } = await supabase.from("sale_items").insert(saleItemsPayload)

  if (saleItemsError) {
    console.error("Error recording sale items:", saleItemsError)
    // Optionally, roll back the sale record if items fail
    await supabase.from("sales").delete().eq("id", saleId)
    return { success: false, error: saleItemsError.message }
  }

  // Insert profit distribution
  const profitDistributionPayload = profitDistribution.map((dist) => ({
    sale_id: saleId,
    avatar_id: dist.avatarId,
    percentage: dist.percentage,
    amount: dist.amount,
  }))

  const { error: profitDistError } = await supabase.from("sale_profit_distributions").insert(profitDistributionPayload)

  if (profitDistError) {
    console.error("Error recording profit distribution:", profitDistError)
    // Optionally, roll back sale and sale items if distribution fails
    await supabase.from("sales").delete().eq("id", saleId)
    return { success: false, error: profitDistError.message }
  }

  // Update variant statuses to 'sold'
  const variantIdsToUpdate = items.map((item) => item.variantId)
  const { error: updateError } = await supabase.from("variants").update({ status: "Sold" }).in("id", variantIdsToUpdate)

  if (updateError) {
    console.error("Error updating variant statuses:", updateError)
    // This is a non-critical error for the sale itself, but should be logged
  }

  revalidatePath("/checkout")
  revalidatePath("/sales")
  revalidatePath("/") // Revalidate inventory page
  return { success: true }
}

export async function getSalesAction() {
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase
    .from("sales")
    .select(
      `
    id,
    sale_date,
    total_amount,
    total_discount,
    net_profit,
    customer_name,
    customer_phone,
    sale_items (
      id,
      quantity,
      sold_price,
      cost_price,
      variants (
        id,
        size,
        size_label,
        variant_sku,
        serial_number,
        products (
          name,
          brand,
          sku,
          image
        )
      )
    ),
    sale_profit_distributions (
      id,
      amount,
      percentage,
      avatars (
        id,
        name
      )
    )
  `,
    )
    .order("sale_date", { ascending: false })
    .order("created_at", { ascending: false }) // Secondary sort for consistent order

  const formattedData = data?.map((sale) => ({
    ...sale,
    sale_items: sale.sale_items.map((item: any) => ({
      ...item,
      variant: {
        ...item.variants,
        product: item.variants?.products,
      },
    })),
    sale_profit_distributions: sale.sale_profit_distributions.map((dist: any) => ({
      ...dist,
      avatar: dist.avatars,
    })),
  }))

  return { data: formattedData, error: error?.message }
}

// --- Avatar Actions ---

export async function getAvatarsAction() {
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase.from("avatars").select("*").order("name", { ascending: true })
  return { data, error: error?.message }
}

export async function addAvatarAction(formData: FormData) {
  const supabase = await getSupabaseClient()
  const name = formData.get("name") as string
  const default_percentage = Number.parseFloat(formData.get("default_percentage") as string)

  const { data, error } = await supabase.from("avatars").insert({ name, default_percentage }).select().single()

  if (error) {
    console.error("Error adding avatar:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/sales")
  revalidatePath("/checkout") // Avatars are used on checkout page
  return { success: true, data }
}

// --- Profit Distribution Template Actions ---

export async function getProfitDistributionTemplatesAction() {
  const supabase = await getSupabaseClient()
  const { data, error } = await supabase
    .from("profit_distribution_templates")
    .select(
      `
     id,
     name,
     description,
     profit_template_items (
       avatar_id,
       percentage,
       avatars (
         name
       )
     )
   `,
    )
    .order("name", { ascending: true })

  const formattedData = data?.map((template) => ({
    ...template,
    // FIX: Changed 'items' to 'distributions' to match ProfitDistributionTemplateDetail type
    distributions: template.profit_template_items.map((item: any) => ({
      avatar_id: item.avatar_id,
      percentage: item.percentage,
      avatar_name: item.avatars?.name, // Include avatar name for display
    })),
  }))

  return { data: formattedData, error: error?.message }
}

export async function addProfitDistributionTemplateAction(payload: {
  name: string
  description: string
  items: { avatarId: string; percentage: number }[]
}) {
  const supabase = createAdminClient()
  const { name, description, items } = payload

  const { data: templateData, error: templateError } = await supabase
    .from("profit_distribution_templates")
    .insert({ name, description })
    .select("id")
    .single()

  if (templateError) {
    console.error("Error adding profit distribution template:", templateError)
    return { success: false, error: templateError.message }
  }

  const templateId = templateData.id

  const templateItemsPayload = items.map((item) => ({
    template_id: templateId,
    avatar_id: item.avatarId,
    percentage: item.percentage,
  }))

  const { error: itemsError } = await supabase.from("profit_template_items").insert(templateItemsPayload)

  if (itemsError) {
    console.error("Error adding profit template items:", itemsError)
    await supabase.from("profit_distribution_templates").delete().eq("id", templateId) // Rollback
    return { success: false, error: itemsError.message }
  }

  revalidatePath("/sales")
  revalidatePath("/checkout")
  return { success: true }
}

export async function updateProfitDistributionTemplateAction(
  templateId: string,
  payload: {
    name: string
    description: string
    items: { avatarId: string; percentage: number }[]
  },
) {
  const supabase = await getSupabaseClient()
  const { name, description, items } = payload

  const { error: templateError } = await supabase
    .from("profit_distribution_templates")
    .update({ name, description })
    .eq("id", templateId)

  if (templateError) {
    console.error("Error updating profit template:", templateError)
    return { success: false, message: "Failed to update profit template." }
  }

  // Delete existing items and insert new ones
  const { error: deleteItemsError } = await supabase
    .from("profit_template_items")
    .delete()
    .eq("template_id", templateId)

  if (deleteItemsError) {
    console.error("Error deleting old profit template items:", deleteItemsError)
    return { success: false, message: "Failed to update profit template distributions." }
  }

  const templateItemsPayload = items.map((item) => ({
    template_id: templateId,
    avatar_id: item.avatarId,
    percentage: item.percentage,
  }))

  const { error: insertItemsError } = await supabase.from("profit_template_items").insert(templateItemsPayload)

  if (insertItemsError) {
    console.error("Error inserting new profit template items:", insertItemsError)
    return { success: false, message: "Failed to save new profit template distributions." }
  }

  revalidatePath("/sales")
  revalidatePath("/checkout")
  return { success: true }
}

export async function deleteProfitDistributionTemplateAction(templateId: string) {
  const supabase = await getSupabaseClient()
  const { error } = await supabase.from("profit_distribution_templates").delete().eq("id", templateId)

  if (error) {
    console.error("Error deleting profit distribution template:", error)
    return { success: false, error: error.message }
  }

  revalidatePath("/sales")
  revalidatePath("/checkout")
  return { success: true }
}
