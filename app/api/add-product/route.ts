import { NextRequest, NextResponse } from 'next/server';
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { v4 as uuidv4 } from "uuid";
import { getVariantLimit } from "@/lib/utils/variant-limits";
import { validateAuth, validateInput, getSecurityHeaders } from '@/lib/simple-security';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest) {
  const securityHeaders = getSecurityHeaders();
  
  try {
    // Validate authentication
    const authResult = await validateAuth(request);
    if (!authResult.valid) {
      return NextResponse.json({
        success: false,
        error: "Authentication required"
      }, { 
        status: 401,
        headers: securityHeaders
      });
    }

    const { productForm, variantsToAdd } = await request.json();

    // Basic validation
    if (!productForm || !variantsToAdd || !Array.isArray(variantsToAdd)) {
      return NextResponse.json({
        success: false,
        error: "Invalid request data"
      }, { 
        status: 400,
        headers: securityHeaders
      });
    }

    // Validate input lengths and sanitize
    if (productForm.name) productForm.name = validateInput(productForm.name, 255);
    if (productForm.brand) productForm.brand = validateInput(productForm.brand, 100);
    if (productForm.sku) productForm.sku = validateInput(productForm.sku, 100);

    console.log("Adding product:", { productForm, variantsToAdd });

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Use the validated user from auth
    const user = authResult.user;

    // Get the current user's ID from the authorization header
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "") || "";

    // Create authenticated Supabase client with user's token
    const authenticatedSupabase = createClient(
      supabaseUrl,
      supabaseKey,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    console.log("User ID from auth:", user.id);

    // Get user's current plan and existing variant count
    const { data: userData, error: userDataError } = await authenticatedSupabase
      .from("users")
      .select("plan")
      .eq("id", user.id)
      .single();

    if (userDataError) {
      console.error("Error fetching user data:", userDataError);
      return NextResponse.json(
        { success: false, error: "Failed to fetch user subscription plan" },
        { status: 500 }
      );
    }

    const userPlan = userData?.plan || 'Free';
    const variantLimit = getVariantLimit(userPlan);

    // Count existing variants with "Available" status for this user
    const { data: existingVariantsCount, error: countError } = await authenticatedSupabase
      .from("variants")
      .select("id", { count: 'exact' })
      .eq("user_id", user.id)
      .eq("status", "Available");

    if (countError) {
      console.error("Error counting existing available variants:", countError);
      return NextResponse.json(
        { success: false, error: "Failed to check existing available variants" },
        { status: 500 }
      );
    }

    const currentAvailableVariantCount = existingVariantsCount?.length || 0;
    const variantsToAddCount = variantsToAdd?.length || 0;

    // Check if adding new variants would exceed the limit
    if (currentAvailableVariantCount + variantsToAddCount > variantLimit) {
      const remainingSlots = Math.max(0, variantLimit - currentAvailableVariantCount);
      return NextResponse.json(
        {
          success: false,
          error: remainingSlots === 0 
            ? `Variant limit reached. Your ${userPlan} plan allows up to ${variantLimit} available variants. You currently have ${currentAvailableVariantCount} available variants. Please upgrade your plan to add more variants.`
            : `Variant limit exceeded. Your ${userPlan} plan allows up to ${variantLimit} available variants. You currently have ${currentAvailableVariantCount} available variants and are trying to add ${variantsToAddCount} more. Only ${remainingSlots} slots remaining. Please adjust your quantity to ${remainingSlots} or upgrade your plan.`,
          currentCount: currentAvailableVariantCount,
          limit: variantLimit,
          attemptedToAdd: variantsToAddCount,
          remaining: remainingSlots,
          plan: userPlan
        },
        { status: 403 }
      );
    }

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
      { 
        status: 500,
        headers: securityHeaders
      }
    );
  }
}
