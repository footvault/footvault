import { NextResponse } from 'next/server';
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const KICKS_DEV_API_KEY = process.env.KICKS_DEV_API_KEY;
const KICKS_DEV_BASE_URL = "https://api.kicks.dev/v3/stockx";

export async function POST(request: Request) {
  try {
    const { query } = await request.json();

    if (!query) {
      return NextResponse.json({
        success: false,
        error: "Query is required"
      }, { status: 400 });
    }

    if (!KICKS_DEV_API_KEY) {
      return NextResponse.json({
        success: false,
        error: "KicksDev API key is not configured"
      }, { status: 500 });
    }

    const response = await fetch(`${KICKS_DEV_BASE_URL}/search?query=${encodeURIComponent(query)}`, {
      headers: {
        'Authorization': `Bearer ${KICKS_DEV_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error(`KicksDev API responded with ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      data: data
    });

  } catch (error: any) {
    console.error("Error in searchKicksDev API route:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
