// Updated type to match the new kicks.dev v3 API structure
type KicksDevProduct = {
  id: string;
  title: string;
  slug: string;
  brand: string;
  model: string;
  sku: string;
  category: string;
  secondary_category: string;
  product_type: string;
  gender: string;
  description: string;
  short_description: string | null;
  image: string;
  gallery: string[] | null;
  gallery_360: string[] | null;
  link: string | null;
  avg_price: number;
  min_price: number;
  max_price: number;
  rank: number | null;
  weekly_orders: number | null;
  upcoming: boolean | null;
  categories: string[];
  created_at: string;
  updated_at: string;
  variants?: Array<{
    id: string;
    size: string;
    size_type: string;
    lowest_ask: number;
    currency: string;
    market: string;
    updated_at: string;
  }> | null;
  traits?: Array<{
    product_id: string;
    trait: string;
    value: string;
  }> | null;
  // Legacy fields for backward compatibility
  name?: string;
  price?: number;
};

export async function fetchKicksDevProduct(
  productId: string,
): Promise<{ success: boolean; data?: KicksDevProduct; error?: string }> {
  console.log("🔍 fetchKicksDevProduct called with productId:", productId);
  
  const KICKS_DEV_API_KEY = process.env.NEXT_PUBLIC_KICKS_DEV_API_KEY;
  const KICKS_DEV_BASE_URL = "https://api.kicks.dev/v3/stockx";

  if (!KICKS_DEV_API_KEY) {
    console.error("❌ KICKS_DEV_API_KEY is not set");
    return { success: false, error: "KICKS_DEV_API_KEY is not set." };
  }
  if (!productId) {
    console.error("❌ Product ID is empty");
    return { success: false, error: "Product ID cannot be empty." };
  }

  try {
    const url = `${KICKS_DEV_BASE_URL}/products/${productId}`;
    console.log("🌐 Making request to URL:", url);
    // Updated URL to get a single product by ID
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: KICKS_DEV_API_KEY,
        "Content-Type": "application/json",
      },
    });
    
    console.log("📡 Response status:", response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Kicks.dev product API error: ${response.status} - ${errorText}`);
      return { success: false, error: `Failed to fetch product details: ${response.statusText}` };
    }

    const result = await response.json();
    console.log('📦 Product API Response (full):', JSON.stringify(result, null, 2));
    console.log('📊 Response data type:', typeof result.data);
    console.log('📊 Response data keys:', result.data ? Object.keys(result.data) : 'null');
    
    // New v3 API response structure for single product: { $schema, data: {...}, meta }
    if (result.data && typeof result.data === 'object') {
      console.log('✅ Found valid product data');
      return { success: true, data: result.data };
    } else {
      console.error('❌ Unexpected product response structure. Expected {data: {...}, meta}');
      console.error('❌ Actual response keys:', Object.keys(result));
      console.error('❌ Full response:', JSON.stringify(result, null, 2));
      return { success: false, error: "Unexpected API response format." };
    }
  } catch (e: any) {
    console.error("Error calling Kicks.dev product details API:", e);
    return { success: false, error: `Network error: ${e.message}` };
  }
}
