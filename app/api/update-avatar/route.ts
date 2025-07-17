import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient(cookies());
    const formData = await req.formData();
    const id = formData.get("id") as string;
    const name = formData.get("name") as string;
    const default_percentage = formData.get("default_percentage") as string;
    // Optionally handle image
    const image = formData.get("image") as string | null;

    if (!id || !name) {
      return NextResponse.json({ success: false, message: "Missing required fields." }, { status: 400 });
    }

    const { error } = await supabase
      .from("avatars")
      .update({
        name,
        default_percentage: parseFloat(default_percentage),
        ...(image ? { image } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Avatar updated successfully." });
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e.message || "Unexpected error." }, { status: 500 });
  }
}
