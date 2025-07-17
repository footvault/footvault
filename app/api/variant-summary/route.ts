import { createClient } from "@/lib/supabase/server";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// POST /api/variant-summary
export async function POST(req: Request) {
  const supabase = await createClient({ cookies });
  const { user_id } = await req.json();
  if (!user_id) {
    return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
  }

  // Call the RPC function you created in Supabase
  const { data, error } = await supabase.rpc("get_variant_summary", { uid: user_id });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
