import { cookies } from "next/headers";
import { CheckoutPageClient } from "@/components/checkout-page-client";

import { redirect } from 'next/navigation';
import { createClient } from "@/lib/supabase/server";

// Define database types
interface DatabaseProduct {
  id: number;
  name: string;
  brand: string;
  sku: string;
  category: string | null;
  original_price: number;
  sale_price: number;
  image: string | null;
  size_category: string;
}

interface DatabaseVariant {
  id: string;
  variant_sku: string;
  size: string;
  size_label: string;
  location: string | null;
  status: string;
  serial_number: string | null;
  cost_price: number;
  products: DatabaseProduct;
}

interface TransformedVariant {
  id: string;
  variantSku: string;
  size: string;
  sizeLabel: string;
  location: string | null;
  status: string;
  serialNumber: string | null;
  costPrice: number;
  productName: any;
  productBrand: any;
  productSku: any;
  productImage: string | null;
  productOriginalPrice: number;
  productSalePrice: number;
  productCategory: string | null;
  productSizeCategory: string;
  ownerType?: 'store' | 'consignor';
  consignorId?: string;
  consignorName?: string;
  consignorCommissionRate?: number;
  // Variant-level payout settings (override consignor defaults)
  variantPayoutMethod?: 'cost_price' | 'cost_plus_fixed' | 'cost_plus_percentage' | 'percentage_split';
  variantFixedMarkup?: number;
  variantMarkupPercentage?: number;
  // Consignor default payout settings (fallback)
  consignorPayoutMethod?: 'cost_price' | 'cost_plus_fixed' | 'cost_plus_percentage' | 'percentage_split';
  consignorFixedMarkup?: number;
  consignorMarkupPercentage?: number;
}


async function getAvailablePreorders(userId: string) {
  try {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    // Fetch available pre-orders (pending, confirmed) with customer and product info
    const { data: preorders, error } = await supabase
      .from('pre_orders')
      .select(`
        id,
        pre_order_no,
        customer_id,
        product_id,
        variant_id,
        size,
        size_label,
        status,
        cost_price,
        total_amount,
        down_payment,
        down_payment_method,
        remaining_balance,
        expected_delivery_date,
        completed_date,
        notes,
        created_at,
        updated_at,
        customer:customers (
          id,
          name,
          email,
          phone,
          address,
          city,
          state,
          zip_code,
          country
        ),
        product:products (
          id,
          name,
          brand,
          sku,
          image,
          category,
          size_category,
          sale_price
        )
      `)
      .eq('user_id', userId)
      .not('user_id', 'is', null)
      .in('status', ['pending', 'confirmed']) // Only available pre-orders
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching pre-orders:", error);
      return { data: null, error: error.message };
    }

    return { data: preorders || [], error: null };
  } catch (error: any) {
    console.error("Error in getAvailablePreorders:", error);
    return { data: null, error };
  }
}

async function getAvailableVariants(userId: string) {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);
    const { data: variantsData, error: variantsError } = await supabase
      .from('variants')
      .select(`
        id,
        variant_sku,
        size,
        size_label,
        location,
        status,
        serial_number,
        cost_price,
        owner_type,
        consignor_id,
        payout_method,
        fixed_markup,
        markup_percentage,
        products (
          id,
          name,
          brand,
          sku,
          category,
          original_price,
          sale_price,
          image,
          size_category
        ),
        consignors (
          id,
          name,
          commission_rate,
          payout_method,
          fixed_markup,
          markup_percentage
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'Available')
      .eq('isArchived', false);

    if (variantsError) {
      console.error("Error fetching variants:", variantsError);
      return { data: null, error: variantsError };
    }

    if (!variantsData) {
      return { data: [], error: null };
    }

    // Transform the database response to our expected format
    const transformedVariants = variantsData.map(variant => {
      if (!variant.products) {
        console.error("Variant missing product data:", variant);
        return null;
      }

      return {
        
        id: variant.id,
        variantSku: variant.variant_sku,
        size: variant.size,
        sizeLabel: variant.size_label,
        location: variant.location,
        status: variant.status,
        serialNumber: variant.serial_number,
        costPrice: variant.cost_price,
        // @ts-ignore
        productName: variant.products.name,
         // @ts-ignore
        productBrand: variant.products.brand,
         // @ts-ignore
        productSku: variant.products.sku,
         // @ts-ignore
        productImage: variant.products.image,
         // @ts-ignore
        productOriginalPrice: variant.products.original_price,
         // @ts-ignore
        productSalePrice: variant.products.sale_price,
         // @ts-ignore
        productCategory: variant.products.category,
         // @ts-ignore
        productSizeCategory: variant.products.size_category,
        // @ts-ignore
        ownerType: variant.owner_type || 'store',
        // @ts-ignore
        consignorId: variant.consignor_id,
        // @ts-ignore
        consignorName: variant.consignors?.name,
        // @ts-ignore
        consignorCommissionRate: variant.consignors?.commission_rate,
        // Variant-level payout settings (set when adding product)
        // @ts-ignore
        variantPayoutMethod: variant.payout_method,
        // @ts-ignore
        variantFixedMarkup: variant.fixed_markup,
        // @ts-ignore
        variantMarkupPercentage: variant.markup_percentage,
        // Consignor default payout settings (fallback)
        // @ts-ignore
        consignorPayoutMethod: variant.consignors?.payout_method,
        // @ts-ignore
        consignorFixedMarkup: variant.consignors?.fixed_markup,
        // @ts-ignore
        consignorMarkupPercentage: variant.consignors?.markup_percentage
      } as TransformedVariant;
    }).filter((variant): variant is TransformedVariant => variant !== null);

    return { data: transformedVariants, error: null };
  } catch (error: any) {
    console.error("Error in getAvailableVariants:", error);
    return { data: null, error };
  }
}

export default async function CheckoutPage() {
  // Check authentication
  const cookieStore = await cookies();
  const supabase = await createClient(cookieStore);
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect unauthenticated users to home page
  if (!user) {
    redirect("/");
  }

  // Get session for access token
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect("/");
  }

  // Fetch variants and pre-orders
  const { data: allVariants, error: variantsError } = await getAvailableVariants(user.id);
  const { data: allPreorders, error: preordersError } = await getAvailablePreorders(user.id);

  // Fetch avatars and profit templates from API routes
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
  const [avatarsRes, templatesRes] = await Promise.all([
    fetch(`${baseUrl}/api/get-avatars`, {
      headers: { Authorization: `Bearer ${session.access_token}` }
    }),
    fetch(`${baseUrl}/api/get-profit-templates`, {
      headers: { Authorization: `Bearer ${session.access_token}` }
    })
  ]);

  const avatarsJson = await avatarsRes.json();
  const templatesJson = await templatesRes.json();

  const avatars = avatarsJson.success ? avatarsJson.data : [];
  const profitTemplates = templatesJson.success ? templatesJson.data : [];
  const error = variantsError || preordersError || avatarsJson.error || templatesJson.error;

  if (error) {
    console.error("Failed to load initial data for checkout:", error);
  }

  return (
    <CheckoutPageClient
      allVariants={allVariants || []}
      allPreorders={allPreorders || []}
      avatars={avatars || []}
      profitTemplates={profitTemplates || []}
      error={error}
    />
  );
}
