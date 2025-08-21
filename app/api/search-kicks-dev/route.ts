import { NextRequest, NextResponse } from 'next/server';
import { createClient } from "@supabase/supabase-js";
import { validateAuth, validateInput, getSecurityHeaders } from '@/lib/simple-security';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const KICKS_DEV_API_KEY = process.env.NEXT_PUBLIC_KICKS_DEV_API_KEY;
const KICKS_DEV_BASE_URL = "https://api.kicks.dev/v3/stockx";

console.log("🔑 API Route - KICKS_DEV_API_KEY:", KICKS_DEV_API_KEY ? "Set" : "Not set");

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
    console.log(`🔍 Product search by user ${authResult.user.id}: "${sanitizedQuery}"`);

    // Updated URL to use the correct v3 products endpoint with query parameter
    const searchUrl = `${KICKS_DEV_BASE_URL}/products?query=${encodeURIComponent(sanitizedQuery)}&limit=20`;
    console.log("🌐 API Route - Making request to URL:", searchUrl);

    const response = await fetch(searchUrl, {
      headers: {
        'Authorization': KICKS_DEV_API_KEY, // Updated: Remove Bearer prefix for kicks.dev v3
        'Content-Type': 'application/json'
      },
      // Add timeout to prevent hanging requests
      signal: AbortSignal.timeout(10000) // 10 seconds timeout
    });

    console.log("📡 API Route - Response status:", response.status, response.statusText);

    if (!response.ok) {
      // Don't expose internal API errors to client
      const errorText = await response.text();
      console.error(`❌ API Route - KicksDev API error: ${response.status} - ${response.statusText}`);
      console.error(`❌ API Route - Error details:`, errorText);
      return NextResponse.json({
        success: false,
        error: "Search service temporarily unavailable. Please try again."
      }, { 
        status: 503,
        headers: securityHeaders 
      });
    }

    const data = await response.json();
    console.log("📦 API Route - Response data:", JSON.stringify(data, null, 2));

    // Handle the new v3 API response structure: { $schema, data: [...], meta }
    if (data.data && Array.isArray(data.data)) {
      console.log("✅ API Route - Valid v3 response format, returning data");
      return NextResponse.json({
        success: true,
        data: data.data // Return the products array from the data property
      }, {
        headers: securityHeaders
      });
    } else {
      console.error("❌ API Route - Unexpected response structure:", data);
      return NextResponse.json({
        success: false,
        error: "Search service returned unexpected format. Please try again."
      }, { 
        status: 503,
        headers: securityHeaders 
      });
    }

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
