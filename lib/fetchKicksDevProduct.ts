// Define or import the KicksDevProduct type
type KicksDevProduct = {
  brand: string;
  sku: string;
  category: string;
  secondary_category: string;
  image: string;
  min_price: number;
  avg_price: number;
  max_price: number;
  traits: never[];
  variants: never[];
  title: string;
  id: string;
  name: string;
  price: number;
  // Add other fields as needed
};

export async function fetchKicksDevProduct(
  id: string,
): Promise<{ success: boolean; data?: KicksDevProduct; error?: string }> {
  const KICKS_DEV_API_KEY = process.env.NEXT_PUBLIC_KICKS_DEV_API_KEY;
  const KICKS_DEV_BASE_URL = "https://api.kicks.dev/v3/stockx";

  if (!KICKS_DEV_API_KEY) {
    return { success: false, error: "KICKS_DEV_API_KEY is not set." };
  }
  if (!id) {
    return { success: false, error: "Product ID cannot be empty." };
  }

  try {
    const response = await fetch(`${KICKS_DEV_BASE_URL}/products/${encodeURIComponent(id)}`, {
      method: "GET",
      headers: {
        Authorization: KICKS_DEV_API_KEY,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Kicks.dev product API error: ${response.status} - ${errorText}`);
      return { success: false, error: `Failed to fetch product details: ${response.statusText}` };
    }

    const result = await response.json();
    if (result.status === "success" && result.data) {
      return { success: true, data: result.data };
    } else {
      return { success: false, error: result.message || "Unexpected API response format." };
    }
  } catch (e: any) {
    console.error("Error calling Kicks.dev product details API:", e);
    return { success: false, error: `Network error: ${e.message}` };
  }
}
