import { createClient } from "@/lib/supabase/server";
import { reconcileUserSubscription } from "@/lib/creem/subscription-sync";
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
    .select("plan, next_billing_date, subscription_status, subscription_ends_at, subscription_id, creem_customer_id")
    .eq("id", user.id)
    .single();

  console.log("Database query result:", { data, error });

  if (error) {
    console.log("Database error occurred:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  const reconciledData = await reconcileUserSubscription({
    id: user.id,
    email: user.email || "",
    plan: data.plan,
    next_billing_date: data.next_billing_date,
    subscription_status: data.subscription_status,
    subscription_ends_at: data.subscription_ends_at,
    subscription_id: data.subscription_id,
    creem_customer_id: data.creem_customer_id,
  });

  console.log("Successfully retrieved user plan data:", {
    plan: reconciledData.plan,
    nextBillingDate: reconciledData.next_billing_date,
    subscriptionStatus: reconciledData.subscription_status,
    subscriptionEndsAt: reconciledData.subscription_ends_at,
  });

  return NextResponse.json({
    success: true,
    plan: reconciledData.plan,
    nextBillingDate: reconciledData.next_billing_date,
    subscriptionStatus: reconciledData.subscription_status || (reconciledData.plan === "Free" ? "free" : "active"),
    subscriptionEndsAt: reconciledData.subscription_ends_at,
  });
}