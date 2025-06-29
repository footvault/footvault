// api/delete-variants/route.ts
// This API route handles the deletion of product variants from the database.
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function DELETE(request: Request) {
  try {
    const { variantIds } = await request.json();

    if (!variantIds || !Array.isArray(variantIds) || variantIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: "Variant IDs array is required"
      }, { status: 400 });
    }

    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    // Check if user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({
        success: false,
        error: "Authentication required"
      }, { status: 401 });
    }

    // Delete the variants
    const { error: deleteError } = await supabase
      .from('variants') // Adjust table name based on your schema
      .delete()
      .eq('user_id', user.id) // Ensure the user owns the variants
      .or(`status.eq.Available,status.eq.In Display`)
      .in('id', variantIds);

    if (deleteError) {
      console.error("Error deleting variants:", deleteError);
      return NextResponse.json({
        success: false,
        error: deleteError.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `${variantIds.length} variant(s) deleted successfully`
    });

  } catch (error: any) {
    console.error("Error in deleteVariants API route:", error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}