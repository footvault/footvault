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
        productSizeCategory: variant.products.size_category
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

  // Fetch variants as before
  const { data: allVariants, error: variantsError } = await getAvailableVariants(user.id);

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
  const error = variantsError || avatarsJson.error || templatesJson.error;

  if (error) {
    console.error("Failed to load initial data for checkout:", error);
  }

  return (
    <CheckoutPageClient
      allVariants={allVariants || []}
      avatars={avatars || []}
      profitTemplates={profitTemplates || []}
      error={error}
    />
  );
}
