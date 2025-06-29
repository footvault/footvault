import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { planType } = await req.json();

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

    // Map planType to productId
    let productId = process.env.CREEM_PLAN_ID_INDIVIDUAL;
    if (planType === 'team') productId = process.env.CREEM_PLAN_ID_TEAM;
    if (planType === 'store') productId = process.env.CREEM_PLAN_ID_STORE;

    console.log('Creating checkout for user:', user.id, 'plan:', planType, 'productId:', productId);

    // CREATE the checkout session on Creem's test API
    const creemRes = await fetch("https://test-api.creem.io/v1/checkouts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.CREEM_API_KEY!,
      },
      body: JSON.stringify({
        product_id: productId,
        request_id: user.id, // Keep this for backward compatibility
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscription/success`,
        // Add metadata to ensure user_id gets passed through
        metadata: {
          user_id: user.id,
          plan_type: planType,
          source: "webapp"
        },
        // If Creem supports customer data, pass it here too
        customer: {
          email: userData?.email || user.email,
          name: userData?.username || user.user_metadata?.username || "User",
          metadata: {
            user_id: user.id,
            plan_type: planType
          }
        }
      }),
    });

    let creemText = await creemRes.text();
    let creemJson = null;
    try { 
      creemJson = JSON.parse(creemText); 
    } catch (e) {
      console.error("Failed to parse Creem response:", creemText);
    }
    
    console.log('Creem API raw response:', creemText);
    
    if (!creemRes.ok) {
      console.error("Creem API error:", creemText);
      return NextResponse.json({ 
        error: creemJson?.error || creemText || "Failed to create checkout" 
      }, { status: creemRes.status });
    }

    const checkout_url = creemJson?.checkout_url;
    console.log('Checkout URL:', checkout_url);
    
    if (checkout_url) {
      return NextResponse.json({ success: true, url: checkout_url });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: creemJson?.error || 'No checkout URL returned' 
      }, { status: 400 });
    }
  } catch (error) {
    console.error("Checkout creation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}