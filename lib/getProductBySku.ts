import { createClient } from "@/lib/supabase/client";

export async function getProductBySku(sku: string, productData?: any) {
  console.log("Querying product with SKU:", sku); // Debug log

  const supabase = createClient();
  
  // Get the current user's ID
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { success: false, error: "User not authenticated" };
  }

  try {
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("*")
      .eq("sku", sku)
      .eq("user_id", user.id)
      .single();

    console.log("Query result for product:", product); // Debug log
    
    if (productError && productError.code !== "PGRST116") {
      console.error("Error fetching product by SKU:", productError);
      return { success: false, error: productError.message };
    }

    if (!product) {
      console.log("Product not found. Inserting new product.");
      if (productData) {
        const dataWithUserId = {
          ...productData,
          user_id: user.id
        };

        const { data: insertedProduct, error: insertProductError } = await supabase
          .from("products")
          .insert([dataWithUserId])
          .select()
          .single();

        if (insertProductError) {
          console.error("Error inserting product:", insertProductError);
          return { success: false, error: insertProductError.message };
        }

        console.log("Product inserted successfully:", insertedProduct);
        return { success: true, data: insertedProduct };
      }
      return { success: false, error: "Product not found." };
    }

    console.log("Product found. Fetching variants...");
    const { data: variants, error: variantsError } = await supabase
      .from("variants")
      .select("*")
      .eq("product_id", product.id)
      .order("size", { ascending: true })
      .order("serial_number", { ascending: true });

    if (variantsError) {
      console.error(`Error fetching variants for product ${product.id}:`, variantsError);
      return { success: false, error: variantsError.message };
    }

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
      userId: p.user_id
    });

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
      costPrice: v.cost_price,
      createdAt: v.created_at,
      updatedAt: v.updated_at,
    });

    return {
      success: true,
      data: {
        ...mapProductToCamelCase(product),
        variants: variants.map(mapVariantToCamelCase),
      },
    };
  } catch (e: any) {
    console.error("Exception handling product by SKU:", e);
    return { success: false, error: e.message };
  }
}
