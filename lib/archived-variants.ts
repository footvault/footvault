"use server"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"

// Fetch all archived variants for the user, including their parent product info
export async function getArchivedVariantsWithProduct() {
  const cookieStore = cookies()
  const supabase = await createClient(cookieStore)

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return []
  }

  // Get all archived variants
  const { data: variants, error } = await supabase
    .from("variants")
    .select("*, product:product_id(*)")
    .eq("user_id", user.id)
    .eq("isArchived", true)
    .eq("status", "Available")
    .order("created_at", { ascending: false })

  if (error || !variants) {
    return []
  }

  // Group by product
  const grouped: Record<string, { product: any, variants: any[] }> = {}
  for (const variant of variants) {
    const productId = variant.product_id
    if (!grouped[productId]) {
      grouped[productId] = {
        product: variant.product,
        variants: [],
      }
    }
    grouped[productId].variants.push(variant)
  }
  return Object.values(grouped)
}
