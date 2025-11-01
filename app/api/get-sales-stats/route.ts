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

    // Build the query to include sale items and variants to check for downpayment types
    let query = authenticatedSupabase
      .from('sales')
      .select(`
        total_amount, 
        net_profit, 
        sale_date, 
        status,
        sale_items!inner (
          variant:variants!inner (
            type
          )
        )
      `)
      .eq('user_id', user.id)
      .neq('status', 'refunded'); // Exclude refunded sales

    if (fromDate) {
      query = query.gte('sale_date', fromDate.split('T')[0]);
    }
    if (toDate) {
      query = query.lte('sale_date', toDate.split('T')[0]);
    }

    const { data: salesData, error: salesError } = await query;

    if (salesError) {
      console.error('Error fetching sales:', salesError);
      return NextResponse.json({
        success: false,
        error: "Failed to fetch sales data"
      }, { status: 500 });
    }

    console.log('Sales data received:', JSON.stringify(salesData, null, 2));

    // Filter sales by status and type
    const completedSales = salesData?.filter((sale: any) => {
      // Only include completed sales (exclude pending, voided, etc.) and exclude downpayment types
      const hasDownpaymentVariant = sale.sale_items?.some((item: any) => 
        item.variant?.type === 'downpayment'
      );
      return sale.status === 'completed' && !hasDownpaymentVariant;
    }) || [];

    // Calculate pending amounts (from pending sales only, including downpayment types)
    const pendingSales = salesData?.filter((sale: any) => sale.status === 'pending') || [];
    const totalPendingAmount = pendingSales.reduce((sum: number, sale: any) => sum + (sale.total_amount || 0), 0);

    // For profit calculation, include all non-refunded sales regardless of status (but exclude voided)
    const profitableSales = salesData?.filter((sale: any) => 
      sale.status !== 'refunded' && sale.status !== 'voided'
    ) || [];

    console.log('Completed sales (for main stats):', completedSales.length);
    console.log('Pending sales amount:', totalPendingAmount);
    console.log('All profitable sales net profit:', profitableSales.reduce((sum: number, sale: any) => sum + (sale.net_profit || 0), 0));

    // Calculate stats: main stats only include completed non-downpayment sales
    const stats = {
      success: true,
      totalSalesAmount: completedSales.reduce((sum: number, sale: any) => sum + (sale.total_amount || 0), 0), // Only completed non-downpayment sales
      totalNetProfit: profitableSales.reduce((sum: number, sale: any) => sum + (sale.net_profit || 0), 0), // Include completed, pending, and downpayment profits (exclude refunded/voided)
      numberOfSales: completedSales.length, // Only count completed non-downpayment sales
      totalPendingAmount: totalPendingAmount // New field for pending amounts
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
