import { NextResponse } from 'next/server';
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { v4 as uuidv4 } from "uuid";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: Request) {
  try {
    const { productForm, variantsToAdd } = await request.json();
    console.log("Adding product:", { productForm, variantsToAdd });

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the current user's ID from the authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        {
          success: false,
          error: "No authorization header",
        },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required",
        },
        { status: 401 }
      );
    }

    // Create authenticated Supabase client with user's token
    const authenticatedSupabase = createClient(
      supabaseUrl,
      supabaseKey,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );

    // Check if product with SKU already exists
    const { data: existingProduct, error: checkError } = await authenticatedSupabase
      .from("products")
      .select("id, sku")
      .eq("sku", productForm.sku)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      console.error("Error checking existing product:", checkError);
      return NextResponse.json(
        { success: false, error: checkError.message },
        { status: 500 }
      );
    }

    let productId;

    // If product doesn't exist, create it
    if (!existingProduct) {
      const { data: insertedProduct, error: productError } = await authenticatedSupabase
        .from("products")
        .insert([
          {
            name: productForm.name,
            brand: productForm.brand,
            sku: productForm.sku,
            category: productForm.category,
            original_price: productForm.originalPrice,
            sale_price: productForm.salePrice,
            status: productForm.status || 'In Stock',
            image: productForm.image,
            size_category: productForm.sizeCategory,
            user_id: user.id,
          },
        ])
        .select()
        .single();

      if (productError) {
        console.error("Error inserting product:", productError);
        return NextResponse.json(
          { success: false, error: productError.message },
          { status: 500 }
        );
      }
      
      productId = insertedProduct.id;
    } else {
      productId = existingProduct.id;
    }

    // Insert variants if any
    if (variantsToAdd && variantsToAdd.length > 0) {
      // Fetch existing serial_numbers for this user
      const { data: existingVariants, error: existingVariantsError } = await authenticatedSupabase
        .from("variants")
        .select("serial_number")
        .eq("user_id", user.id);

      if (existingVariantsError) {
        console.error("Error fetching existing variants:", existingVariantsError);
        return NextResponse.json(
          { success: false, error: existingVariantsError.message },
          { status: 500 }
        );
      }

      const existingSerialNumbers = new Set((existingVariants || []).map((v: any) => v.serial_number));

      // Only add variants with unique serial_number for this user
      const variantsWithIds = variantsToAdd
        .map((variant: any) => ({
          id: uuidv4(),
          product_id: productId,
          size: variant.size,
          variant_sku: `${productForm.sku}-${variant.size}`,
          location: variant.location || null,
          status: variant.status || 'Available',
          date_added: variant.dateAdded || null,
          condition: variant.condition || null,
          serial_number: variant.serialNumber || null,
          size_label: variant.sizeLabel || 'US',
          cost_price: variant.costPrice || 0.00,
          user_id: user.id,
        }))
        .filter((variant: any) => !existingSerialNumbers.has(variant.serial_number));

      if (variantsWithIds.length > 0) {
        const { error: variantsError } = await authenticatedSupabase
          .from("variants")
          .insert(variantsWithIds);

        if (variantsError) {
          console.error("Error inserting variants:", variantsError);
          return NextResponse.json(
            { success: false, error: variantsError.message },
            { status: 500 }
          );
        }
      }
    }

    // Revalidate the inventory page
    revalidatePath("/inventory");

    return NextResponse.json({
      success: true,
      message: existingProduct ? "Added new variants to existing product" : "Product and variants added successfully",
    });
  } catch (error: any) {
    console.error("Error in add-product API route:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "An error occurred while adding the product",
      },
      { status: 500 }
    );
  }
}
