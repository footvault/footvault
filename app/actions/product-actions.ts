"use server"

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { v4 as uuidv4 } from "uuid";
import { cookies } from "next/headers";

export async function addProduct(productForm: any, variantsToAdd: any[]) {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    // Insert the product
    const { data: insertedProduct, error: productError } = await supabase
      .from("products")
      .insert([
        {
          id: uuidv4(),
          name: productForm.name,
          brand: productForm.brand,
          sku: productForm.sku,
          category: productForm.category,
          original_price: productForm.originalPrice,
          sale_price: productForm.salePrice,
          status: productForm.status,
          image: productForm.image,
          size_category: productForm.sizeCategory,
        },
      ])
      .select()
      .single();

    if (productError) {
      console.error("Error inserting product:", productError);
      return { success: false, error: productError.message };
    }

    if (!insertedProduct) {
      return { success: false, error: "Failed to insert product" };
    }

    // Insert variants if any
    if (variantsToAdd && variantsToAdd.length > 0) {
      const variantsWithProductId = variantsToAdd.map((variant: any) => ({
        ...variant,
        product_id: insertedProduct.id,
        id: uuidv4(),
      }));

      const { error: variantsError } = await supabase
        .from("variants")
        .insert(variantsWithProductId);

      if (variantsError) {
        console.error("Error inserting variants:", variantsError);
        return { success: false, error: variantsError.message };
      }
    }

    // Revalidate the inventory page
    revalidatePath("/inventory");

    return {
      success: true,
      data: insertedProduct,
      message: "Product added successfully",
    };
  } catch (error: any) {
    console.error("Error in addProduct server action:", error);
    return { success: false, error: error.message };
  }
}

export async function updateProduct(productId: string, updates: any) {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    const { data, error } = await supabase
      .from("products")
      .update(updates)
      .eq("id", productId)
      .select()
      .single();

    if (error) {
      console.error("Error updating product:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/inventory");
    return { success: true, data };
  } catch (error: any) {
    console.error("Error in updateProduct server action:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteProduct(productId: string) {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    const { error } = await supabase.from("products").delete().eq("id", productId);

    if (error) {
      console.error("Error deleting product:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/inventory");
    return { success: true };
  } catch (error: any) {
    console.error("Error in deleteProduct server action:", error);
    return { success: false, error: error.message };
  }
}
