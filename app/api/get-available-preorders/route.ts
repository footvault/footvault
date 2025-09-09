import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      console.error('No authorization header');
      return NextResponse.json({ success: false, error: 'No authorization header' }, { status: 401 });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    // Get user from token for RLS
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('Authentication error:', userError);
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    // Get available pre-orders (pending or confirmed status)
    const { data: preorders, error } = await supabase
      .from('pre_orders')
      .select(`
        *,
        customer:customers(*),
        product:products(*)
      `)
      .in('status', ['pending', 'confirmed'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching pre-orders:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch pre-orders' 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: preorders || []
    });

  } catch (error) {
    console.error('Error in get-available-preorders:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
