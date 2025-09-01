import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('Authentication error:', userError);
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }
    const body = await request.json();
 
    const { name, description, distributions } = body;
    if (!name || !Array.isArray(distributions) || distributions.length === 0) {
      console.error('Invalid input:', { name, distributions });
      return NextResponse.json({ success: false, error: 'Invalid input' }, { status: 400 });
    }
    // Insert template (without distributions)
    const { data: template, error: insertError } = await supabase
      .from('profit_distribution_templates')
      .insert([
        { name, description, user_id: user.id }
      ])
      .select('*')
      .single();
    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
    }
   
    // Insert distributions into profit_template_items (or your actual table name)
    const itemsToInsert = distributions.map((d: any) => ({
      template_id: template.id,
      avatar_id: d.avatar_id,
      percentage: d.percentage
    }));
    const { error: distError } = await supabase
      .from('profit_template_items')
      .insert(itemsToInsert);
    if (distError) {
      console.error('Distribution insert error:', distError);
      return NextResponse.json({ success: false, error: distError.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, data: template });
  } catch (error) {
    console.error('Unexpected error in add-profit-template:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
