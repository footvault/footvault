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

    // Get products with their variants
    const { data: products, error: productsError } = await authenticatedSupabase
      .from('products')
      .select(`
        *,
        variants (*)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (productsError) {
      console.error("Error fetching products:", productsError);
      return NextResponse.json({ 
        success: false, 
        error: productsError.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: products
    });

  } catch (error: any) {
    console.error("Error in getProducts API route:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
