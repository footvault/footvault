import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ serialNumber: string }> }
) {
  try {
    console.log('=== API ROUTE HIT ===');
    console.log('Request method:', request.method);
    console.log('Request URL:', request.url);
    console.log('Params:', params);
    
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('Auth check - User:', !!user, 'Error:', authError);
    
    if (authError || !user) {
      console.log('Authentication failed');
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Await params to fix Next.js warning
    const resolvedParams = await params;
    const serialNumber = decodeURIComponent(resolvedParams.serialNumber)
    console.log('=== SCANNING FOR VALUE ===');
    console.log('Raw serialNumber param:', resolvedParams.serialNumber);
    console.log('Decoded serialNumber:', serialNumber);

    // Determine if the scanned value is a UUID (variant ID) or a number (serial number)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(serialNumber);
    const isNumber = /^\d+$/.test(serialNumber);

    console.log('Value analysis:');
    console.log('- isUUID:', isUUID);
    console.log('- isNumber:', isNumber);
    console.log('- Length:', serialNumber.length);
    console.log('- First 10 chars:', serialNumber.substring(0, 10));

    let query = supabase
      .from("variants")
      .select(`
        id,
        serial_number,
        size,
        size_label,
        location,
        status,
        cost_price,
        owner_type,
        consignor_id,
        variant_sku,
        products!inner (
          id,
          name,
          brand,
          sku,
          image,
          sale_price,
          category,
          size_category
        ),
        consignors (
          id,
          name,
          commission_rate,
          payout_method,
          fixed_markup,
          markup_percentage
        )
      `)
      .eq("user_id", user.id)
      .eq("isArchived", false);

    // Add appropriate filter based on the type of value scanned
    if (isUUID) {
      console.log('Searching by UUID (id field)');
      query = query.eq("id", serialNumber);
    } else if (isNumber) {
      const numericValue = parseInt(serialNumber, 10);
      console.log('Searching by serial number:', numericValue);
      query = query.eq("serial_number", numericValue);
    } else {
      console.log('Invalid format - not UUID or number');
      return NextResponse.json({ 
        error: "Invalid QR code format", 
        debug: { serialNumber, isUUID, isNumber } 
      }, { status: 404 });
    }

    console.log('=== EXECUTING QUERY ===');
    const { data: variant, error } = await query.single();

    console.log('Query results:');
    console.log('- Error:', error);
    console.log('- Variant found:', !!variant);
    if (variant) {
      console.log('- Variant ID:', variant.id);
      console.log('- Product name:', variant.products?.[0]?.name || 'No product');
    }

    if (error || !variant) {
      console.log('=== VARIANT NOT FOUND ===');
      console.log('Search criteria:', { serialNumber, isUUID, isNumber, userId: user.id });
      
      // Let's also do a broader search to see what variants exist
      const { data: allVariants, error: allError } = await supabase
        .from("variants")
        .select("id, serial_number, variant_sku, status")
        .eq("user_id", user.id)
        .eq("isArchived", false)
        .limit(5);
        
      console.log('Sample variants for this user:', allVariants);
      console.log('All variants query error:', allError);
      
      return NextResponse.json({ 
        error: "Variant not found",
        debug: {
          searchValue: serialNumber,
          isUUID,
          isNumber,
          sampleVariants: allVariants?.map(v => ({
            id: v.id,
            serial: v.serial_number,
            sku: v.variant_sku,
            status: v.status
          }))
        }
      }, { status: 404 });
    }

    // Transform the data to match the expected interface
    const product = Array.isArray(variant.products) ? variant.products[0] : variant.products;
    const consignor = Array.isArray(variant.consignors) ? variant.consignors[0] : variant.consignors;
    
    const transformedVariant = {
      id: variant.id,
      variantSku: variant.variant_sku,
      serialNumber: variant.serial_number || variant.id,
      size: variant.size,
      sizeLabel: variant.size_label,
      location: variant.location,
      status: variant.status,
      costPrice: variant.cost_price,
      productName: (product as any)?.name,
      productBrand: (product as any)?.brand,
      productSku: (product as any)?.sku,
      productImage: (product as any)?.image,
      productSalePrice: (product as any)?.sale_price,
      productCategory: (product as any)?.category,
      productSizeCategory: (product as any)?.size_category,
      ownerType: variant.owner_type,
      consignorId: variant.consignor_id?.toString(),
      consignorName: (consignor as any)?.name,
      consignorCommissionRate: (consignor as any)?.commission_rate,
      consignorPayoutMethod: (consignor as any)?.payout_method,
      consignorFixedMarkup: (consignor as any)?.fixed_markup,
      consignorMarkupPercentage: (consignor as any)?.markup_percentage,
    }

    console.log('=== SUCCESS ===');
    console.log('Returning variant:', transformedVariant.productName, '- Size:', transformedVariant.size);

    return NextResponse.json(transformedVariant)
  } catch (error) {
    console.error("=== API ERROR ===", error)
    return NextResponse.json({ 
      error: "Internal server error", 
      debug: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
