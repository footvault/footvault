import { NextResponse } from 'next/server';
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: Request) {
  try {
    const { locationName } = await request.json();

    if (!locationName) {
      return NextResponse.json({ 
        success: false, 
        error: "Location name is required" 
      }, { status: 400 });
    }

    // Get authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({
        success: false,
        error: "No authorization header"
      }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    
    // Create authenticated Supabase client
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

    // Get the current user
    const { data: { user }, error: userError } = await authenticatedSupabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({
        success: false,
        error: "Authentication required"
      }, { status: 401 });
    }

    // Insert the custom location
    const { data, error } = await authenticatedSupabase
      .from('custom_locations')
      .insert([
        { 
          name: locationName,
          user_id: user.id 
        }
      ])
      .select()
      .single();

    if (error) {
      console.error("Error adding custom location:", error);
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: data
    });

  } catch (error: any) {
    console.error("Error in addCustomLocation API route:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
