import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { jsPDF } from "jspdf";
import QRCode from "qrcode";

// Label generation functions (same as single variant route)
function generateStoreDisplayLabel(doc: jsPDF, v: any, qrUrl: string) {
  const LABEL_WIDTH = 90;
  const LABEL_HEIGHT = 54;
  const MARGIN_LEFT = 6;
  const QR_SIZE = 20;
  const QR_X = 64;
  const QR_Y = 8;
  const USERNAME_MAX_WIDTH = 48;
  const CONTENT_MAX_WIDTH = 52;

  const hasSerialNumber = v.serial_number !== null && v.serial_number !== undefined;
  const labelSerial = hasSerialNumber ? String(v.serial_number) : "-----";
  const sku = v.product?.sku || "-";
  const name = v.product?.name || "-";
  const salePrice = v.product?.sale_price || 0;

  // Store name/brand at top
  const labelBrand = v.user?.username || "FOOTVAULT";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  const truncatedUsername = doc.splitTextToSize(labelBrand.toUpperCase(), USERNAME_MAX_WIDTH)[0];
  doc.text(truncatedUsername, MARGIN_LEFT, 12);

  // QR code top right
  doc.addImage(qrUrl, "PNG", QR_X, QR_Y, QR_SIZE, QR_SIZE);

  // Product name prominently displayed
  let currentY = 20;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  const productLines = doc.splitTextToSize(name, CONTENT_MAX_WIDTH);
  doc.text(productLines, MARGIN_LEFT, currentY);
  currentY += productLines.length * 4;

  // Sale price prominently displayed
  currentY += 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(`$${salePrice.toFixed(2)}`, MARGIN_LEFT, currentY);

  // Size info
  currentY += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const sizeLabel = v.size_label || "US";
  doc.text(`Size: ${sizeLabel} ${v.size || "-"}`, MARGIN_LEFT, currentY);

  // Serial number at bottom
  doc.setFont("helvetica", "bold");
  let serialFontSize = 48;
  if (labelSerial.length >= 6) serialFontSize = 36;
  doc.setFontSize(serialFontSize);
  const serialX = (LABEL_WIDTH - doc.getTextWidth(labelSerial)) / 2;
  doc.text(labelSerial, serialX, LABEL_HEIGHT - 8);
}

function generateInventoryLabel(doc: jsPDF, v: any, qrUrl: string) {
  const LABEL_WIDTH = 90;
  const LABEL_HEIGHT = 54;
  const MARGIN_LEFT = 6;
  const QR_SIZE = 20;
  const QR_X = 64;
  const QR_Y = 8;
  const CONTENT_MAX_WIDTH = 52;

  const hasSerialNumber = v.serial_number !== null && v.serial_number !== undefined;
  const labelSerial = hasSerialNumber ? String(v.serial_number) : "-----";
  const sku = v.product?.sku || "-";
  const name = v.product?.name || "-";
  const costPrice = v.cost_price || 0;

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("INVENTORY", MARGIN_LEFT, 10);

  // QR code top right
  doc.addImage(qrUrl, "PNG", QR_X, QR_Y, QR_SIZE, QR_SIZE);

  // SKU
  let currentY = 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`SKU: ${sku}`, MARGIN_LEFT, currentY);

  // Product name
  currentY += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const productLines = doc.splitTextToSize(name, CONTENT_MAX_WIDTH);
  doc.text(productLines, MARGIN_LEFT, currentY);
  currentY += productLines.length * 3;

  // Cost price
  currentY += 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(`Cost: $${costPrice.toFixed(2)}`, MARGIN_LEFT, currentY);

  // Location
  currentY += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Location: ${v.location || "Unknown"}`, MARGIN_LEFT, currentY);

  // Size
  currentY += 3;
  const sizeLabel = v.size_label || "US";
  doc.text(`Size: ${sizeLabel} ${v.size || "-"}`, MARGIN_LEFT, currentY);

  // Serial number at bottom
  doc.setFont("helvetica", "bold");
  let serialFontSize = 48;
  if (labelSerial.length >= 6) serialFontSize = 36;
  doc.setFontSize(serialFontSize);
  const serialX = (LABEL_WIDTH - doc.getTextWidth(labelSerial)) / 2;
  doc.text(labelSerial, serialX, LABEL_HEIGHT - 8);
}

function generateShippingLabel(doc: jsPDF, v: any, qrUrl: string) {
  const LABEL_WIDTH = 90;
  const LABEL_HEIGHT = 54;
  const MARGIN_LEFT = 6;
  const QR_SIZE = 20;
  const QR_X = 64;
  const QR_Y = 8;
  const CONTENT_MAX_WIDTH = 52;

  const hasSerialNumber = v.serial_number !== null && v.serial_number !== undefined;
  const labelSerial = hasSerialNumber ? String(v.serial_number) : "-----";
  const sku = v.product?.sku || "-";
  const name = v.product?.name || "-";

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("SHIPPING LABEL", MARGIN_LEFT, 10);

  // QR code top right
  doc.addImage(qrUrl, "PNG", QR_X, QR_Y, QR_SIZE, QR_SIZE);

  // Item details
  let currentY = 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Item: ${sku}`, MARGIN_LEFT, currentY);

  currentY += 3;
  const productLines = doc.splitTextToSize(name, CONTENT_MAX_WIDTH);
  doc.text(productLines, MARGIN_LEFT, currentY);
  currentY += productLines.length * 3;

  // Size
  currentY += 2;
  const sizeLabel = v.size_label || "US";
  doc.text(`Size: ${sizeLabel} ${v.size || "-"}`, MARGIN_LEFT, currentY);

  // Ship from
  currentY += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("FROM:", MARGIN_LEFT, currentY);
  currentY += 3;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  const storeName = v.user?.username || "FOOTVAULT";
  doc.text(storeName.toUpperCase(), MARGIN_LEFT, currentY);

  // Serial number at bottom
  doc.setFont("helvetica", "bold");
  let serialFontSize = 48;
  if (labelSerial.length >= 6) serialFontSize = 36;
  doc.setFontSize(serialFontSize);
  const serialX = (LABEL_WIDTH - doc.getTextWidth(labelSerial)) / 2;
  doc.text(labelSerial, serialX, LABEL_HEIGHT - 8);
}

function generateConsignmentLabel(doc: jsPDF, v: any, qrUrl: string) {
  const LABEL_WIDTH = 90;
  const LABEL_HEIGHT = 54;
  const MARGIN_LEFT = 6;
  const QR_SIZE = 20;
  const QR_X = 64;
  const QR_Y = 8;
  const CONTENT_MAX_WIDTH = 52;

  const hasSerialNumber = v.serial_number !== null && v.serial_number !== undefined;
  const labelSerial = hasSerialNumber ? String(v.serial_number) : "-----";
  const sku = v.product?.sku || "-";
  const name = v.product?.name || "-";
  const consignorName = v.consignor?.name || "Unknown Consignor";

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("CONSIGNMENT", MARGIN_LEFT, 10);

  // QR code top right
  doc.addImage(qrUrl, "PNG", QR_X, QR_Y, QR_SIZE, QR_SIZE);

  // Consignor
  let currentY = 18;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("CONSIGNOR:", MARGIN_LEFT, currentY);
  currentY += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const consignorLines = doc.splitTextToSize(consignorName, CONTENT_MAX_WIDTH);
  doc.text(consignorLines, MARGIN_LEFT, currentY);
  currentY += consignorLines.length * 3;

  // Product name
  currentY += 2;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const productLines = doc.splitTextToSize(name, CONTENT_MAX_WIDTH);
  doc.text(productLines, MARGIN_LEFT, currentY);
  currentY += productLines.length * 3;

  // Size
  currentY += 2;
  const sizeLabel = v.size_label || "US";
  doc.text(`Size: ${sizeLabel} ${v.size || "-"}`, MARGIN_LEFT, currentY);

  // Serial number at bottom
  doc.setFont("helvetica", "bold");
  let serialFontSize = 48;
  if (labelSerial.length >= 6) serialFontSize = 36;
  doc.setFontSize(serialFontSize);
  const serialX = (LABEL_WIDTH - doc.getTextWidth(labelSerial)) / 2;
  doc.text(labelSerial, serialX, LABEL_HEIGHT - 8);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const idsParam = searchParams.get("ids");
  const labelType = searchParams.get("type") || "store"; // Default to store display
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
      product:products (id, name, brand, sku, sale_price, original_price),
      user:users (username),
      consignor:consignors (name)
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

    // Generate appropriate label template based on type
    switch (labelType) {
      case "store":
        generateStoreDisplayLabel(doc, v, qrUrl);
        break;
      case "inventory":
        generateInventoryLabel(doc, v, qrUrl);
        break;
      case "shipping":
        generateShippingLabel(doc, v, qrUrl);
        break;
      case "consignment":
        generateConsignmentLabel(doc, v, qrUrl);
        break;
      default:
        generateStoreDisplayLabel(doc, v, qrUrl);
    }
  }

  const pdf = doc.output("arraybuffer");
  return new Response(pdf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename=variant-labels-${labelType}-bulk.pdf`,
    },
  });
}
