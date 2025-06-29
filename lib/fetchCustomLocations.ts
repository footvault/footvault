import { createBrowserClient } from "@supabase/ssr"

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
    return { success: false, error: "Not authenticated" }
  }

  // Step 2: Fetch only this user's custom locations
  const { data, error } = await supabase
    .from("custom_locations")
    .select("name")
    .eq("user_id", user.id) // Filter by user_id
    .order("name", { ascending: true })

  if (error) {
    console.error("Error fetching locations:", error)
    return { success: false, error: error.message }
  }

  return { success: true, data: data.map((item) => item.name) }
}
