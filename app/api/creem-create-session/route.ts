import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const PLAN_ENV_MAP = {
  monthly: {
    individual: "CREEM_PLAN_ID_INDIVIDUAL",
    team: "CREEM_PLAN_ID_TEAM",
    store: "CREEM_PLAN_ID_STORE",
  },
  yearly: {
    individual: "CREEM_PLAN_ID_INDIVIDUAL_YEARLY",
    team: "CREEM_PLAN_ID_TEAM_YEARLY",
    store: "CREEM_PLAN_ID_STORE_YEARLY",
  },
} as const;

type SupportedPlan = keyof typeof PLAN_ENV_MAP.monthly;
type BillingPeriod = keyof typeof PLAN_ENV_MAP;

function getCreemApiBaseUrl(apiKey: string): string {
  return apiKey.startsWith("creem_test_")
    ? "https://test-api.creem.io/v1"
    : "https://api.creem.io/v1";
}

function getAppOrigin(req: NextRequest): string {
  const forwardedHost = req.headers.get("x-forwarded-host");
  const forwardedProto = req.headers.get("x-forwarded-proto") || "https";

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  return req.nextUrl.origin;
}

function isSupportedPlan(value: string): value is SupportedPlan {
  return value === "individual" || value === "team" || value === "store";
}

function isBillingPeriod(value: string): value is BillingPeriod {
  return value === "monthly" || value === "yearly";
}

function getProductId(planType: SupportedPlan, billingPeriod: BillingPeriod): string | undefined {
  const envName = PLAN_ENV_MAP[billingPeriod][planType];
  return process.env[envName];
}

function extractCreemError(creemJson: any, fallbackText: string): string {
  if (typeof creemJson?.error === "string") return creemJson.error;
  if (typeof creemJson?.message === "string") return creemJson.message;
  if (Array.isArray(creemJson?.errors) && creemJson.errors.length > 0) {
    return creemJson.errors
      .map((item: any) => item?.message || item?.detail || JSON.stringify(item))
      .join("; ");
  }
  return fallbackText || "Failed to create checkout";
}

export async function POST(req: NextRequest) {
  try {
    const { planType, billingPeriod = "monthly" } = await req.json();

    if (!isSupportedPlan(planType)) {
      return NextResponse.json({ error: "Invalid plan selected" }, { status: 400 });
    }

    if (!isBillingPeriod(billingPeriod)) {
      return NextResponse.json({ error: "Invalid billing period selected" }, { status: 400 });
    }

    if (!process.env.CREEM_API_KEY) {
      return NextResponse.json({ error: "Billing is not configured yet" }, { status: 500 });
    }

    // Authenticate
    const cookieStore = (req as any).cookies ?? undefined;
    const supabase = await createClient(cookieStore);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user details from database
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("email, username")
      .eq("id", user.id)
      .single();

    if (userError) {
      console.warn("Could not fetch user details:", userError);
    }

    const productId = getProductId(planType, billingPeriod);
    if (!productId) {
      console.error("Missing Creem product ID for plan", { planType, billingPeriod });
      return NextResponse.json(
        { error: `Billing is not configured for the ${billingPeriod} ${planType} plan` },
        { status: 500 }
      );
    }

    const apiBaseUrl = getCreemApiBaseUrl(process.env.CREEM_API_KEY);
    const successUrl = `${getAppOrigin(req)}/subscription/success`;

    const checkoutPayload = {
      product_id: productId,
      success_url: successUrl,
      customer: {
        email: userData?.email || user.email,
      },
      metadata: {
        user_id: user.id,
        plan_type: planType,
        billing_period: billingPeriod,
      },
    };

    const creemRes = await fetch(`${apiBaseUrl}/checkouts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.CREEM_API_KEY,
      },
      body: JSON.stringify(checkoutPayload),
    });

    const creemText = await creemRes.text();
    let creemJson: any = null;
    try {
      creemJson = creemText ? JSON.parse(creemText) : null;
    } catch {
      console.error("Failed to parse Creem response:", creemText);
    }

    if (!creemRes.ok) {
      console.error("Creem API error:", creemText);
      return NextResponse.json({ 
        error: extractCreemError(creemJson, creemText),
      }, { status: creemRes.status });
    }

    const checkoutUrl = creemJson?.checkout_url || creemJson?.checkoutUrl || creemJson?.url;

    if (checkoutUrl) {
      return NextResponse.json({ success: true, url: checkoutUrl });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: extractCreemError(creemJson, "No checkout URL returned by billing provider"),
      }, { status: 400 });
    }
  } catch (error) {
    console.error("Checkout creation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}