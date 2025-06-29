import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: Request) {
  try {
    console.log('--- Incoming update-profit-template request ---');
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
    const { id, name, description, distributions } = body;
    if (!id || !name || !Array.isArray(distributions) || distributions.length === 0) {
      console.error('Invalid input:', { id, name, distributions });
      return NextResponse.json({ success: false, error: 'Invalid input' }, { status: 400 });
    }
    // Update the template
    console.log('Updating template:', { id, name, description });
    const { error: updateError } = await supabase
      .from('profit_distribution_templates')
      .update({ name, description })
      .eq('id', id);
    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
    }
    // Remove old items and insert new ones
    console.log('Deleting old items for template_id:', id);
    const { error: deleteError } = await supabase.from('profit_template_items').delete().eq('template_id', id);
    if (deleteError) {
      console.error('Delete old items error:', deleteError);
      return NextResponse.json({ success: false, error: deleteError.message }, { status: 500 });
    }
    const itemsToInsert = distributions.map((d) => ({
      template_id: id,
      avatar_id: d.avatar_id,
      percentage: d.percentage
    }));
    console.log('Inserting new items:', itemsToInsert);
    const { error: distError } = await supabase.from('profit_template_items').insert(itemsToInsert);
    if (distError) {
      console.error('Insert new items error:', distError);
      return NextResponse.json({ success: false, error: distError.message }, { status: 500 });
    }
    console.log('Update successful');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in update-profit-template:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
