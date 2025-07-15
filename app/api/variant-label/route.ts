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
  const serial = v.serial_number || "-";
  const labelSerial = v.serial_number || "-----";

  // Generate QR code as data URL
  const qrUrl = await QRCode.toDataURL(sku, { width: 128, margin: 1 });

  // Generate PDF
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: [90, 54] });
  doc.setFont("helvetica", "bolditalic");
  doc.setFontSize(18);
  const labelBrand = v.user?.username || "FOOTVAULT";
  doc.text(labelBrand, 6, 13);
  doc.setLineWidth(0.5);
  doc.line(6, 15, 40, 15);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(sku, 6, 24);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text(name, 6, 31);
  if (color && color !== "-") doc.text(color, 6, 37);
  doc.text(`Size: US ${size}`, 6, 43);
  doc.addImage(qrUrl, "PNG", 65, 7, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(32);
  // Center the serial number horizontally
  const pageWidth = doc.internal.pageSize.getWidth();
  const serialTextWidth = doc.getTextWidth(labelSerial);
  const serialX = (pageWidth - serialTextWidth) / 2;
  doc.text(labelSerial, serialX, 52);

  const pdf = doc.output("arraybuffer");
  return new Response(pdf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename=variant-label-${sku}.pdf`,
    },
  });
}
