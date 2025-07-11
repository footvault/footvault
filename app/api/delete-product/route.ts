import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function DELETE(request: Request) {
  try {
    const { productId } = await request.json();

    if (!productId) {
      return NextResponse.json({
        success: false,
        error: "Product ID is required"
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

    // Archive the product (set isArchived to true)
    const { error: archiveError } = await supabase
      .from('products')
      .update({ isArchived: true })
      .eq('id', productId);

    if (archiveError) {
      console.error("Error archiving product:", archiveError);
      return NextResponse.json({
        success: false,
        error: archiveError.message
      }, { status: 500 });
    }

    // Archive all variants related to this product
    const { error: archiveVariantsError } = await supabase
      .from('variants')
      .update({ isArchived: true })
      .eq('product_id', productId);

    if (archiveVariantsError) {
      console.error("Error archiving variants:", archiveVariantsError);
      return NextResponse.json({
        success: false,
        error: archiveVariantsError.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Product archived successfully"
    });

  } catch (error: any) {
    console.error("Error in deleteProduct API route:", error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}