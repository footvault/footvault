import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: Request) {
  try {
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
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }
    const formData = await request.formData();
    const name = formData.get('name');
    const default_percentage = formData.get('default_percentage');
    if (!name) {
      return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
    }
    const { error: insertError } = await supabase.from('avatars').insert([
      {
        name,
        default_percentage: default_percentage ? Number(default_percentage) : 0,
        user_id: user.id,
      },
    ]);
    if (insertError) {
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, message: 'Avatar created successfully' });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
