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
    // Delete the sale (CASCADE will delete related sale_profit_distributions)
    const { error } = await supabase
      .from('sales')
      .delete()
      .eq('id', saleId)
      .eq('user_id', user.id);
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
