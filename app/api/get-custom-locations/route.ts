import { NextResponse } from 'next/server';
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(request: Request) {
  try {
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

    // Get custom locations for the current user
    const { data: locations, error: locationsError } = await authenticatedSupabase
      .from('custom_locations')
      .select('*')
      .eq('user_id', user.id);

    if (locationsError) {
      console.error("Error fetching custom locations:", locationsError);
      return NextResponse.json({ 
        success: false, 
        error: locationsError.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: locations
    });

  } catch (error: any) {
    console.error("Error in getCustomLocations API route:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
