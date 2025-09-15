import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch customers for selection
    const { data: customersData, error: customersError } = await supabase
      .from('customers')
      .select(`
        id,
        name,
        email,
        phone,
        customer_type
      `)
      .eq('user_id', user.id)
      .eq('is_archived', false)
      .order('name', { ascending: true });

    if (customersError) {
      console.error("Error fetching customers:", customersError);
      return NextResponse.json({ error: customersError.message }, { status: 500 });
    }

    return NextResponse.json(customersData || []);

  } catch (error) {
    console.error("Error in GET /api/customers/list:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, phone, email, customer_type } = body;

    // Validate required fields
    if (!name || !phone) {
      return NextResponse.json(
        { error: "Name and phone number are required" },
        { status: 400 }
      );
    }

    // Create or return customer (use upsert to avoid duplicate-key race)
    const payload = {
      user_id: user.id,
      name,
      phone,
      email: email || null,
      customer_type: customer_type || 'regular',
      is_archived: false
    };

    // Use upsert with unique constraint on (user_id, email)
    const { data: newCustomer, error: upsertError } = await supabase
      .from('customers')
      .upsert(payload, { onConflict: 'user_id,email' })
      .select(`
        id,
        name,
        email,
        phone,
        customer_type
      `)
      .single();

    if (upsertError) {
      console.error("Error upserting customer:", upsertError);
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    return NextResponse.json(newCustomer);

  } catch (error) {
    console.error("Error in POST /api/customers/list:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
