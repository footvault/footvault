import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'No template id provided' }, { status: 400 });
    }
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ success: false, error: 'No authorization header' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

     const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({
        success: false,
        error: "Authentication required"
      }, { status: 401 });
    }
    const { data: template, error: templateError } = await supabase
      .from('profit_distribution_templates')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();
    if (templateError || !template) {
      return NextResponse.json({ success: false, error: templateError?.message || 'Template not found' }, { status: 404 });
    }
    const { data: distributions, error: distError } = await supabase
      .from('profit_template_items')
      .select('avatar_id, percentage')
      .eq('template_id', id);
    if (distError) {
      return NextResponse.json({ success: false, error: distError.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, data: { ...template, distributions: distributions || [] } });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
