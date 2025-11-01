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

    // Get saleId from query parameters
    const { searchParams } = new URL(request.url);
    const saleId = searchParams.get('saleId');

    if (!saleId) {
      return NextResponse.json({
        success: false,
        error: "Sale ID is required"
      }, { status: 400 });
    }

    // Fetch sale data with shipping information and items
    const { data: saleData, error: saleError } = await authenticatedSupabase
      .from('sales')
      .select(`
        *,
        sale_items (
          *,
          variants (
            id,
            product_name,
            brand,
            size,
            serial_number,
            product_sku
          )
        )
      `)
      .eq('id', saleId)
      .eq('user_id', user.id)
      .single();

    if (saleError || !saleData) {
      console.error('Error fetching sale:', saleError);
      return NextResponse.json({
        success: false,
        error: "Sale not found"
      }, { status: 404 });
    }

    // Check if sale has shipping information
    if (!saleData.shipping_address) {
      return NextResponse.json({
        success: false,
        error: "This sale does not have shipping information"
      }, { status: 400 });
    }

    // Fetch user profile for business information
    const { data: profileData, error: profileError } = await authenticatedSupabase
      .from('profiles')
      .select('username, business_name, business_address, business_phone')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      // Continue without profile data - use fallback
    }

    // Format the data for the shipping label
    const labelData = {
      saleId: saleData.id,
      userInfo: {
        username: profileData?.username || user.email || 'Store',
        businessName: profileData?.business_name,
        businessAddress: profileData?.business_address,
        businessPhone: profileData?.business_phone,
      },
      shippingInfo: {
        customerName: saleData.shipping_customer_name || saleData.customer_name || 'Customer',
        address: saleData.shipping_address,
        city: saleData.shipping_city || '',
        state: saleData.shipping_state || '',
        zipCode: saleData.shipping_zip_code || '',
        country: saleData.shipping_country || 'Philippines',
        phone: saleData.shipping_customer_phone || saleData.customer_phone,
        email: saleData.shipping_customer_email,
        notes: saleData.shipping_notes,
      },
      saleInfo: {
        invoiceNumber: saleData.sales_no ? `#${saleData.sales_no.toString().padStart(3, '0')}` : `#${saleData.id.slice(-6)}`,
        date: new Date(saleData.sale_date).toLocaleDateString(),
        items: saleData.sale_items?.map((item: any) => ({
          productName: item.variants?.product_name || 'Unknown Product',
          brand: item.variants?.brand || '',
          size: item.variants?.size || '',
          serialNumber: item.variants?.serial_number,
        })) || [],
      }
    };

    return NextResponse.json({
      success: true,
      data: labelData
    });

  } catch (error) {
    console.error('Error in shipping-label-data API:', error);
    return NextResponse.json({
      success: false,
      error: "Internal server error"
    }, { status: 500 });
  }
}