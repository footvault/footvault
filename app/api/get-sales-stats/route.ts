import { NextResponse } from 'next/server';
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({
        success: false,
        error: "No authorization header"
      }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const authenticatedSupabase = createClient(
      supabaseUrl,
      supabaseKey,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );

    const { data: { user }, error: userError } = await authenticatedSupabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({
        success: false,
        error: "Authentication required"
      }, { status: 401 });
    }

    // Parse the URL to get query parameters
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get('from');
    const toDate = searchParams.get('to');

    // Build the query
    let query = authenticatedSupabase
      .from('sales')
      .select('total_amount, net_profit, sale_date')
      .eq('user_id', user.id);

    if (fromDate) {
      query = query.gte('sale_date', fromDate.split('T')[0]);
    }
    if (toDate) {
      query = query.lte('sale_date', toDate.split('T')[0]);
    }

    const { data: sales, error: salesError } = await query;

    if (salesError) {
      console.error('Error fetching sales:', salesError);
      return NextResponse.json({
        success: false,
        error: "Failed to fetch sales data"
      }, { status: 500 });
    }

    // Calculate stats
    const stats = {
      success: true,
      totalSalesAmount: sales?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0,
      totalNetProfit: sales?.reduce((sum, sale) => sum + (sale.net_profit || 0), 0) || 0,
      numberOfSales: sales?.length || 0
    };

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Error in get-sales-stats:', error);
    return NextResponse.json({
      success: false,
      error: "Internal server error"
    }, { status: 500 });
  }
}
