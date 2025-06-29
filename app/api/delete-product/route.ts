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

    // Delete the product (cascade delete will handle variants)
    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);

    if (deleteError) {
      console.error("Error deleting product:", deleteError);
      return NextResponse.json({
        success: false,
        error: deleteError.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Product deleted successfully"
    });

  } catch (error: any) {
    console.error("Error in deleteProduct API route:", error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}