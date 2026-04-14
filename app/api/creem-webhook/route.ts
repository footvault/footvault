import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const PRODUCT_ID_TO_PLAN = new Map(
  [
    [process.env.CREEM_PLAN_ID_INDIVIDUAL, "Individual"],
    [process.env.CREEM_PLAN_ID_INDIVIDUAL_YEARLY, "Individual"],
    [process.env.CREEM_PLAN_ID_TEAM, "Team"],
    [process.env.CREEM_PLAN_ID_TEAM_YEARLY, "Team"],
    [process.env.CREEM_PLAN_ID_STORE, "Store"],
    [process.env.CREEM_PLAN_ID_STORE_YEARLY, "Store"],
  ].filter((entry): entry is [string, string] => Boolean(entry[0]))
);

function normalizeEventType(eventType?: string) {
  switch (eventType) {
    case "subscription.created":
    case "subscription.active":
    case "subscription.updated":
    case "subscription.update":
    case "subscription.paid":
    case "checkout.completed":
      return "active";
    case "subscription.scheduled_cancel":
      return "scheduled_cancel";
    case "subscription.canceled":
      return "canceled";
    case "subscription.past_due":
      return "past_due";
    case "subscription.expired":
      return "expired";
    default:
      return null;
  }
}

function extractPlan(productId?: string, productName?: string, currentPlan?: string | null) {
  if (productId && PRODUCT_ID_TO_PLAN.has(productId)) {
    return PRODUCT_ID_TO_PLAN.get(productId)!;
  }

  const normalizedName = productName?.toLowerCase() || "";
  if (normalizedName.includes("store")) return "Store";
  if (normalizedName.includes("team")) return "Team";
  if (normalizedName.includes("individual")) return "Individual";
  return currentPlan || "Free";
}

function getRelevantDate(body: any) {
  return (
    body.object?.current_period_end_date ||
    body.object?.subscription?.current_period_end_date ||
    body.object?.next_transaction_date ||
    body.current_period_end_date ||
    body.next_transaction_date ||
    null
  );
}

function hasFutureOrCurrentAccess(dateValue: string | null) {
  if (!dateValue) return false;

  const accessDate = new Date(dateValue);
  if (Number.isNaN(accessDate.getTime())) return false;

  accessDate.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return accessDate >= today;
}

// Create service role client that bypasses RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // This bypasses RLS
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(req: Request) {
  console.log("=== CREEM WEBHOOK START ===");
  try {
    const headers = Object.fromEntries(req.headers.entries());
    console.log("Headers:", headers);

    const rawBody = await req.text();
    const body = JSON.parse(rawBody);
    console.log("Webhook Payload:", JSON.stringify(body, null, 2));

    // Extract event type and user email
    let eventType = body.eventType || body.event;
    let userEmail = body.object?.customer?.email;
    let product_id = body.product_id || body.object?.product?.id;
    let subscription_id = body.subscription_id || body.object?.subscription?.id || body.object?.id;
    let customer_id = body.customer_id || body.object?.customer?.id;
    let order_id = body.order_id || body.object?.order?.id || body.object?.last_transaction?.order;
    let signature = headers['creem-signature'];

    console.log("Extracted eventType:", eventType, "userEmail:", userEmail);

    if (!userEmail || !eventType) {
      console.error("Missing user email or event type");
      return NextResponse.json({ error: "Missing user email or event type" }, { status: 400 });
    }

    // Signature verification
    if (process.env.NODE_ENV === "production" && process.env.CREEM_WEBHOOK_SECRET) {
      const expectedSignature = crypto
        .createHmac("sha256", process.env.CREEM_WEBHOOK_SECRET)
        .update(rawBody)
        .digest("hex");
      if (signature !== expectedSignature) {
        console.error("Invalid signature");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const normalizedEvent = normalizeEventType(eventType);
    if (!normalizedEvent) {
      console.log("Ignoring event:", eventType);
      return NextResponse.json({ message: "Event ignored" }, { status: 200 });
    }

    // Use service role client - bypasses RLS
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from("users")
      .select("id, email, plan, next_billing_date")
      .ilike("email", userEmail.trim().toLowerCase())
      .single();

    if (checkError || !existingUser) {
      console.error("User not found with email:", userEmail, "Error:", checkError);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userId = existingUser.id;
    console.log("Found user ID:", userId, "for email:", userEmail);

    const relevantDate = getRelevantDate(body);
    const formattedDate = relevantDate ? new Date(relevantDate).toISOString().split("T")[0] : null;
    const plan = extractPlan(product_id, body.object?.product?.name, existingUser.plan);

    const updatePayload: Record<string, any> = {
      creem_customer_id: customer_id || null,
    };

    if (normalizedEvent === "active") {
      updatePayload.plan = plan;
      updatePayload.next_billing_date = formattedDate || existingUser.next_billing_date || null;
      updatePayload.subscription_status = "active";
      updatePayload.subscription_ends_at = null;
      updatePayload.subscription_id = subscription_id || null;
    }

    if (normalizedEvent === "scheduled_cancel") {
      updatePayload.plan = plan;
      updatePayload.subscription_status = "scheduled_cancel";
      updatePayload.subscription_ends_at = formattedDate || existingUser.next_billing_date || null;
      updatePayload.next_billing_date = formattedDate || existingUser.next_billing_date || null;
      updatePayload.subscription_id = subscription_id || null;
    }

    if (normalizedEvent === "past_due") {
      updatePayload.plan = plan;
      updatePayload.subscription_status = "past_due";
      updatePayload.subscription_ends_at = formattedDate || existingUser.next_billing_date || null;
      updatePayload.next_billing_date = formattedDate || existingUser.next_billing_date || null;
      updatePayload.subscription_id = subscription_id || null;
    }

    if (normalizedEvent === "canceled" || normalizedEvent === "expired") {
      const accessEndDate = formattedDate || existingUser.next_billing_date || new Date().toISOString().split("T")[0];
      const stillHasAccess = hasFutureOrCurrentAccess(accessEndDate);

      updatePayload.plan = stillHasAccess ? plan : "Free";
      updatePayload.subscription_status = stillHasAccess ? "scheduled_cancel" : normalizedEvent;
      updatePayload.subscription_ends_at = accessEndDate;
      updatePayload.next_billing_date = stillHasAccess ? accessEndDate : null;
      updatePayload.subscription_id = stillHasAccess ? subscription_id || null : null;
    }

    const { data: updateData, error: updateError } = await supabaseAdmin
      .from("users")
      .update(updatePayload)
      .eq("id", userId)
      .select();

    if (updateError) {
      console.error("Failed to update users table:", updateError);
      return NextResponse.json({ error: "Failed DB update" }, { status: 500 });
    }

    // Update user metadata using service role client
    const { error: metadataError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: {
        plan: updatePayload.plan,
        subscription_id: updatePayload.subscription_id,
        customer_id,
        order_id,
        creem_customer_id: customer_id,
        subscription_status: updatePayload.subscription_status,
        subscription_ends_at: updatePayload.subscription_ends_at,
        next_billing_date: updatePayload.next_billing_date,
        updated_at: new Date().toISOString(),
      },
    });

    if (metadataError) {
      console.warn("Metadata update failed:", metadataError);
    }

    console.log(`✅ User ${userId} (${userEmail}) subscription state updated to ${updatePayload.subscription_status}`);
    return NextResponse.json({
      message: "User updated",
      user_id: userId,
      user_email: userEmail,
      plan: updatePayload.plan,
      subscription_id: updatePayload.subscription_id,
      subscription_status: updatePayload.subscription_status,
    });
  } catch (err) {
    console.error("Webhook handler error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ message: "Webhook endpoint is alive ✅" });
}