import { NextResponse } from 'next/server';
import { createClient } from "@supabase/supabase-js";
import { getVariantLimit } from "@/lib/utils/variant-limits";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(request: Request) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the current user's ID from the authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        {
          success: false,
          error: "No authorization header",
        },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required",
        },
        { status: 401 }
      );
    }

    // Create authenticated Supabase client with user's token
    const authenticatedSupabase = createClient(
      supabaseUrl,
      supabaseKey,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );

    // Get user's current plan
    const { data: userData, error: userDataError } = await authenticatedSupabase
      .from("users")
      .select("plan")
      .eq("id", user.id)
      .single();

    if (userDataError) {
      console.error("Error fetching user data:", userDataError);
      return NextResponse.json(
        { success: false, error: "Failed to fetch user subscription plan" },
        { status: 500 }
      );
    }

    const userPlan = userData?.plan || 'Free';
    const variantLimit = getVariantLimit(userPlan);

    // Count existing variants with "Available" status for this user
    const { data: existingVariantsCount, error: countError } = await authenticatedSupabase
      .from("variants")
      .select("id", { count: 'exact' })
      .eq("user_id", user.id)
      .eq("status", "Available");

    if (countError) {
      console.error("Error counting existing available variants:", countError);
      return NextResponse.json(
        { success: false, error: "Failed to check existing available variants" },
        { status: 500 }
      );
    }

    const currentAvailableVariantCount = existingVariantsCount?.length || 0;
    const remainingVariants = Math.max(0, variantLimit - currentAvailableVariantCount);

    return NextResponse.json({
      success: true,
      data: {
        plan: userPlan,
        limit: variantLimit,
        current: currentAvailableVariantCount,
        remaining: remainingVariants,
        isAtLimit: currentAvailableVariantCount >= variantLimit
      }
    });

  } catch (error: any) {
    console.error("Error in variant-limits API route:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "An error occurred while checking variant limits",
      },
      { status: 500 }
    );
  }
}
