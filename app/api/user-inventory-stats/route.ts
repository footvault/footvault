import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/user-inventory-stats?userId=xxx
export async function GET(req: Request) {
 

  const supabase = await createClient(req);

   const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: false, error: "User not found or not authenticated." }, { status: 401 });
  }

  // Run all count queries in parallel instead of sequentially
  const [availableResult, soldResult, totalResult] = await Promise.all([
    supabase
      .from("variants")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "Available"),
    supabase
      .from("variants")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "Sold"),
    supabase
      .from("variants")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);

  const { count: availableCount, error: availableError } = availableResult;
  const { count: soldCount, error: soldError } = soldResult;
  const { count: totalVariants, error: totalError } = totalResult;

  if (availableError || soldError || totalError) {
    return NextResponse.json({ success: false, error: availableError?.message || soldError?.message || totalError?.message }, { status: 500 });
  }

  // If user exceeds 10,000 variants, return a special flag
  if ((totalVariants ?? 0) >= 10000) {
    return NextResponse.json({
      success: false,
      overLimit: true,
      message: "You have reached the maximum allowed inventory. Please contact us for enterprise solutions.",
      availableShoes: availableCount || 0,
      soldShoes: soldCount || 0,
      totalVariants: totalVariants || 0
    }, { status: 403 });
  }

  return NextResponse.json({
    success: true,
    availableShoes: availableCount || 0,
    soldShoes: soldCount || 0,
    totalVariants: totalVariants || 0
  });
}
