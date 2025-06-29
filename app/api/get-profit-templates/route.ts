import { NextResponse } from 'next/server';
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({
        success: false,
        error: "No authorization header"
      }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const authenticatedSupabase = createClient(
      supabaseUrl,
      supabaseKey,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );

    const { data: { user }, error: userError } = await authenticatedSupabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({
        success: false,
        error: "Authentication required"
      }, { status: 401 });
    }

    // Get profit distribution templates for the current user
    const { data: templates, error: templatesError } = await authenticatedSupabase
      .from('profit_distribution_templates')
      .select('*')
      .eq('user_id', user.id);

    if (templatesError) {
      console.error("Error fetching profit templates:", templatesError);
      return NextResponse.json({ 
        success: false, 
        error: templatesError.message 
      }, { status: 500 });
    }

    // Fetch distributions for each template
    const templateIds = (templates || []).map(t => t.id);
    let distributionsByTemplate: Record<string, any[]> = {};
    if (templateIds.length > 0) {
      const { data: items, error: itemsError } = await authenticatedSupabase
        .from('profit_template_items')
        .select('template_id, avatar_id, percentage')
        .in('template_id', templateIds);
      console.log('Fetched items from profit_template_items:', items);
      if (itemsError) {
        console.error('Error fetching template items:', itemsError);
        return NextResponse.json({ success: false, error: itemsError.message }, { status: 500 });
      }
      for (const item of items) {
        if (!distributionsByTemplate[item.template_id]) distributionsByTemplate[item.template_id] = [];
        distributionsByTemplate[item.template_id].push({
          avatar_id: item.avatar_id,
          percentage: item.percentage
        });
      }
    }

    // Attach distributions to each template
    const templatesWithDistributions = (templates || []).map(t => ({
      ...t,
      distributions: distributionsByTemplate[t.id] || []
    }));
    console.log('API response:', templatesWithDistributions);

    return NextResponse.json({
      success: true,
      data: templatesWithDistributions
    });
  } catch (error: any) {
    console.error("Error in getProfitTemplates API route:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
