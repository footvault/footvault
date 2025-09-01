import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';




export async function POST(request: Request) {
  try {
    const { serialNumber } = await request.json();
   

    if (!serialNumber) {
      return NextResponse.json({ 
        success: false, 
        error: "Serial number is required" 
      }, { status: 400 });
    }

    const cookieStore = {}; // Replace with the actual cookie store object if available
    const supabase = await createClient(cookieStore);

    // Get the current user's ID from the authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({
        success: false,
        error: "No authorization header"
      }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({
        success: false,
        error: "Authentication required"
      }, { status: 401 });
    }

    // Check if the serial number exists for the current user (regardless of status)
    const { data, error } = await supabase
      .from("variants")
      .select("id")
      .eq("serial_number", serialNumber)
      .eq("user_id", user.id) // Filter by the current user's ID
      .maybeSingle(); // Use maybeSingle to allow for 0 or 1 result

  

    if (error && error.code !== "PGRST116") {
      console.error("Database error:", error);
      return NextResponse.json({ 
        success: false, 
        error: "Error checking serial number uniqueness",
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      isUnique: !data,
    });
  } catch (error: any) {
    console.error("Error in checkSerialNumber API route:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || "An error occurred while checking serial number",
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
