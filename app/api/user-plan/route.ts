import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/user-plan
export async function GET(req: Request) {
  console.log("GET /api/user-plan - Request received");
  
  const supabase = await createClient(req);
  console.log("Supabase client created");
  
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  console.log("User authentication check:", { user: user ? { id: user.id, email: user.email } : null, userError });

  if (!user) {
    console.log("User not authenticated - returning 401");
    return NextResponse.json({ success: false, error: "User not found or not authenticated." }, { status: 401 });
  }

  console.log("Fetching user plan data for user ID:", user.id);
  const { data, error } = await supabase
    .from("users")
    .select("plan, next_billing_date")
    .eq("id", user.id)
    .single();

  console.log("Database query result:", { data, error });

  if (error) {
    console.log("Database error occurred:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  console.log("Successfully retrieved user plan data:", {
    plan: data.plan,
    nextBillingDate: data.next_billing_date
  });

  return NextResponse.json({
    success: true,
    plan: data.plan,
    nextBillingDate: data.next_billing_date,
  });
}