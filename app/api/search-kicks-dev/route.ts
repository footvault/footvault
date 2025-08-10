import { NextRequest, NextResponse } from 'next/server';
import { createClient } from "@supabase/supabase-js";
import { validateAuth, validateInput, getSecurityHeaders } from '@/lib/simple-security';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const KICKS_DEV_API_KEY = process.env.KICKS_DEV_API_KEY;
const KICKS_DEV_BASE_URL = "https://api.kicks.dev/v3/stockx";

export async function POST(request: NextRequest) {
  const securityHeaders = getSecurityHeaders();
  
  try {
    // Validate authentication
    const authResult = await validateAuth(request);
    if (!authResult.valid) {
      return NextResponse.json({
        success: false,
        error: "Authentication required"
      }, { 
        status: 401,
        headers: securityHeaders
      });
    }

    const { query } = await request.json();

    if (!query) {
      return NextResponse.json({
        success: false,
        error: "Query is required"
      }, { 
        status: 400,
        headers: securityHeaders 
      });
    }

    // Validate and sanitize input
    const sanitizedQuery = validateInput(query, 100);
    if (!sanitizedQuery || sanitizedQuery.length < 2) {
      return NextResponse.json({
        success: false,
        error: "Query must be at least 2 characters long"
      }, { 
        status: 400,
        headers: securityHeaders 
      });
    }

    if (!KICKS_DEV_API_KEY) {
      return NextResponse.json({
        success: false,
        error: "Search service temporarily unavailable"
      }, { 
        status: 503,
        headers: securityHeaders 
      });
    }

    // Log the search for monitoring
    console.log(`Product search by user ${authResult.user.id}: "${sanitizedQuery}"`);

    const response = await fetch(`${KICKS_DEV_BASE_URL}/search?query=${encodeURIComponent(sanitizedQuery)}`, {
      headers: {
        'Authorization': `Bearer ${KICKS_DEV_API_KEY}`,
      },
      // Add timeout to prevent hanging requests
      signal: AbortSignal.timeout(10000) // 10 seconds timeout
    });

    if (!response.ok) {
      // Don't expose internal API errors to client
      console.error(`KicksDev API error: ${response.status} - ${response.statusText}`);
      return NextResponse.json({
        success: false,
        error: "Search service temporarily unavailable. Please try again."
      }, { 
        status: 503,
        headers: securityHeaders 
      });
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      data: data
    }, {
      headers: securityHeaders
    });

  } catch (error: any) {
    console.error("Error in searchKicksDev API route:", error);
    
    // Handle timeout errors specifically
    if (error.name === 'AbortError') {
      return NextResponse.json({ 
        success: false, 
        error: "Search request timed out. Please try again." 
      }, { 
        status: 504,
        headers: securityHeaders 
      });
    }

    return NextResponse.json({ 
      success: false, 
      error: "An unexpected error occurred. Please try again." 
    }, { 
      status: 500,
      headers: securityHeaders 
    });
  }
}
