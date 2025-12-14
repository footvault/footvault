import { createBrowserClient } from "@supabase/ssr"

export interface CustomLocation {
  id: string
  name: string
  user_id: string
  created_at: string
  updated_at: string
}

export async function fetchCustomLocations() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  const supabase = createBrowserClient(supabaseUrl, supabaseKey)

  // Step 1: Get the current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    console.error("Error getting user:", userError)
    return { success: false, error: "Not authenticated", data: [] }
  }

  // Step 2: Fetch only this user's custom locations with full objects
  const { data, error } = await supabase
    .from("custom_locations")
    .select("*")
    .eq("user_id", user.id) // Filter by user_id
    .order("name", { ascending: true })

  if (error) {
    console.error("Error fetching locations:", error)
    return { success: false, error: error.message, data: [] }
  }

  return { success: true, data: data as CustomLocation[] }
}
