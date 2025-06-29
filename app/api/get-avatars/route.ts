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

    // Get avatars for the current user
    let { data: avatars, error: avatarsError } = await authenticatedSupabase
      .from('avatars')
      .select('*')
      .eq('user_id', user.id);

    if (avatarsError) {
      console.error("Error fetching avatars:", avatarsError);
      return NextResponse.json({ 
        success: false, 
        error: avatarsError.message 
      }, { status: 500 });
    }

    // If no avatars, create a main avatar based on user's name
    if (!avatars || avatars.length === 0) {
      // Fetch user profile/name from users table
      const { data: userProfile, error: userProfileError } = await authenticatedSupabase
        .from('users')
        .select('name')
        .eq('id', user.id)
        .single();
      let mainName = userProfile?.name || 'Main Account';
      // Insert main avatar
      const { data: inserted, error: insertError } = await authenticatedSupabase
        .from('avatars')
        .insert([
          { name: mainName, default_percentage: 100, user_id: user.id }
        ])
        .select('*');
      if (!insertError && inserted && inserted.length > 0) {
        avatars = inserted;
      }
    }

    return NextResponse.json({ success: true, data: avatars });
  } catch (error: any) {
    console.error("Error in getAvatars API route:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
