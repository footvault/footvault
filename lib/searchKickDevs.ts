// Import the KicksDevSearchItem interface from actions
import type { KicksDevSearchItem } from "@/app/actions"

const KICKS_DEV_BASE_URL = "https://api.kicks.dev/v3/stockx"

// Debug log to check if the environment variable is being read
console.log("NEXT_PUBLIC_KICKS_DEV_API_KEY from environment:", process.env.NEXT_PUBLIC_KICKS_DEV_API_KEY);

export async function searchKicksDev(
  query: string,
): Promise<{ success: boolean; data?: KicksDevSearchItem[]; error?: string }> {
  if (!process.env.NEXT_PUBLIC_KICKS_DEV_API_KEY) {
    console.error("NEXT_PUBLIC_KICKS_DEV_API_KEY is not set or accessible.")
    return { success: false, error: "NEXT_PUBLIC_KICKS_DEV_API_KEY is not set." }
  }
  if (!query) {
    return { success: false, error: "Search query cannot be empty." }
  }

  try {
    const options = {
      method: "GET",
      headers: {
        Authorization: `${process.env.NEXT_PUBLIC_KICKS_DEV_API_KEY}`,
        "Content-Type": "application/json",
      },
    }

    const response = await fetch(`${KICKS_DEV_BASE_URL}/products?query=${encodeURIComponent(query)}`, options)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Kicks.dev search API error: ${response.status} - ${errorText}`)
      return { success: false, error: `Failed to search products: ${response.statusText}` }
    }

    const result = await response.json()
    if (result.status === "success" && Array.isArray(result.data)) {
      // Map the API response to match the KicksDevSearchItem interface
      const mappedData = result.data.map((item: any) => ({
        id: item.id,
        title: item.title || item.name,
        image: item.image || item.imageUrl,
        brand: item.brand,
        sku: item.sku,
        category: item.category
      }))
      return { success: true, data: mappedData }
    } else {
      return { success: false, error: result.message || "Unexpected API response format." }
    }
  } catch (e: any) {
    console.error("Error calling Kicks.dev search API:", e)
    return { success: false, error: `Network error: ${e.message}` }
  }
}