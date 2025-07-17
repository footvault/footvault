import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { jsPDF } from "jspdf";
import QRCode from "qrcode";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return new Response("Missing id", { status: 400 });
  }

  // Use server-side Supabase client with service role key
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  const { data, error } = await supabase
    .from("variants")
    .select(`*, product:products (id, name, brand, sku), user:users (username)`)
    .eq("id", id)
    .single();

  if (error || !data) {
    return new Response(
      JSON.stringify({
        message: "Variant not found",
        error,
        id,
        supabaseUrl,
        query: {
          table: "variants",
          select: "*, product:products (id, name, brand, sku), user:users (username)",
          eq: { id }
        }
      }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  const v: any = data;
  const sku = v.product?.sku || "-";
  const name = v.product?.name || "-";
  const brand = v.product?.brand || "-";
  const color = v.color || "-";
  const size = v.size || "-";
  
  // Handle serial_number as smallint - ensure it's properly converted to string
  const hasSerialNumber = v.serial_number !== null && v.serial_number !== undefined;
  const serial = hasSerialNumber ? String(v.serial_number) : v.id;
  const labelSerial = hasSerialNumber ? String(v.serial_number) : "-----";

  // Generate QR code as data URL - always ensure we have a valid string
  // For QR code, we need a non-empty string, so we use the variant ID if serial is missing
  const qrCodeContent = hasSerialNumber ? String(v.serial_number) : String(v.id);
  let qrUrl;
  try {
    qrUrl = await QRCode.toDataURL(qrCodeContent, { width: 128, margin: 1 });
  } catch (error) {
    console.error("QR Code generation failed:", error, "Content was:", qrCodeContent);
    // Create a fallback QR code with just the variant ID as a string
    qrUrl = await QRCode.toDataURL(String(v.id), { width: 128, margin: 1 });
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

  // Generate PDF
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: [90, 54] });
  
  // Username at top - make smaller and all caps for cleaner look
  const labelBrand = v.user?.username || "FOOTVAULT";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16); // Larger size for better readability
  doc.text(labelBrand.toUpperCase(), 6, 13);
  doc.setLineWidth(0.5);
  doc.line(6, 15, 50, 15); // Longer underline
  
  // SKU with bold font
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(sku, 6, 24);
  
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
  
  // Split product description into multiple lines
  const maxWidth = 55; // Leave space for QR code
  const splitDesc = doc.splitTextToSize(productDesc, maxWidth);
  doc.text(splitDesc, 6, 31);
  
  // Size information
  const sizeY = 31 + (splitDesc.length * 5) + 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  // Get size_label from variants table if available
  const sizeLabel = v.size_label || "US";
  doc.text(`Size: ${sizeLabel} ${size}`, 6, sizeY);
  
  // QR code in top right
  doc.addImage(qrUrl, "PNG", 65, 7, 20, 20);
  
  // Serial number (large and centered, responsive to length)
  doc.setFont("helvetica", "bold");
  // Dynamically adjust font size for serial number if it's long
  let serialFontSize = 32;
  if (labelSerial.length >= 6) serialFontSize = 26;
  doc.setFontSize(serialFontSize);
  const pageWidth = doc.internal.pageSize.getWidth();
  const serialTextWidth = doc.getTextWidth(labelSerial);
  // If serial number is very long, reduce font size further
  let serialY = 44;
  if (serialTextWidth > pageWidth - 20) {
    serialFontSize = 22;
    doc.setFontSize(serialFontSize);
    serialY = 46;
  }
  const serialX = (pageWidth - serialTextWidth) / 2;
  doc.text(labelSerial, serialX, serialY);

 const logoSize = 6; // Size of the logo in mm
const logoX = 68;   // Move logo horizontally (larger = more to the right)
const logoY = 48;   // Move logo vertically (larger = lower on the page)

doc.addImage(footvaultLogoBase64, 'PNG', logoX, logoY, logoSize, logoSize);

doc.setFont("helvetica", "italic");
doc.setFontSize(6);

// Adjust the text position relative to the logo
const textOffsetX = logoX + logoSize + 1.5;  // Space between logo and text
const textOffsetY = logoY + 4;               // Lower to align with logo middle

doc.text("FootVault", textOffsetX, textOffsetY);

  const pdf = doc.output("arraybuffer");
  return new Response(pdf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename=variant-label-${sku}.pdf`,
    },
  });
}
