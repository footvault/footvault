import { NextResponse } from 'next/server';
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface DatabaseProduct {
  id: number;
  name: string;
  brand: string;
  sku: string;
  image: string | null;
}

interface DatabaseVariant {
  id: string;
  size: string;
  serial_number: string;
  size_label: string;
  variant_sku: string;
  product: DatabaseProduct | null;
}

interface DatabaseSaleItem {
  id: string;
  sold_price: number;
  cost_price: number;
  quantity: number;
  variant: DatabaseVariant | null;
}

interface DatabaseAvatar {
  id: string;
  name: string;
  image: string | null;
}

interface DatabaseProfitDistribution {
  id: string;
  percentage: number;
  amount: number;
  avatar: DatabaseAvatar | null;
}

interface DatabaseSale {
  sales_no: null;
  id: string;
  sale_date: string;
  total_amount: number;
  total_discount: number | null;
  net_profit: number;
  customer_name: string | null;
  customer_phone: string | null;
  created_at: string;
  updated_at: string;
  payment_type?: string | null;
  sale_items: DatabaseSaleItem[];
  sale_profit_distributions: DatabaseProfitDistribution[];
}

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

    // Get sales with all related data
    const { data: sales, error: salesError } = await authenticatedSupabase
      .from('sales')
      .select(`
        id,
        sale_date,
        total_amount,
        total_discount,
        net_profit,
        customer_name,
        customer_phone,
        created_at,
        updated_at,
        sales_no,
        payment_type,
        sale_items (
          id,
          sold_price,
          cost_price,
          quantity,
          variant:variants (
            id,
            size,
            serial_number,
            size_label,
            variant_sku,
            product:products (
              id,
              name,
              brand,
              sku,
              image
            )
          )
        ),
        sale_profit_distributions (
          id,
          percentage,
          amount,
          avatar:avatars (
            id,
            name
          )
        )
      `)
      .eq('user_id', user.id)
      .order('sale_date', { ascending: false });

    console.log('Raw sales data from supabase:', sales);
    if (salesError) {
      console.error("Error fetching sales:", salesError);
      return NextResponse.json({ 
        success: true, 
        data: [] // Return empty array instead of error
      });
    }

    // Transform the data to match the expected format
    const transformedSales = (sales as unknown as DatabaseSale[] | null)?.map(sale => ({
      id: sale.id,
      sale_date: sale.sale_date,
      total_amount: sale.total_amount,
      total_discount: sale.total_discount || 0,
      net_profit: sale.net_profit,
      customer_name: sale.customer_name || '',
      customer_phone: sale.customer_phone || '',
      created_at: sale.created_at,
      updated_at: sale.updated_at,
      sales_no: sale.sales_no ?? null,
      payment_type: sale.payment_type ?? null,
      items: (sale.sale_items || []).map((item: DatabaseSaleItem) => {
        const variant = item.variant;
        const product = variant && variant.product;
        return {
          id: item.id,
          sold_price: item.sold_price,
          cost_price: item.cost_price,
          quantity: item.quantity,
          variant: variant ? {
            id: variant.id,
            serialNumber: variant.serial_number || '',
            size: variant.size,
            sizeLabel: variant.size_label || '',
            variantSku: variant.variant_sku,
            costPrice: item.cost_price,
            productName: product?.name || '',
            productBrand: product?.brand || '',
            productSku: product?.sku || '',
            productImage: product?.image || '',
          } : null
        }
      }),
      profitDistribution: (sale.sale_profit_distributions || []).map((dist: DatabaseProfitDistribution) => ({
        id: dist.id,
        percentage: dist.percentage,
        amount: dist.amount,
        avatar: dist.avatar ? {
          id: dist.avatar.id,
          name: dist.avatar.name,
        } : null
      }))
    })) || [];
    console.log('Transformed sales for client:', transformedSales);

    return NextResponse.json({
      success: true,
      data: transformedSales
    });

  } catch (error: any) {
    console.error("Error in getSales API route:", error);
    return NextResponse.json({ 
      success: true, 
      data: [] // Return empty array instead of error
    });
  }
}
