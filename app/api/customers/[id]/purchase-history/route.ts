import { NextRequest, NextResponse } from 'next/server';
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);
    const { id } = await params;
    const customerId = parseInt(id);

    if (isNaN(customerId)) {
      return NextResponse.json({ error: 'Invalid customer ID' }, { status: 400 });
    }

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify customer belongs to user
    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id, name")
      .eq("id", customerId)
      .eq("user_id", user.id)
      .single();

    if (customerError || !customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Fetch sales with sale items and variant details
    const { data: salesData, error: salesError } = await supabase
      .from('sales')
      .select(`
        id,
        sales_no,
        sale_date,
        total_amount,
        status,
        sale_items (
          id,
          sold_price,
          cost_price,
          quantity,
          variants (
            id,
            size,
            size_label,
            serial_number,
            variant_sku,
            type,
            notes,
            products (
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
      .eq('customer_id', customerId)
      .eq('status', 'completed')
      .order('sale_date', { ascending: false });

    if (salesError) {
      console.error('Error fetching sales:', salesError);
      return NextResponse.json({ error: 'Failed to fetch sales' }, { status: 500 });
    }

    // Transform sales data into items with purchase history
    const purchaseHistory = [];
    let totalSpent = 0;
    let totalOrders = 0;
    let totalItems = 0;

    if (salesData) {
      for (const sale of salesData) {
        if (sale.sale_items && sale.sale_items.length > 0) {
          // Check if this sale has any non-downpayment items for stats calculation
          let hasNonDownpaymentItems = false;
          let saleSpent = 0;
          let saleItems = 0;
          
          for (const item of sale.sale_items) {
            // Handle variant data properly (could be array or single object)
            let variant = null;
            if (item.variants) {
              if (Array.isArray(item.variants)) {
                variant = item.variants[0] || null;
              } else {
                variant = item.variants;
              }
            }
            
            // Only count non-downpayment items in stats
            if (variant?.type !== 'downpayment') {
              hasNonDownpaymentItems = true;
              saleItems += item.quantity || 1;
              saleSpent += item.sold_price || 0;
            }
            
            let product: any = null;
            if (variant?.products) {
              if (Array.isArray(variant.products)) {
                product = variant.products[0] || null;
              } else {
                product = variant.products;
              }
            }
            
            // Determine product display name
            let productName = 'Unknown Product';
            if (product) {
              productName = product.brand 
                ? `${product.brand} ${product.name}`.trim()
                : product.name;
            }

            // Determine size display
            let sizeDisplay = 'Unknown Size';
            if (variant) {
              if (variant.size_label && variant.size) {
                sizeDisplay = `${variant.size} ${variant.size_label}`;
              } else {
                sizeDisplay = variant.size_label || variant.size || 'Unknown Size';
              }
            }

            // Determine identifier (serial number or pre-order info)
            let identifier = null;
            if (variant?.type === 'Pre-order' || variant?.type === 'downpayment') {
              // Extract pre-order number from notes
              const preOrderMatch = variant.notes?.match(/pre-order #(\d+)/);
              const preOrderNo = preOrderMatch?.[1] || 'N/A';
              identifier = `PO #${preOrderNo}`;
            } else {
              identifier = variant?.serial_number || null;
            }

            // Determine "sold by" from profit distribution
            let soldBy = 'Unknown';
            if (sale.sale_profit_distributions && sale.sale_profit_distributions.length > 0) {
              const distributions = sale.sale_profit_distributions;
              
              // Show avatar names from the profit distributions
              const avatarNames = distributions
                .filter(d => d.avatar)
                .map(d => {
                  // Handle avatar as array or object
                  const avatar = Array.isArray(d.avatar) ? d.avatar[0] : d.avatar;
                  return avatar?.name || 'Unknown Avatar';
                })
                .filter(name => name !== 'Unknown Avatar')
                .join(', ');
              soldBy = avatarNames || 'Unknown';
            }

            // Determine the type of purchase based on variant type
            let purchaseType = 'In Stock'; // Default
            if (variant?.type) {
              switch (variant.type) {
                case 'Pre-order':
                  purchaseType = 'Pre-order';
                  break;
                case 'downpayment':
                  purchaseType = 'Downpayment';
                  break;
                case 'In Stock':
                default:
                  purchaseType = 'In Stock';
                  break;
              }
            }

            purchaseHistory.push({
              id: `${sale.id}-${item.id}`,
              productName,
              size: sizeDisplay,
              price: item.sold_price || 0,
              quantity: item.quantity || 1,
              saleDate: sale.sale_date,
              saleNo: sale.sales_no,
              serialNumber: identifier,
              image: product?.image || null,
              type: purchaseType,
              variantSku: variant?.variant_sku || null,
              productSku: product?.sku || null,
              soldBy: soldBy
            });
          }
          
          // After processing all items in this sale, update stats if it had non-downpayment items
          if (hasNonDownpaymentItems) {
            totalOrders += 1;
            totalItems += saleItems;
            totalSpent += saleSpent;
          }
        }
      }
    }

    // Calculate average order value
    const averageOrder = totalOrders > 0 ? totalSpent / totalOrders : 0;

    // Sort by date (newest first)
    purchaseHistory.sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());

    // Return just the items array as the component expects
    return NextResponse.json(purchaseHistory);

  } catch (error) {
    console.error('Error in purchase history API:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}
