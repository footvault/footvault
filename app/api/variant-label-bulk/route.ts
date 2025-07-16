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
    .select(`*, product:products (id, name, brand, sku), user:users (username)`)
    .in("id", ids);

  if (error || !data || data.length === 0) {
    return new Response("No variants found", { status: 404 });
  }

  // Generate PDF with multiple cards (2x2 grid per page)
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const cardWidth = 90;
  const cardHeight = 54;
  const cardsPerRow = 2;
  const cardsPerPage = 4; // 2x2 grid
  const marginX = (210 - (cardsPerRow * cardWidth)) / (cardsPerRow + 1); // A4 width = 210mm
  const marginY = 20;

  for (let i = 0; i < data.length; i++) {
    const v: any = data[i];
    const sku = v.product?.sku || "-";
    const name = v.product?.name || "-";
    const brand = v.product?.brand || "-";
    const color = v.color || "-";
    const size = v.size || "-";
    const labelSerial = v.serial_number || "-----";
    const labelBrand = v.user?.username || "FOOTVAULT";

    // Generate QR code
    const qrUrl = await QRCode.toDataURL(labelSerial, { width: 128, margin: 1 });

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

    // Draw brand name
    doc.setFont("helvetica", "bolditalic");
    doc.setFontSize(18);
    doc.text(labelBrand, x + 6, y + 13);
    doc.setLineWidth(0.5);
    doc.line(x + 6, y + 15, x + 40, y + 15);

    // Draw SKU
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(sku, x + 6, y + 24);

    // Draw name and color
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text(name, x + 6, y + 31);
    if (color && color !== "-") doc.text(color, x + 6, y + 37);
    doc.text(`Size: US ${size}`, x + 6, y + 43);

    // Draw QR code
    doc.addImage(qrUrl, "PNG", x + 65, y + 7, 20, 20);

    // Draw serial number (centered)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(32);
    const serialTextWidth = doc.getTextWidth(labelSerial);
    const serialX = x + (cardWidth - serialTextWidth) / 2;
    doc.text(labelSerial, serialX, y + 52);
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
