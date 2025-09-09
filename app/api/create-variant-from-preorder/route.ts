import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: Request) {
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

    const body = await request.json();
    console.log('Request body:', body);
    const { preorderId, status = 'Available' } = body;

    // Get user from token for RLS
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('Authentication error:', userError);
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    // Get the pre-order details
    const { data: preorder, error: preorderError } = await supabase
      .from('pre_orders')
      .select(`
        *,
        customer:customers(*),
        product:products(*)
      `)
      .eq('id', preorderId)
      .single();

    if (preorderError || !preorder) {
      console.error('Error fetching pre-order:', preorderError);
      return NextResponse.json({ 
        success: false, 
        error: 'Pre-order not found' 
      }, { status: 404 });
    }

    // Generate a new variant SKU
    const baseProductSku = preorder.product.sku;
    const size = preorder.size;
    
    // Get the next sequential number for this product-size combination
    const { data: existingVariants, error: variantCountError } = await supabase
      .from('variants')
      .select('variant_sku')
      .eq('product_id', preorder.product_id)
      .eq('size', size)
      .eq('user_id', user.id);

    if (variantCountError) {
      console.error('Error counting existing variants:', variantCountError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to generate variant SKU' 
      }, { status: 500 });
    }

    const nextSequence = (existingVariants?.length || 0) + 1;
    const variantSku = `${baseProductSku}-${size}-${nextSequence.toString().padStart(3, '0')}`;

    console.log('Creating variant without serial number for pre-order conversion');

    // Create the variant
    const variantData = {
      id: uuidv4(), // Generate UUID for the variant
      user_id: user.id,
      product_id: preorder.product_id,
      variant_sku: variantSku,
      size: preorder.size,
      size_label: preorder.size_label || 'US',
      status: status,
      cost_price: preorder.cost_price,
      location: 'Store', // Default location
      serial_number: null, // No serial number for pre-order variants
      owner_type: 'store', // Default to store owned
      date_added: new Date().toISOString().split('T')[0], // Add current date
      condition: 'New', // Default condition
      isArchived: false, // Not archived
      type: 'Pre-order', // Set the correct type
      notes: `Created from pre-order #${preorder.pre_order_no} for customer ${preorder.customer.name}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('Creating variant with data:', variantData);

    const { data: variant, error: variantError } = await supabase
      .from('variants')
      .insert(variantData)
      .select()
      .single();

    if (variantError) {
      console.error('Detailed variant creation error:', variantError);
      return NextResponse.json({ 
        success: false, 
        error: `Failed to create variant: ${variantError.message}`,
        details: variantError
      }, { status: 500 });
    }

    // Update the pre-order status to completed
    const { error: updateError } = await supabase
      .from('pre_orders')
      .update({ 
        status: 'completed',
        completed_date: new Date().toISOString(),
        variant_id: variant.id
      })
      .eq('id', preorderId);

    if (updateError) {
      console.error('Error updating pre-order status:', updateError);
      // Don't fail the whole operation, just log the error
    }

    console.log('Variant created successfully:', variant.id);

    return NextResponse.json({
      success: true,
      variantId: variant.id,
      variantSku: variant.variant_sku,
      serialNumber: variant.serial_number,
      preorderInfo: {
        customerName: preorder.customer.name,
        customerPhone: preorder.customer.phone,
        preorderNumber: preorder.pre_order_no
      }
    });

  } catch (error) {
    console.error('Error in create-variant-from-preorder:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
