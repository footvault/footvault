"use server"

import { createClient } from "@supabase/supabase-js"

// Helper to get Supabase client for Server Actions
// Ensure this function is correctly defined and accessible, e.g., in lib/supabase.ts
function getSupabaseClient() {
  // This should return a Supabase client instance configured for server-side use
  // For example:
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // Use service role key for server actions if RLS is not configured for inserts
  )
}

// --- Sales Actions ---

export async function recordSaleAction(payload: {
  saleDate: string
  totalAmount: number
  totalDiscount: number
  netProfit: number
  items: { variantId: string; soldPrice: number; costPrice: number; quantity: number }[]
  profitDistribution: { avatarId: string; percentage: number; amount: number }[]
  customerName?: string // Added from your first snippet
  customerPhone?: string // Added from your first snippet
}) {
  const supabase = getSupabaseClient()

  const { saleDate, totalAmount, totalDiscount, netProfit, items, profitDistribution, customerName, customerPhone } =
    payload

  const { data: saleData, error: saleError } = await supabase
    .from("sales")
    .insert({
      sale_date: saleDate,
      total_amount: totalAmount,
      total_discount: totalDiscount,
      net_profit: netProfit,
      customer_name: customerName || null,
      customer_phone: customerPhone || null,
    })
    .select("id")
    .single()

  if (saleError) {
    console.error("Error recording sale:", saleError)
    return { success: false, error: saleError.message }
  }

  const saleId = saleData.id

  // Insert sale items
  const saleItemsPayload = items.map((item) => ({
    sale_id: saleId,
    variant_id: item.variantId,
    sold_price: item.soldPrice,
    cost_price: item.costPrice,
    quantity: item.quantity,
  }))

  // --- IMPORTANT DEBUG LOG ---
  console.log("Attempting to insert sale items with payload:", JSON.stringify(saleItemsPayload, null, 2))
  // --- END DEBUG LOG ---

  const { error: saleItemsError } = await supabase.from("sale_items").insert(saleItemsPayload)

  if (saleItemsError) {
    console.error("Error recording sale items:", saleItemsError)
    // Optionally, roll back the sale record if items fail
    await supabase.from("sales").delete().eq("id", saleId)
    return { success: false, error: saleItemsError.message }
  } else {
    console.log("Successfully inserted sale items for sale ID:", saleId)
  }

  // Insert profit distribution
  const profitDistributionPayload = profitDistribution.map((dist) => ({
    sale_id: saleId,
    avatar_id: dist.avatarId,
    percentage: dist.percentage,
    amount: dist.amount,
  }))

  const { error: profitDistError } = await supabase.from("sale_profit_distributions").insert(profitDistributionPayload)

  if (profitDistError) {
    console.error("Error recording profit distribution:", profitDistError)
    // Optionally, roll back sale and sale items if distribution fails
    await supabase.from("sales").delete().eq("id", saleId)
    return { success: false, error: profitDistError.message }
  }

  return { success: true, message: "Sale recorded successfully!", saleId }
}

// Keep other functions if they are still in use, but focus on recordSaleAction for this fix.
// If recordSaleFormData or the first recordSale are not used, you might consider removing them for clarity.
// For now, I'm only providing the updated recordSaleAction.

// The update applies to a different function, getSalesAction, which is not present in the provided existing code.
// Therefore, I cannot apply the update.
