
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET: Fetch all payment types for the current user
export async function GET(req: NextRequest) {
  const supabase = await createClient(req);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await supabase
    .from("payment_types")
    .select("id, name, fee_type, fee_value, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

// POST: Create a new payment type for the current user
export async function POST(req: NextRequest) {
  const supabase = await createClient(req);
  const { data: { user } } = await supabase.auth.getUser();
 
  if (!user) {
    console.log("[POST] Unauthorized: no user");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  
  const { name, fee_type, fee_value, applies_to } = body;
  if (!name || !fee_type) {
    console.log("[POST] Missing fields", { name, fee_type });
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  const { data, error } = await supabase
    .from("payment_types")
    .insert({ user_id: user.id, name, fee_type, fee_value, applies_to })
    .select()
    .single();
  if (error) {
    console.log("[POST] Supabase error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data });
}

// PUT: Update a payment type for the current user
export async function PUT(req: NextRequest) {
  const supabase = await createClient(req);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, name, fee_type, fee_value, applies_to } = await req.json();
  if (!id || !name || !fee_type) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  
  // Check if this is the default Cash payment type - prevent editing
  const { data: existingPayment } = await supabase
    .from("payment_types")
    .select("name")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  
  if (existingPayment && existingPayment.name === 'Cash') {
    return NextResponse.json({ error: "Cannot edit default Cash payment type" }, { status: 400 });
  }
  
  const { data, error } = await supabase
    .from("payment_types")
    .update({ name, fee_type, fee_value, applies_to })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

// DELETE: Delete a payment type for the current user
export async function DELETE(req: NextRequest) {
  const supabase = await createClient(req);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  
  // Check if this is the default Cash payment type - prevent deletion
  const { data: existingPayment } = await supabase
    .from("payment_types")
    .select("name")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  
  if (existingPayment && existingPayment.name === 'Cash') {
    return NextResponse.json({ error: "Cannot delete default Cash payment type" }, { status: 400 });
  }
  
  const { error } = await supabase
    .from("payment_types")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
