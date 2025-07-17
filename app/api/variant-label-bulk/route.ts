import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { jsPDF } from "jspdf";
import QRCode from "qrcode";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const idsParam = searchParams.get("ids");
  if (!idsParam) {
    return new Response("Missing ids", { status: 400 });
  }

  const ids = idsParam.split(",");
  if (ids.length === 0) {
    return new Response("No ids provided", { status: 400 });
  }

  // Use server-side Supabase client with service role key
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  const { data, error } = await supabase
    .from("variants")
    .select(`
      *,
      product:products (id, name, brand, sku),
      user:users (username)
    `)
    .in("id", ids);

  if (error || !data || data.length === 0) {
    return new Response("No variants found", { status: 404 });
  }
  
  // Load the FootVault logo as base64 for embedding in PDF
  let footvaultLogoBase64 = '';
  try {
    const fs = require('fs');
    const path = require('path');
    const logoPath = path.join(process.cwd(), 'public', 'images', 'FootVault-logo-white-only.png');
    if (fs.existsSync(logoPath)) {
      const logoBuffer = fs.readFileSync(logoPath);
      footvaultLogoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
    }
  } catch (err) {
    console.error('Error loading FootVault logo:', err);
    // Continue without logo if there's an error
  }

  // Generate PDF with multiple cards (2x4 grid per page)
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const cardWidth = 90; // Width for 2 columns
  const cardHeight = 65; // Height for 4 rows
  const cardsPerRow = 2;
  const cardsPerPage = 8; // 2x4 grid
  const marginX = (210 - (cardsPerRow * cardWidth)) / (cardsPerRow + 1); // A4 portrait width = 210mm
  const marginY = 10;

  for (let i = 0; i < data.length; i++) {
    const v: any = data[i];
    const sku = v.product?.sku || "-";
    const name = v.product?.name || "-";
    const brand = v.product?.brand || "-";
    const color = v.color || "-";
    const size = v.size || "-";
    // Get size_label from variants table directly
    const sizeLabel = v.size_label || "US";
    
    // Handle serial_number as smallint - ensure it's properly converted to string
    const hasSerialNumber = v.serial_number !== null && v.serial_number !== undefined;
    const labelSerial = hasSerialNumber ? String(v.serial_number) : "-----";
    const labelBrand = v.user?.username || "FOOTVAULT";

    // Generate QR code with proper error handling for smallint conversion
    let qrUrl;
    try {
      // For QR code, we need a non-empty string, so we use variant ID if serial is missing
      const qrCodeContent = hasSerialNumber ? String(v.serial_number) : String(v.id);
      qrUrl = await QRCode.toDataURL(qrCodeContent, { width: 128, margin: 1 });
    } catch (error) {
      console.error(`QR Code generation failed for variant ${v.id}:`, error);
      // Create a fallback QR code with just the variant ID
      qrUrl = await QRCode.toDataURL(String(v.id), { width: 128, margin: 1 });
    }

    // Calculate position
    const cardIndex = i % cardsPerPage;
    const row = Math.floor(cardIndex / cardsPerRow);
    const col = cardIndex % cardsPerRow;
    const x = marginX + col * (cardWidth + marginX);
    const y = marginY + row * (cardHeight + marginY);

    // Add new page if needed (except for first card)
    if (i > 0 && cardIndex === 0) {
      doc.addPage();
    }

    // Draw card border (optional)
    doc.setDrawColor(200, 200, 200);
    doc.rect(x, y, cardWidth, cardHeight);

    // Username at top - all caps and bold for cleaner look
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(labelBrand.toUpperCase(), x + 5, y + 12);
    doc.setLineWidth(0.5);
    doc.line(x + 5, y + 14, x + 50, y + 14); // Longer underline
    
    // Draw SKU with bold font
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(sku, x + 5, y + 22);
    
    // Product details in bold italic
    doc.setFont("helvetica", "bolditalic");
    doc.setFontSize(10);
    
    // Create full product description with brand
    let productDesc = "";
    if (brand && brand !== "-") {
      productDesc += brand + " ";
    }
    productDesc += name;
    
    // Add color if available
    if (color && color !== "-") {
      productDesc += " " + color;
    }
    
    // Split product description into multiple lines with no limit
    // Give more space by using almost full width of card
    const maxWidth = cardWidth - 40; // Leave space for QR code
    
    // Allow text to wrap naturally with no truncation
    const splitDesc = doc.splitTextToSize(productDesc, maxWidth);
    
    // Show full product info - no cutting, will wrap to multiple lines as needed
    doc.text(splitDesc, x + 5, y + 30);
    
    // Use the actual size_label from the variants table
    // Format size info with size label from database
    let sizeInfo = `Size: ${sizeLabel} ${size}`;
    
    // Add gender info from the variant data
    if (v.gender && !size.includes('(')) {
      sizeInfo += ` (${v.gender.toUpperCase()})`;
    }
    
    // Calculate position for size based on product description length
    const sizeY = y + 30 + (splitDesc.length * 6) + 2;
    
    // Make size info bold
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(sizeInfo, x + 5, sizeY);

    // Draw QR code in top right
    doc.addImage(qrUrl, "PNG", x + cardWidth - 35, y + 5, 30, 30);

    // Draw serial number (large and centered at the bottom) like in the example
    doc.setFont("helvetica", "bold");
    doc.setFontSize(38);
    const serialTextWidth = doc.getTextWidth(labelSerial);
    const serialX = x + (cardWidth - serialTextWidth) / 2;
    doc.text(labelSerial, serialX, y + cardHeight - 14); // Moved up slightly to make room for logo
    
    // Add FootVault logo in bottom right corner if available
    if (footvaultLogoBase64) {
      // Small shoe icon logo
      doc.addImage(footvaultLogoBase64, 'PNG', x + cardWidth - 25, y + cardHeight - 15, 10, 10);
      // Add FootVault text next to logo
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.text("FootVault", x + cardWidth - 15, y + cardHeight - 8);
    }
  }

  const pdf = doc.output("arraybuffer");
  return new Response(pdf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename=variant-labels-bulk.pdf`,
    },
  });
}
