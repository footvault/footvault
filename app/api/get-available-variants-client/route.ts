import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ success: false, error: 'No authorization header' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }
    const { data: variants, error: variantsError } = await supabase
      .from('variants')
      .select(`
        id,
        variant_sku,
        size,
        size_label,
        location,
        status,
        serial_number,
        cost_price,
        products:products (
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
      .eq('status', 'Available');
    if (variantsError) {
      return NextResponse.json({ success: false, error: variantsError.message }, { status: 500 });
    }
    // Transform the database response to expected format
    const transformedVariants = (variants || []).map(variant => {
      // Always use the first element if products is an array (PostgREST join returns array)
      const product = Array.isArray(variant.products) ? variant.products[0] : variant.products;
      if (!product) return null;
      return {
        id: variant.id,
        variantSku: variant.variant_sku,
        size: variant.size,
        sizeLabel: variant.size_label,
        location: variant.location,
        status: variant.status,
        serialNumber: variant.serial_number,
        costPrice: variant.cost_price,
        productName: product.name,
        productBrand: product.brand,
        productSku: product.sku,
        productImage: product.image,
        productOriginalPrice: product.original_price,
        productSalePrice: product.sale_price,
        productCategory: product.category,
        productSizeCategory: product.size_category
      };
    }).filter(Boolean);
    return NextResponse.json({ success: true, data: transformedVariants });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
