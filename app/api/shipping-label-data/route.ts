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
        users!inner(username, receipt_address, receipt_more_info),
        sale_items!inner(
          *,
          variants!inner(
            size,
            size_label,
            serial_number,
            products!inner(name, brand, sku)
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

    // Format the data for the shipping label
    const labelData = {
      saleId: saleData.id,
      userInfo: {
        username: saleData.users?.username || user.email || 'Store',
        businessAddress: saleData.users?.receipt_address,
        businessInfo: saleData.users?.receipt_more_info,
      },
      shippingInfo: {
        customerName: saleData.customer_name || 'Customer',
        address: saleData.shipping_address,
        city: saleData.shipping_city || '',
        state: saleData.shipping_state || '',
        zipCode: saleData.shipping_zip || '',
        country: saleData.shipping_country || 'Philippines',
        phone: saleData.customer_phone,
        notes: saleData.shipping_notes,
      },
      saleInfo: {
        invoiceNumber: saleData.sales_no ? `#${saleData.sales_no.toString().padStart(3, '0')}` : `#${saleData.id.slice(-6)}`,
        date: new Date(saleData.sale_date).toLocaleDateString(),
        items: saleData.sale_items?.map((item: any) => ({
          productName: item.variants?.products?.name || 'Unknown Product',
          brand: item.variants?.products?.brand || '',
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