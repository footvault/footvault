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
    const QR_SIZE = 22;
    const QR_X = 62;
    const QR_Y = 6;
    const USERNAME_MAX_WIDTH = 45; // Space for QR code
    const CONTENT_MAX_WIDTH = 50;  // Consistent content width
    const MIN_BOTTOM_MARGIN = 8;   // Minimum space for bottom elements

    // Reset font settings for each label to ensure consistency
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);

    // Username at top - make responsive with line breaks for long usernames
    doc.setFont("helvetica", "bold");
    
    // Split username into multiple lines if too long - ensure space for QR code
    const splitUsername = doc.splitTextToSize(labelBrand.toUpperCase(), USERNAME_MAX_WIDTH);
    
    // Display username (up to 2 lines) with responsive positioning
    const usernameLines = splitUsername.slice(0, 2);
    let currentY = 12; // Starting top margin
    
    for (let i = 0; i < usernameLines.length; i++) {
      doc.setFontSize(16);
      doc.text(usernameLines[i], MARGIN_LEFT, currentY);
      currentY += 5; // Line spacing
    }
    
    // Draw underline under the last line of username - responsive width
    doc.setLineWidth(0.5);
    const lastLineWidth = doc.getTextWidth(usernameLines[usernameLines.length - 1]);
    const underlineEndX = Math.min(MARGIN_LEFT + lastLineWidth, USERNAME_MAX_WIDTH + MARGIN_LEFT);
    doc.line(MARGIN_LEFT, currentY + 1, underlineEndX, currentY + 1);
    
    // SKU with bold font - responsive positioning
    currentY += 8; // Spacing after underline
    const skuY = currentY;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(sku, MARGIN_LEFT, skuY);
    
    // Product details - responsive text wrapping
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
    
    // Split product description - responsive width with dynamic line limiting
    const splitDesc = doc.splitTextToSize(productDesc, CONTENT_MAX_WIDTH);
    currentY += 8; // Spacing after SKU
    const productY = currentY;
    
    // Calculate available space for product description to ensure serial number fits
    const reservedBottomSpace = 15; // Reserve space for serial + logo
    const maxContentY = LABEL_HEIGHT - reservedBottomSpace;
    const availableLines = Math.floor((maxContentY - productY - 8) / 5); // 5mm per line + 8mm for size
    
    // Limit description lines to prevent bottom overlap
    const maxDescLines = Math.min(splitDesc.length, Math.max(availableLines, 1), 2);
    const displayDesc = splitDesc.slice(0, maxDescLines);
    doc.text(displayDesc, MARGIN_LEFT, productY);
    
    // Update currentY based on actual description lines
    currentY += (displayDesc.length * 5) + 3;
    
    // Size information - responsive positioning
    let sizeInfo = `Size: ${sizeLabel} ${size}`;
    
    // Add gender info from the variant data if available
    if (v.gender && !size.includes('(')) {
      sizeInfo += ` (${v.gender.toUpperCase()})`;
    }
    
    const sizeY = currentY;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(sizeInfo, MARGIN_LEFT, sizeY);
    
    // Calculate available space for bottom elements
    const bottomContentStart = LABEL_HEIGHT - MIN_BOTTOM_MARGIN;
    const availableHeight = bottomContentStart - (sizeY + 3);

    // QR code in top right - fixed position to avoid overlap
    doc.addImage(qrUrl, "PNG", QR_X, QR_Y, QR_SIZE, QR_SIZE);

    // Serial number - responsive positioning and sizing with bounds checking
    doc.setFont("helvetica", "bold");
    
    // Calculate optimal serial number position - ensure it stays visible
    let serialFontSize = 24; // Slightly smaller default for bulk
    let serialY = 47;
    const maxSerialY = LABEL_HEIGHT - 6; // Keep 6mm from bottom edge
    
    // Adjust font size based on serial length
    if (labelSerial.length >= 6) {
      serialFontSize = 20;
      serialY = 48;
    }
    
    doc.setFontSize(serialFontSize);
    const serialTextWidth = doc.getTextWidth(labelSerial);
    
    // If serial is too wide, reduce font size further
    if (serialTextWidth > LABEL_WIDTH - 20) {
      serialFontSize = 18;
      serialY = 49;
      doc.setFontSize(serialFontSize);
    }
    
    // Ensure serial doesn't go below label bounds
    if (sizeY + 8 > maxSerialY - 5) {
      // If content is too long, use smaller serial font and position higher
      serialFontSize = Math.min(serialFontSize, 16);
      serialY = Math.min(maxSerialY, 50);
      doc.setFontSize(serialFontSize);
    } else {
      // Normal positioning with collision detection
      const minSerialY = sizeY + 6; // Reduced gap to fit better
      serialY = Math.min(Math.max(serialY, minSerialY), maxSerialY);
    }
    
    // Center the serial number
    const serialX = (LABEL_WIDTH - doc.getTextWidth(labelSerial)) / 2;
    doc.text(labelSerial, serialX, serialY);
    
    // FootVault logo and text - responsive bottom positioning
    if (footvaultLogoBase64) {
      const logoSize = 8;
      const logoX = 66;
      
      // Position logo to avoid serial number overlap
      let logoY = 47;
      
      // If serial is positioned low, move logo up or to the side
      if (serialY > 47) {
        logoY = Math.max(serialY - logoSize - 2, 39); // Keep above serial with 2mm gap
      }
      
      // Ensure logo doesn't overlap with serial number horizontally
      const serialEndX = serialX + doc.getTextWidth(labelSerial);
      let adjustedLogoX = logoX;
      
      // If logo would overlap serial, move it to the right
      if (logoX < serialEndX + 3) {
        adjustedLogoX = Math.min(serialEndX + 3, LABEL_WIDTH - logoSize - 1);
      }
      
      // Only add logo if there's enough space
      if (adjustedLogoX + logoSize <= LABEL_WIDTH - 1 && logoY + logoSize <= LABEL_HEIGHT - 1) {
        doc.addImage(footvaultLogoBase64, 'PNG', adjustedLogoX, logoY, logoSize, logoSize);
        
        // FootVault text with responsive positioning
        doc.setFont("helvetica", "italic");
        doc.setFontSize(7);
        
        const textX = adjustedLogoX + logoSize + 2;
        const textY = logoY + (logoSize / 2) + 2;
        
        // Only add text if there's space
        if (textX + doc.getTextWidth("FootVault") <= LABEL_WIDTH - 1) {
          doc.text("FootVault", textX, textY);
        }
      }
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
