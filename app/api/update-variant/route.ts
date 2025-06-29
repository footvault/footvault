import { NextResponse } from 'next/server';
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function PUT(request: Request) {
  try {
    const { variantId, status, location } = await request.json();

    if (!variantId) {
      return NextResponse.json({ 
        success: false, 
        error: "Variant ID is required" 
      }, { status: 400 });
    }

    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({
        success: false,
        error: "No authorization header"
      }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
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

    const { data: { user }, error: userError } = await authenticatedSupabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({
        success: false,
        error: "Authentication required"
      }, { status: 401 });
    }

    const { error: updateError } = await authenticatedSupabase
      .from('variants')
      .update({
        status: status,
        location: location,
        updated_at: new Date().toISOString()
      })
      .eq('id', variantId);

    if (updateError) {
      console.error("Error updating variant:", updateError);
      return NextResponse.json({ 
        success: false, 
        error: updateError.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Variant updated successfully"
    });

  } catch (error: any) {
    console.error("Error in updateVariant API route:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
