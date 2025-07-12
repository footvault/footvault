import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { variantId } = await request.json();
    if (!variantId) {
      return NextResponse.json({ success: false, error: 'Variant ID is required' }, { status: 400 });
    }
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);
    // Check user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }
    // Restore variant
    const { error: restoreError } = await supabase
      .from('variants')
      .update({ isArchived: false })
      .eq('id', variantId)
      .eq('user_id', user.id);
    if (restoreError) {
      return NextResponse.json({ success: false, error: restoreError.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, message: 'Variant restored.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
