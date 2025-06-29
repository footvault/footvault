import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const { variantIds, newLocation } = await req.json();
    if (!Array.isArray(variantIds) || !newLocation) {
      return NextResponse.json({ error: "Missing variantIds or newLocation" }, { status: 400 });
    }
    const supabase = await createClient(req);
    // Update all variants in bulk
    const { data, error } = await supabase
      .from("variants")
      .update({ location: newLocation })
      .in("id", variantIds);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
     // @ts-ignore
    return NextResponse.json({ success: true, updated: data.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
