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
    doc.setFontSize(16);
    
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
    
    // Product name - smaller text to fit long names
    currentY += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8); // Smaller font size for better fit
    const maxProductWidth = CONTENT_MAX_WIDTH;
    const truncatedProductName = doc.splitTextToSize(name, maxProductWidth)[0];
    doc.text(truncatedProductName, MARGIN_LEFT, currentY);
    
    // Size information - compact
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    let sizeInfo = `Size: ${sizeLabel} ${size}`;
    
    // Add gender info from the variant data if available
    if (v.gender && !size.includes('(')) {
      sizeInfo += ` (${v.gender.toUpperCase()})`;
    }
    
    const sizeY = currentY; // Define sizeY for positioning calculations
    doc.text(sizeInfo, MARGIN_LEFT, currentY);
    
    // Calculate available space for bottom elements
    const bottomContentStart = LABEL_HEIGHT - MIN_BOTTOM_MARGIN;
    const availableHeight = bottomContentStart - (sizeY + 3);

    // QR code in top right - fixed position to avoid overlap
    doc.addImage(qrUrl, "PNG", QR_X, QR_Y, QR_SIZE, QR_SIZE);

    // Serial number - large and prominent at bottom
    doc.setFont("helvetica", "bold");
    
    // Calculate optimal serial number position
    let serialFontSize = 60; // Much larger serial number for prominence
    let serialY = 45;        // Position near bottom
    const maxSerialY = LABEL_HEIGHT - 6;
    
    // Adjust font size based on serial length - progressive scaling
    if (labelSerial.length >= 6) {
      serialFontSize = 50;
      serialY = 46;
    }
    if (labelSerial.length > 8) {
      serialFontSize = 45;
    }
    if (labelSerial.length > 12) {
      serialFontSize = 40; // Minimum size for readability
    }
    
    doc.setFontSize(serialFontSize);
    const serialTextWidth = doc.getTextWidth(labelSerial);
    
    // If serial is too wide, reduce font size further but keep it large
    if (serialTextWidth > LABEL_WIDTH - 25) {
      serialFontSize = 40; // Still relatively large minimum
      serialY = 47;
      doc.setFontSize(serialFontSize);
    }
    
    // Ensure serial doesn't overlap with content above
    if (sizeY + 6 > serialY - 8) {
      // If content is too long, use smaller serial font and position lower
      serialFontSize = Math.min(serialFontSize, 36); // Slightly larger minimum
      serialY = Math.max(sizeY + 8, 46);
      doc.setFontSize(serialFontSize);
    }
    
    // Center the serial number
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
