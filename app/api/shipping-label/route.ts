import { NextRequest, NextResponse } from 'next/server';
import { createClient } from "@supabase/supabase-js";
import jsPDF from 'jspdf';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(request: NextRequest) {
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
        users!inner(username),
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

    // Create PDF with same dimensions as variant labels
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: [90, 54] });
    
    // Generate shipping label
    generateShippingLabelForSale(doc, saleData);

    const pdf = doc.output("arraybuffer");
    return new Response(pdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename=shipping-label-${saleData.sales_no || saleData.id.slice(-6)}.pdf`,
      },
    });

  } catch (error) {
    console.error('Error in shipping-label API:', error);
    return NextResponse.json({
      success: false,
      error: "Internal server error"
    }, { status: 500 });
  }
}

function generateShippingLabelForSale(doc: jsPDF, saleData: any) {
  const LABEL_WIDTH = 90;
  const LABEL_HEIGHT = 54;
  const MARGIN_LEFT = 3;
  const MARGIN_RIGHT = 3;
  const CONTENT_WIDTH = LABEL_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
  const COLUMN_WIDTH = CONTENT_WIDTH / 2 - 2; // Two columns with small gap

  let currentY = 5;

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("SHIPPING LABEL", MARGIN_LEFT, currentY);
  currentY += 6;

  // Order number
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const orderNo = saleData.sales_no ? `#${String(saleData.sales_no).padStart(3, '0')}` : `#${saleData.id.slice(-6)}`;
  doc.text(`Order: ${orderNo}`, MARGIN_LEFT, currentY);
  currentY += 6;

  // Column positions
  const leftColumnX = MARGIN_LEFT;
  const rightColumnX = MARGIN_LEFT + COLUMN_WIDTH + 4; // 4mm gap between columns

  // LEFT COLUMN - FROM
  let leftY = currentY + 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("FROM:", leftColumnX + 1, leftY);
  leftY += 4;
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const storeName = saleData.users?.username || "FOOTVAULT";
  doc.text(storeName.toUpperCase(), leftColumnX + 1, leftY);

  // RIGHT COLUMN - TO
  let rightY = currentY + 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("TO:", rightColumnX + 1, rightY);
  rightY += 4;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  
  // Customer name
  const customerName = String(saleData.customer_name || 'Customer').toUpperCase();
  doc.text(customerName, rightColumnX + 1, rightY);
  rightY += 3;

  // Address
  const address = String(saleData.shipping_address || '');
  const addressLines = doc.splitTextToSize(address, COLUMN_WIDTH - 2);
  doc.text(addressLines, rightColumnX + 1, rightY);
  rightY += addressLines.length * 3;

  // City, State, Zip
  const city = String(saleData.shipping_city || '');
  const state = String(saleData.shipping_state || '');
  const zip = String(saleData.shipping_zip || '');
  const cityStateZip = `${city}, ${state} ${zip}`.trim().replace(/^,\s*/, '');
  if (cityStateZip) {
    const cityLines = doc.splitTextToSize(cityStateZip, COLUMN_WIDTH - 2);
    doc.text(cityLines, rightColumnX + 1, rightY);
    rightY += cityLines.length * 3;
  }

  // Country
  const country = String(saleData.shipping_country || 'Philippines').toUpperCase();
  doc.text(country, rightColumnX + 1, rightY);
  rightY += 3;

  // Phone
  if (saleData.customer_phone) {
    const phoneText = `Phone: ${String(saleData.customer_phone)}`;
    const phoneLines = doc.splitTextToSize(phoneText, COLUMN_WIDTH - 2);
    doc.text(phoneLines, rightColumnX + 1, rightY);
  }
}