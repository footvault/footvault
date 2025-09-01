import { NextRequest, NextResponse } from 'next/server';
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { v4 as uuidv4 } from "uuid";
import { getVariantLimit } from "@/lib/utils/variant-limits";
import { secureAPI, secureConfigs } from '@/lib/secure-api';
import { validateProductData, validateVariantData } from '@/lib/security';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Define validation function for product data
function validateAddProductRequest(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate productForm
  if (!data.productForm) {
    errors.push('Product form data is required');
  } else {
    const productValidation = validateProductData(data.productForm);
    if (!productValidation.valid) {
      errors.push(...productValidation.errors.map(err => `Product: ${err}`));
    }
  }

  // Validate variantsToAdd
  if (!Array.isArray(data.variantsToAdd)) {
    errors.push('Variants must be an array');
  } else if (data.variantsToAdd.length === 0) {
    errors.push('At least one variant is required');
  } else if (data.variantsToAdd.length > 100) {
    errors.push('Maximum 100 variants allowed per request');
  } else {
    data.variantsToAdd.forEach((variant: any, index: number) => {
      const variantValidation = validateVariantData(variant);
      if (!variantValidation.valid) {
        errors.push(...variantValidation.errors.map(err => `Variant ${index + 1}: ${err}`));
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

async function handleAddProduct(req: NextRequest, { user }: { user?: any }) {
  try {
    if (!user) {
      return NextResponse.json({
        success: false,
        error: "Authentication required"
      }, { status: 401 });
    }

    const { productForm, variantsToAdd } = await req.json();
   
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Create authenticated Supabase client with user's token
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    
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

    

    // Check variant limits before proceeding
    // First get user's plan from database
    const { data: userProfile, error: profileError } = await authenticatedSupabase
      .from("profiles")
      .select("subscription_plan")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Error fetching user profile:", profileError);
      return NextResponse.json({
        success: false,
        error: "Unable to check user plan"
      }, { status: 500 });
    }

    const userPlan = userProfile?.subscription_plan || 'free';
    const variantLimit = getVariantLimit(userPlan);

    // Get current variant count
    const { count: currentVariants, error: countError } = await authenticatedSupabase
      .from("variants")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("isArchived", false);

    if (countError) {
      console.error("Error counting variants:", countError);
      return NextResponse.json({
        success: false,
        error: "Unable to check current variant count"
      }, { status: 500 });
    }

    const totalVariantsToAdd = variantsToAdd.reduce((sum: number, variant: any) => {
      return sum + (parseInt(variant.quantity) || 1);
    }, 0);

   

    const currentCount = currentVariants || 0;
    const remaining = Math.max(0, variantLimit - currentCount);

    if (currentCount + totalVariantsToAdd > variantLimit) {
      return NextResponse.json({
        success: false,
        error: "Variant limit exceeded",
        message: remaining === 0
          ? `Variant limit reached. Your ${userPlan} plan allows up to ${variantLimit.toLocaleString()} available variants. You currently have ${currentCount.toLocaleString()} available variants. Please upgrade your plan to add more variants.`
          : `Variant limit exceeded. Your ${userPlan} plan allows up to ${variantLimit.toLocaleString()} available variants. You currently have ${currentCount.toLocaleString()} available variants and are trying to add ${totalVariantsToAdd} more. Only ${remaining} slots remaining. Please adjust your quantities to ${remaining} total or upgrade your plan.`,
        data: {
          current: currentCount,
          limit: variantLimit,
          remaining: remaining,
          plan: userPlan
        }
      }, { status: 400 });
    }

    // Get the highest serial_number for this user
   
    const { data: maxSerialData, error: serialError } = await authenticatedSupabase
      .from("variants")
      .select("serial_number")
      .eq("user_id", user.id)
      .order("serial_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (serialError) {
      console.error("Error fetching serial number:", serialError);
      return NextResponse.json({
        success: false,
        error: "Error fetching serial number",
        details: serialError.message
      }, { status: 500 });
    }

    let nextSerial = 1;
    if (maxSerialData && maxSerialData.serial_number) {
      const last = parseInt(maxSerialData.serial_number, 10);
      nextSerial = isNaN(last) ? 1 : last + 1;
    }


    // Check if product already exists for this user with the same SKU
   
    const { data: existingProduct, error: checkError } = await authenticatedSupabase
      .from("products")
      .select("id, sku")
      .eq("sku", productForm.sku)
      .eq("user_id", user.id)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      console.error("Error checking product:", checkError);
      return NextResponse.json({
        success: false,
        error: "Error checking existing product",
        details: checkError.message
      }, { status: 500 });
    }

    let productId;

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
            status: productForm.status,
            image: productForm.image,
            size_category: productForm.sizeCategory,
            user_id: user.id,
          },
        ])
        .select()
        .single();

      if (productError) {
        console.error("Error inserting product:", productError);
        return NextResponse.json({
          success: false,
          error: "Error creating product",
          details: productError.message
        }, { status: 500 });
      }

      productId = insertedProduct.id;
    
    } else {
      productId = existingProduct.id;
      console.log("Using existing product ID:", productId);
    }

    // Prepare variants with proper serial numbers
    console.log("Preparing variants...");
    const variantsToInsert = [];
    const today = new Date().toISOString().slice(0, 10);

    for (const variant of variantsToAdd) {
      const quantity = parseInt(variant.quantity) || 1;
      console.log(`Adding ${quantity} variants for size ${variant.size}`);

      for (let i = 0; i < quantity; i++) {
        variantsToInsert.push({
          id: uuidv4(),
          product_id: productId,
          size: variant.size,
          status: variant.status || "Available",
          location: variant.location,
          serial_number: nextSerial++,
          user_id: user.id,
          date_added: today,
          variant_sku: `${productForm.sku}-${variant.size}-${nextSerial - 1}`,
          cost_price: productForm.originalPrice || 0.00,
          size_label: variant.size_label || "US",
        });
      }
    }

    console.log("Inserting variants:", variantsToInsert.length);
    const { error: variantError } = await authenticatedSupabase
      .from("variants")
      .insert(variantsToInsert);

    if (variantError) {
      console.error("Error inserting variants:", variantError);
      return NextResponse.json({
        success: false,
        error: "Error creating variants",
        details: variantError.message
      }, { status: 500 });
    }

    console.log("Successfully added product and variants");
    revalidatePath("/inventory");

    return NextResponse.json({
      success: true,
      message: "Product and variants added successfully",
      data: {
        productId,
        variantsAdded: variantsToInsert.length,
        productName: productForm.name
      }
    });

  } catch (error) {
    console.error("Unexpected error in add-product:", error);
    return NextResponse.json({
      success: false,
      error: "Unexpected server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

// Apply security wrapper to the handler
export const POST = secureAPI(handleAddProduct, {
  ...secureConfigs.authenticated,
  allowedMethods: ['POST'],
  rateLimit: { windowMs: 60 * 1000, maxRequests: 30 }, // 30 requests per minute
  validation: validateAddProductRequest,
});
