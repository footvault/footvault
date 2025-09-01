import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';


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
    const cookieStore = await cookies();
    const authenticatedSupabase = await createClient(cookieStore);

    const { data: { user }, error: userError } = await authenticatedSupabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({
        success: false,
        error: "Authentication required"
      }, { status: 401 });
    }

    // Get all available variants with their associated product information
    const { data: variants, error: variantsError } = await authenticatedSupabase
      .from('variants')
      .select(`
        id,
        product_id,
        size,
        variant_sku,
        location,
        status,
        date_added,
        condition,
        serial_number,
        created_at,
        updated_at,
        size_label,
        cost_price,
        user_id,
        products (
          id,
          name,
          brand,
          sku,
          category,
          original_price,
          sale_price,
          image,
          size_category
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'Available');

    if (variantsError) {
      console.error("Error fetching variants:", variantsError);
      return NextResponse.json({ 
        success: false, 
        error: variantsError.message 
      }, { status: 500 });
    }

  

    return NextResponse.json({
      success: true,
      data: variants
    });

  } catch (error: any) {
    console.error("Error in getAvailableVariants API route:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
