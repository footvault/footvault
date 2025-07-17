import { NextResponse } from 'next/server'
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'

const supabaseUrl: string = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey: string = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(request: Request): Promise<Response> {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')

    const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })

    const {
      data: { user },
      error: userError,
    }: { data: { user: User | null }; error: any } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('User authentication error:', userError)
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
    }

    console.log('Authenticated user:', user.id)

    // Call the RPC function to get total sale value
    const { data: saleValue, error: saleValueError } = await supabase
      .rpc('sum_user_available_sale_price', { user_id: user.id });

    if (saleValueError) {
      console.error("Error fetching sale value:", saleValueError);
      return NextResponse.json({ error: "Failed to fetch sale value" }, { status: 500 });
    }

    console.log("Sale value from RPC:", saleValue);

    return NextResponse.json({ 
      saleValue: saleValue || 0
    });

  } catch (error) {
    console.error("Unexpected error in variants sale value API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
