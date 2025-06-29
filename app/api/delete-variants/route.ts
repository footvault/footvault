import { NextResponse } from 'next/server';
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function DELETE(request: Request) {
  try {
    const { variantIds } = await request.json();

    if (!variantIds || !Array.isArray(variantIds) || variantIds.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: "Variant IDs array is required" 
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

    const { error: deleteError } = await authenticatedSupabase
      .from('variants')
      .delete()
      .in('id', variantIds);

    if (deleteError) {
      console.error("Error deleting variants:", deleteError);
      return NextResponse.json({ 
        success: false, 
        error: deleteError.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Variants deleted successfully"
    });

  } catch (error: any) {
    console.error("Error in deleteVariants API route:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
