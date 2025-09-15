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

  // Generate PDF with individual labels (one per page for better printing/cutting)
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: [90, 54] });
  let pageAdded = false;

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

    // Add new page for each label (except the first one)
    if (pageAdded) {
      doc.addPage();
    }
    pageAdded = true;

  // Define responsive layout constants
  const LABEL_WIDTH = 90;
  const LABEL_HEIGHT = 54;
  const MARGIN_LEFT = 6;
  const QR_SIZE = 20;  // Slightly smaller QR code
  const QR_X = 64;     // Move QR code left to give more space
  const QR_Y = 8;      // Move QR code down slightly
  const USERNAME_MAX_WIDTH = 48; // More space for username
  const CONTENT_MAX_WIDTH = 52;  // More space for content
  const MIN_BOTTOM_MARGIN = 12;  // More bottom margin for better spacing    // Reset font settings for each label to ensure consistency
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);

    // Username at top left - clean and truncated
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12); // Smaller font size to fit longer names
    
    // Truncate username to fit in top left area
    const maxUsernameWidth = USERNAME_MAX_WIDTH;
    const truncatedUsername = doc.splitTextToSize(labelBrand.toUpperCase(), maxUsernameWidth)[0];
    doc.text(truncatedUsername, MARGIN_LEFT, 12);
    
    // QR code in top right - well positioned
    doc.addImage(qrUrl, "PNG", QR_X, QR_Y, QR_SIZE, QR_SIZE);
    
    // SKU below username
    let currentY = 20;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(sku, MARGIN_LEFT, currentY);
    
    // Product name below SKU (wrap text if too long)
    currentY += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const productLines = doc.splitTextToSize(name, CONTENT_MAX_WIDTH);
    doc.text(productLines, MARGIN_LEFT, currentY);

    // Move Y down depending on wrapped product lines
    currentY += productLines.length * 4;

    // Size info
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Size: ${sizeLabel} ${size}`, MARGIN_LEFT, currentY);

    // Serial number large and centered at bottom
    doc.setFont("helvetica", "bold");
    let serialFontSize = 60;
    let serialY = LABEL_HEIGHT - 8;

    // Adjust font size if serial is long
    if (labelSerial.length >= 6) {
      serialFontSize = 48;
    }
    doc.setFontSize(serialFontSize);

    const serialX = (LABEL_WIDTH - doc.getTextWidth(labelSerial)) / 2;
    doc.text(labelSerial, serialX, serialY);
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
