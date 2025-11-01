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

    // Optimized query - get sales without expensive joins
    let baseQuery = authenticatedSupabase
      .from('sales')
      .select('id, total_amount, net_profit, sale_date, status')
      .eq('user_id', user.id)
      .neq('status', 'refunded'); // Exclude refunded sales

    if (fromDate) {
      baseQuery = baseQuery.gte('sale_date', fromDate.split('T')[0]);
    }
    if (toDate) {
      baseQuery = baseQuery.lte('sale_date', toDate.split('T')[0]);
    }

    const { data: salesData, error: salesError } = await baseQuery;

    if (salesError) {
      console.error('Error fetching sales:', salesError);
      return NextResponse.json({
        success: false,
        error: "Failed to fetch sales data"
      }, { status: 500 });
    }

    // For downpayment detection, we need to check if any sale items have downpayment type
    // But we'll do this with a separate, more efficient query only for completed sales
    let downpaymentSaleIds: string[] = [];
    
    if (salesData && salesData.length > 0) {
      const completedSaleIds = salesData
        .filter((sale: any) => sale.status === 'completed')
        .map((sale: any) => sale.id);

      if (completedSaleIds.length > 0) {
        // Only check for downpayment types in completed sales
        const { data: downpaymentCheck } = await authenticatedSupabase
          .from('sale_items')
          .select('sale_id, variants!inner(type)')
          .in('sale_id', completedSaleIds)
          .eq('variants.type', 'downpayment');

        downpaymentSaleIds = downpaymentCheck?.map((item: any) => item.sale_id) || [];
      }
    }

    // Filter sales by status and exclude downpayment sales
    const completedSales = salesData?.filter((sale: any) => 
      sale.status === 'completed' && !downpaymentSaleIds.includes(sale.id)
    ) || [];

    // Calculate pending amounts (from pending sales only)
    const pendingSales = salesData?.filter((sale: any) => sale.status === 'pending') || [];
    const totalPendingAmount = pendingSales.reduce((sum: number, sale: any) => sum + (sale.total_amount || 0), 0);

    // For profit calculation, only include completed sales (same as main stats)
    const profitableSales = completedSales;

    console.log('Completed sales (for main stats):', completedSales.length);
    console.log('Pending sales amount:', totalPendingAmount);
    console.log('Completed sales net profit (excluding pending):', profitableSales.reduce((sum: number, sale: any) => sum + (sale.net_profit || 0), 0));

    // Calculate stats: all main stats only include completed non-downpayment sales
    const stats = {
      success: true,
      totalSalesAmount: completedSales.reduce((sum: number, sale: any) => sum + (sale.total_amount || 0), 0), // Only completed non-downpayment sales
      totalNetProfit: profitableSales.reduce((sum: number, sale: any) => sum + (sale.net_profit || 0), 0), // Only completed non-downpayment sales (same as totalSalesAmount)
      numberOfSales: completedSales.length, // Only count completed non-downpayment sales
      totalPendingAmount: totalPendingAmount // Separate field for pending amounts
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
