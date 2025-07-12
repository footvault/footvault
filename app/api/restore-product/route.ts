import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { productId } = await request.json();
    if (!productId) {
      return NextResponse.json({ success: false, error: 'Product ID is required' }, { status: 400 });
    }
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);
    // Check user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }
    // Restore product
    const { error: restoreError } = await supabase
      .from('products')
      .update({ isArchived: false })
      .eq('id', productId)
      .eq('user_id', user.id);
    if (restoreError) {
      return NextResponse.json({ success: false, error: restoreError.message }, { status: 500 });
    }
    // Restore all variants for this product
    await supabase
      .from('variants')
      .update({ isArchived: false })
      .eq('product_id', productId);
    return NextResponse.json({ success: true, message: 'Product and variants restored.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
