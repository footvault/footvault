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

    // Extract query parameters for pagination and filtering
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const searchTerm = searchParams.get('search') || '';
    const brand = searchParams.get('brand') || '';
    const sizeCategory = searchParams.get('sizeCategory') || '';
    const location = searchParams.get('location') || '';
    const sizes = searchParams.get('sizes') || '';
    const type = searchParams.get('type') || '';

    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Build the query
    let query = supabase
      .from('variants')
      .select(`
        id,
        variant_sku,
        size,
        size_label,
        location,
        location_id,
        status,
        serial_number,
        cost_price,
        owner_type,
        consignor_id,
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
        ),
        consignors:consignors (
          id,
          name,
          commission_rate,
          payout_method,
          fixed_markup,
          markup_percentage
        ),
        custom_locations!location_id (
          id,
          name
        )
      `, { count: 'exact' })
      .eq('status', 'Available');

    // Apply filters
    if (brand && brand !== 'all') {
      query = query.eq('products.brand', brand);
    }

    if (sizeCategory && sizeCategory !== 'all') {
      query = query.eq('products.size_category', sizeCategory);
    }

    if (location && location !== 'all') {
      query = query.eq('location', location);
    }

    if (sizes) {
      const sizeArray = sizes.split(',');
      query = query.in('size', sizeArray);
    }

    // Apply search term (using OR conditions)
    if (searchTerm) {
      query = query.or(`variant_sku.ilike.%${searchTerm}%,serial_number.ilike.%${searchTerm}%,size.ilike.%${searchTerm}%,products.name.ilike.%${searchTerm}%,products.brand.ilike.%${searchTerm}%,products.sku.ilike.%${searchTerm}%`);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: variants, error: variantsError, count } = await query;
    if (variantsError) {
      return NextResponse.json({ success: false, error: variantsError.message }, { status: 500 });
    }
    // Transform the database response to expected format
    const transformedVariants = (variants || []).map(variant => {
      // Always use the first element if products is an array (PostgREST join returns array)
      const product = Array.isArray(variant.products) ? variant.products[0] : variant.products;
      const consignor = Array.isArray(variant.consignors) ? variant.consignors[0] : variant.consignors;
      const customLocation = Array.isArray(variant.custom_locations) ? variant.custom_locations[0] : variant.custom_locations;
      
      if (!product) return null;
      
      // Use location name from custom_locations JOIN, fallback to text field for backward compatibility
      const locationName = customLocation?.name || variant.location || '';
      
      return {
        id: variant.id,
        variantSku: variant.variant_sku,
        size: variant.size,
        sizeLabel: variant.size_label,
        location: locationName, // Now uses location_id JOIN
        locationId: variant.location_id, // Include location_id for editing
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
        productSizeCategory: product.size_category,
        ownerType: variant.owner_type || 'store',
        consignorId: variant.consignor_id,
        consignorName: consignor?.name,
        consignorCommissionRate: consignor?.commission_rate,
        consignorPayoutMethod: consignor?.payout_method,
        consignorFixedMarkup: consignor?.fixed_markup,
        consignorMarkupPercentage: consignor?.markup_percentage
      };
    }).filter(Boolean);
    return NextResponse.json({ 
      success: true, 
      data: transformedVariants, 
      total: count || 0,
      page,
      limit,
      totalPages: count ? Math.ceil(count / limit) : 0
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
