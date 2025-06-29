import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

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

    const body = await req.json();
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
        .update(JSON.stringify(body))
        .digest("hex");
      if (signature !== expectedSignature) {
        console.error("Invalid signature");
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    if (!["payment.successful", "checkout.completed", "subscription.created", "subscription.updated", "subscription.paid"].includes(eventType)) {
      console.log("Ignoring event:", eventType);
      return NextResponse.json({ message: "Event ignored" }, { status: 200 });
    }

    // Determine the plan based on product name or ID
    let plan = "Free";
    const productName = body.object?.product?.name?.toLowerCase() || "";
    if (productName.includes("store") || product_id?.toLowerCase().includes("store")) {
      plan = "Store";
    } else if (productName.includes("team") || product_id?.toLowerCase().includes("team")) {
      plan = "Team";
    } else if (productName.includes("individual") || product_id?.toLowerCase().includes("individual")) {
      plan = "Individual";
    }

    // Set next billing date
    let nextBillingDate;
    if (body.object?.next_transaction_date) {
      nextBillingDate = new Date(body.object.next_transaction_date);
    } else {
      nextBillingDate = new Date();
      nextBillingDate.setDate(nextBillingDate.getDate() + 30);
    }
    const formattedDate = nextBillingDate.toISOString().split("T")[0];

    // Use service role client - bypasses RLS
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from("users")
      .select("id, email")
      .ilike("email", userEmail.trim().toLowerCase())
      .single();

    if (checkError || !existingUser) {
      console.error("User not found with email:", userEmail, "Error:", checkError);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userId = existingUser.id;
    console.log("Found user ID:", userId, "for email:", userEmail);

    // Update plan + billing date using service role client
    const { data: updateData, error: updateError } = await supabaseAdmin
      .from("users")
      .update({
        plan,
        next_billing_date: formattedDate,
        subscription_id: subscription_id || null,
        creem_customer_id: customer_id || null,
      })
      .eq("id", userId)
      .select();

    if (updateError) {
      console.error("Failed to update users table:", updateError);
      return NextResponse.json({ error: "Failed DB update" }, { status: 500 });
    }

    // Update user metadata using service role client
    const { error: metadataError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: {
        plan,
        subscription_id,
        customer_id,
        order_id,
        creem_customer_id: customer_id,
        updated_at: new Date().toISOString(),
      },
    });

    if (metadataError) {
      console.warn("Metadata update failed:", metadataError);
    }

    console.log(`✅ User ${userId} (${userEmail}) upgraded to ${plan}`);
    return NextResponse.json({
      message: "User updated",
      user_id: userId,
      user_email: userEmail,
      plan,
      subscription_id,
    });
  } catch (err) {
    console.error("Webhook handler error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ message: "Webhook endpoint is alive ✅" });
}