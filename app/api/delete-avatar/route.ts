import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient(cookies());
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ success: false, message: "Missing avatar id." }, { status: 400 });
    }
    const { error } = await supabase
      .from("avatars")
      .delete()
      .eq("id", id);
    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, message: "Avatar deleted successfully." });
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e.message || "Unexpected error." }, { status: 500 });
  }
}
