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
      .eq('user_id', user.id)
      .eq('status', 'Available');

    // Apply type filter - if type is 'preorder', don't fetch any variants (they'll be shown from preorders)
    // This is handled client-side by not showing variants when typeFilter='preorder'

    // Apply size filter (category-aware filtering is done client-side after product join)
    if (sizes) {
      const sizeArray = sizes.split(',').map(s => s.trim());
      query = query.in('size', sizeArray);
    }

    // Apply location filter
    if (location && location !== 'all') {
      query = query.eq('location', location);
    }

    // Apply search term (only on variant fields, not joined tables)
    // For numeric columns like serial_number, check if search term is numeric and use exact match
    if (searchTerm) {
      const isNumeric = /^\d+$/.test(searchTerm);
      if (isNumeric) {
        // If search term is numeric, search both variant_sku (partial) and serial_number (exact match)
        query = query.or(`variant_sku.ilike.%${searchTerm}%,serial_number.eq.${searchTerm}`);
      } else {
        // If search term is not numeric, only search variant_sku
        query = query.ilike('variant_sku', `%${searchTerm}%`);
      }
    }

    // DON'T apply pagination yet - we need to filter first
    // query = query.range(offset, offset + limit - 1);

    let variants;
    let variantsError;
    
    try {
      const result = await query;
      variants = result.data;
      variantsError = result.error;
    } catch (queryError) {
      console.error('Unexpected query error:', queryError);
      return NextResponse.json({ 
        success: false, 
        error: 'Database connection error. Please try again.' 
      }, { status: 500 });
    }
    
    if (variantsError) {
      console.error('Supabase query error:', variantsError);
      return NextResponse.json({ 
        success: false, 
        error: variantsError.message || 'Failed to fetch variants' 
      }, { status: 500 });
    }
    
    // Transform the database response to expected format
    let transformedVariants;
    try {
      transformedVariants = (variants || []).map(variant => {
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
          location: locationName,
          locationId: variant.location_id,
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
    } catch (transformError) {
      console.error('Error transforming variants:', transformError);
      return NextResponse.json({ 
        success: false, 
        error: `Transform error: ${transformError instanceof Error ? transformError.message : String(transformError)}` 
      }, { status: 500 });
    }
    
    // Apply client-side filters for joined table fields
    // Filter out nulls first with proper TypeScript type guard
    let filteredVariants = transformedVariants.filter((v): v is NonNullable<typeof v> => v !== null);
    
    if (brand && brand !== 'all') {
      filteredVariants = filteredVariants.filter(v => v.productBrand === brand);
    }
    
    // Apply size category filter first
    if (sizeCategory && sizeCategory !== 'all') {
      filteredVariants = filteredVariants.filter(v => v.productSizeCategory === sizeCategory);
    }
    
    // If size filter is applied WITH a size category, only match sizes from that category
    // This prevents selecting "6.5" from both Men's and Women's
    if (sizes && sizeCategory && sizeCategory !== 'all') {
      const sizeArray = sizes.split(',').map(s => s.trim());
      filteredVariants = filteredVariants.filter(v => 
        sizeArray.includes(String(v.size)) && v.productSizeCategory === sizeCategory
      );
    }
    
    // Extend search to product fields
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filteredVariants = filteredVariants.filter(v =>
        v.productName?.toLowerCase().includes(lowerSearch) ||
        v.productBrand?.toLowerCase().includes(lowerSearch) ||
        v.productSku?.toLowerCase().includes(lowerSearch) ||
        v.variantSku?.toLowerCase().includes(lowerSearch) ||
        v.serialNumber?.toString().toLowerCase().includes(lowerSearch) ||
        v.size?.toString().toLowerCase().includes(lowerSearch)
      );
    }
    
    // NOW return ALL filtered variants (no pagination on server)
    // Client will handle pagination after combining with preorders
    const totalCount = filteredVariants.length;
    
    return NextResponse.json({ 
      success: true, 
      data: filteredVariants, // Return ALL filtered variants
      total: totalCount,
      page: 1, // Always page 1 since we return all
      limit: totalCount,
      totalPages: 1
    });
  } catch (error) {
    console.error('API error in get-available-variants-client:');
    console.error(error);
    
    // Safe error message extraction
    let errorMessage = 'Internal server error';
    try {
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object') {
        errorMessage = JSON.stringify(error);
      }
    } catch (stringifyError) {
      errorMessage = 'Error occurred but could not be serialized';
    }
    
    console.error('Extracted error message:', errorMessage);
    
    return NextResponse.json({ 
      success: false, 
      error: errorMessage
    }, { status: 500 });
  }
}
