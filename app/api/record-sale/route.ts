import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: Request) {
  try {
    console.log('--- Incoming record-sale request ---');
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      console.error('No authorization header');
      return NextResponse.json({ success: false, error: 'No authorization header' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const body = await request.json();
    console.log('Request body:', body);
    const { saleDate, totalAmount, totalDiscount, netProfit, customerName, customerPhone, items, profitDistribution, paymentType } = body;

    // Get user from token for RLS
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('Authentication error:', userError);
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }
    console.log('User:', user.id);

    // Insert sale with user_id and correct fields, including payment_type JSONB
    const saleInsert = {
      sale_date: saleDate,
      total_amount: totalAmount,
      total_discount: totalDiscount,
      net_profit: netProfit,
      customer_name: customerName,
      customer_phone: customerPhone,
      user_id: user.id,
      payment_type: paymentType || null
    };
    console.log('Inserting sale:', saleInsert);
    const { data: saleData, error: saleError } = await supabase
      .from('sales')
      .insert([saleInsert])
      .select('*')
      .single();
    if (saleError) {
      console.error('Sale insert error:', saleError);
      return NextResponse.json({ success: false, error: saleError.message }, { status: 500 });
    }
    console.log('Inserted sale:', saleData);

    // Insert sale items
    if (items && items.length > 0) {
      const itemsToInsert = items.map((item: any) => ({
        variant_id: item.variantId,
        sold_price: item.soldPrice,
        cost_price: item.costPrice,
        quantity: item.quantity,
        sale_id: saleData.id,
      }));
      console.log('Inserting sale items:', itemsToInsert);
      const { error: itemsError } = await supabase.from('sale_items').insert(itemsToInsert);
      if (itemsError) {
        console.error('Sale items insert error:', itemsError);
        return NextResponse.json({ success: false, error: itemsError.message }, { status: 500 });
      }
      // Update variant status to 'Sold' for each sold variant
      const variantIds = items.map((item: any) => item.variantId);
      if (variantIds.length > 0) {
        const { error: updateError } = await supabase
          .from('variants')
          .update({ status: 'Sold' })
          .in('id', variantIds);
        if (updateError) {
          console.error('Variant status update error:', updateError);
          return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
        }
      }
    }

    // Insert profit distribution
    if (profitDistribution && profitDistribution.length > 0) {
      const distToInsert = profitDistribution.map((dist: any) => ({
        avatar_id: dist.avatarId,
        percentage: dist.percentage,
        amount: dist.amount,
        sale_id: saleData.id,

      }));
      console.log('Inserting profit distributions:', distToInsert);
      const { error: distError } = await supabase.from('sale_profit_distributions').insert(distToInsert);
      if (distError) {
        console.error('Profit distribution insert error:', distError);
        return NextResponse.json({ success: false, error: distError.message }, { status: 500 });
      }
    }

    console.log('Sale recorded successfully!');
    return NextResponse.json({ success: true, saleId: saleData.id });
  } catch (error) {
    console.error('Unexpected error in record-sale:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
