import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function DELETE(request: Request) {
  try {
    const { saleId } = await request.json();
    if (!saleId) {
      return NextResponse.json({ success: false, error: 'Sale ID is required' }, { status: 400 });
    }
    
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);
    
    // Check user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    // Get the sale record
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .select('*')
      .eq('id', saleId)
      .eq('user_id', user.id)
      .single();

    if (saleError || !sale) {
      return NextResponse.json({ success: false, error: 'Sale not found' }, { status: 404 });
    }

    // Get all sale items with variant details
    const { data: saleItems, error: itemsError } = await supabase
      .from('sale_items')
      .select(`
        *,
        variants (
          id,
          type,
          notes,
          product_id,
          size,
          status
        )
      `)
      .eq('sale_id', saleId);

    if (itemsError) {
      return NextResponse.json({ success: false, error: itemsError.message }, { status: 500 });
    }

    let preorderVariantsToDelete: string[] = [];
    let downpaymentVariantsToDelete: string[] = [];
    let preordersReverted = 0;
    let preordersRestored = 0;
    let variantsRestored = 0;

    // Process each sale item
    for (const saleItem of saleItems || []) {
      const variant = saleItem.variants;
      
      if (variant && (variant.type === 'Pre-order' || variant.type === 'downpayment')) {
        // Handle both Pre-order completions and downpayment cancellations
        if (variant.type === 'Pre-order') {
          preorderVariantsToDelete.push(variant.id);
        } else if (variant.type === 'downpayment') {
          downpaymentVariantsToDelete.push(variant.id);
        }

        // Extract pre-order number from variant notes
        let preorderNo = null;
        if (variant.notes && variant.notes.includes('pre-order #')) {
          const match = variant.notes.match(/pre-order #(\d+)/);  // Only match digits
          if (match) {
            preorderNo = parseInt(match[1]);  // Convert to number
          }
        }

        console.log(`Processing variant ${variant.id} of type ${variant.type}`);
        console.log(`Extracted pre-order number: ${preorderNo} from notes: ${variant.notes}`);

        // Find the related pre-order using multiple methods
        let preorder = null;

        // For downpayment variants, skip variant_id lookup since these are temporary variants
        if (variant.type !== 'downpayment') {
          // Method 1: Try by variant_id first (only for Pre-order type)
          const { data: preorderByVariant } = await supabase
            .from('pre_orders')
            .select('*')
            .eq('variant_id', variant.id)
            .limit(1)
            .single();

          if (preorderByVariant) {
            preorder = preorderByVariant;
            console.log(`Found pre-order by variant_id: ${preorder.id}`);
          }
        }

        // Method 2: Try by pre-order number from notes (most reliable for downpayments)
        if (!preorder && preorderNo) {
          const { data: preorderByNo } = await supabase
            .from('pre_orders')
            .select('*')
            .eq('pre_order_no', preorderNo)
            .limit(1)
            .single();

          if (preorderByNo) {
            preorder = preorderByNo;
            console.log(`Found pre-order by pre_order_no: ${preorder.id}`);
          }
        }

        // Method 3: Try by product, size, and user matching if still not found
        if (!preorder) {
          const { data: preorderByMatch } = await supabase
            .from('pre_orders')
            .select('*')
            .eq('product_id', variant.product_id)
            .eq('size', variant.size)
            .eq('user_id', sale.user_id)
            .in('status', ['completed', 'cancelled', 'canceled'])
            .order('updated_at', { ascending: false })
            .limit(1)
            .single();

          if (preorderByMatch) {
            preorder = preorderByMatch;
            console.log(`Found pre-order by product/size match: ${preorder.id}`);
          }
        }

        // Handle the pre-order based on its current status
        if (preorder) {
          console.log(`Found pre-order ${preorder.id} with status: ${preorder.status}`);
          
          if (preorder.status === 'completed') {
            // Revert completed pre-order back to pending
            console.log(`Reverting completed pre-order ${preorder.id} to pending`);
            const { error: preorderError } = await supabase
              .from('pre_orders')
              .update({
                status: 'pending',
                completed_date: null,
                variant_id: null,
                updated_at: new Date().toISOString(),
                notes: (preorder.notes || '') + ` [REVERTED from sale deletion ${new Date().toLocaleDateString()}]`
              })
              .eq('id', preorder.id);

            if (!preorderError) {
              preordersReverted++;
              console.log(`Successfully reverted pre-order ${preorder.id}`);
            } else {
              console.error(`Error reverting pre-order ${preorder.id}:`, preorderError);
            }

          } else if (preorder.status === 'cancelled' || preorder.status === 'canceled') {
            // Restore cancelled pre-order back to pending (handle both spellings)
            console.log(`Restoring cancelled pre-order ${preorder.id} to pending`);
            const { error: preorderError } = await supabase
              .from('pre_orders')
              .update({
                status: 'pending',
                updated_at: new Date().toISOString(),
                notes: (preorder.notes || '') + ` [RESTORED from sale deletion ${new Date().toLocaleDateString()}]`
              })
              .eq('id', preorder.id);

            if (!preorderError) {
              preordersRestored++;
              console.log(`Successfully restored pre-order ${preorder.id}`);
            } else {
              console.error(`Error restoring pre-order ${preorder.id}:`, preorderError);
            }
          } else {
            console.log(`Pre-order ${preorder.id} has status ${preorder.status}, no action needed`);
          }
        } else {
          console.log(`No pre-order found for variant ${variant.id} (type: ${variant.type})`);
        }

      } else if (variant && variant.type !== 'Pre-order' && variant.type !== 'downpayment') {
        // For regular variants, restore to available
        const { error: variantError } = await supabase
          .from('variants')
          .update({
            status: 'Available',
            updated_at: new Date().toISOString()
          })
          .eq('id', variant.id);

        if (!variantError) {
          variantsRestored++;
        }
      }
    }

    // Delete related records first to avoid foreign key issues
    await supabase.from('consignment_sales').delete().eq('sale_id', saleId);
    await supabase.from('sale_profit_distributions').delete().eq('sale_id', saleId);
    await supabase.from('sale_items').delete().eq('sale_id', saleId);
    await supabase.from('sales').delete().eq('id', saleId);

    // Now delete pre-order and downpayment variants (no more foreign key references)
    let variantsDeleted = 0;
    const allVariantsToDelete = [...preorderVariantsToDelete, ...downpaymentVariantsToDelete];
    
    if (allVariantsToDelete.length > 0) {
      const { error: variantDeleteError } = await supabase
        .from('variants')
        .delete()
        .in('id', allVariantsToDelete);

      if (!variantDeleteError) {
        variantsDeleted = allVariantsToDelete.length;
      }
    }

    return NextResponse.json({ 
      success: true, 
      data: {
        sale_deleted: true,
        sale_id: saleId,
        deletion_date: new Date().toISOString(),
        items_processed: saleItems?.length || 0,
        variants_deleted: variantsDeleted,
        variants_restored: variantsRestored,
        preorders_reverted: preordersReverted,
        preorders_restored: preordersRestored,
        cleanup_type: (preordersReverted > 0 || preordersRestored > 0) ? 'preorder_sale_cleanup' : 'regular_sale_cleanup'
      }
    });

  } catch (e: any) {
    console.error('Error deleting sale:', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
