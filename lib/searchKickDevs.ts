

// Define the expected structure for search results
export interface KicksDevSearchItem {
  id: string;
  title: string;
  image?: string;
  brand?: string;
  sku?: string;
  category?: string;
}

const KICKS_DEV_BASE_URL = "https://api.kicks.dev/v3/stockx"

// Debug log to check if the environment variable is being read
console.log("NEXT_PUBLIC_KICKS_DEV_API_KEY from environment:", process.env.NEXT_PUBLIC_KICKS_DEV_API_KEY);

export async function searchKicksDev(
  query: string,
): Promise<{ success: boolean; data?: KicksDevSearchItem[]; error?: string }> {
  console.log("🔍 searchKicksDev called with query:", query);
  
  if (!process.env.NEXT_PUBLIC_KICKS_DEV_API_KEY) {
    console.error("❌ NEXT_PUBLIC_KICKS_DEV_API_KEY is not set or accessible.")
    return { success: false, error: "NEXT_PUBLIC_KICKS_DEV_API_KEY is not set." }
  }
  if (!query) {
    console.log("❌ Search query is empty");
    return { success: false, error: "Search query cannot be empty." }
  }

  try {
    const url = `${KICKS_DEV_BASE_URL}/products?query=${encodeURIComponent(query)}`;
    console.log("🌐 Making request to URL:", url);
    
    const options = {
      method: "GET",
      headers: {
        Authorization: `${process.env.NEXT_PUBLIC_KICKS_DEV_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
    console.log("📋 Request options:", JSON.stringify(options, null, 2));

    const response = await fetch(url, options)
    console.log("📡 Response status:", response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Kicks.dev search API error: ${response.status} - ${errorText}`)
      return { success: false, error: `Failed to search products: ${response.statusText}` }
    }

    const result = await response.json()
    console.log('📦 Search API Response (full):', JSON.stringify(result, null, 2));
    console.log('📊 Response data type:', typeof result.data);
    console.log('📊 Response data isArray:', Array.isArray(result.data));
    console.log('📊 Response data length:', result.data?.length);
    
    // New v3 API response structure: { $schema, data: [...], meta }
    if (result.data && Array.isArray(result.data)) {
      console.log('✅ Found valid data array, mapping items...');
      // Map the API response to match the KicksDevSearchItem interface
      const mappedData = result.data.map((item: any, index: number) => {
        console.log(`🔄 Mapping item ${index}:`, JSON.stringify(item, null, 2));
        return {
          id: item.id,
          title: item.title || item.name,
          image: item.image || item.imageUrl,
          brand: item.brand,
          sku: item.sku,
          category: item.category
        };
      })
      
      console.log('✅ Mapped data:', JSON.stringify(mappedData, null, 2));
      return { success: true, data: mappedData }
    } else {
      console.error('❌ Unexpected search response structure. Expected {data: [...], meta}');
      console.error('❌ Actual response keys:', Object.keys(result));
      console.error('❌ Full response:', JSON.stringify(result, null, 2));
      return { success: false, error: "Unexpected API response format." }
    }
  } catch (e: any) {
    console.error("Error calling Kicks.dev search API:", e)
    return { success: false, error: `Network error: ${e.message}` }
  }
}