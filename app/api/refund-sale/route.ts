import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(req: NextRequest) {
  try {
    const { saleId } = await req.json()
    if (!saleId) {
      return NextResponse.json({ success: false, error: "Missing saleId" }, { status: 400 })
    }

    // Get the authorization token from the header
    const authHeader = req.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: "No authorization header" },
        { status: 401 }
      )
    }

    const token = authHeader.replace("Bearer ", "")
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Get the authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token)

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      )
    }

    // Create authenticated Supabase client with user's token
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
    )

    // Call the refund_sale function in Supabase with authenticated client
    const { data, error } = await authenticatedSupabase.rpc("refund_sale", { sale_to_refund: saleId })

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    // Optionally fetch the updated sale to return in response
    const { data: updatedSale } = await authenticatedSupabase
      .from('sales')
      .select('*')
      .eq('id', saleId)
      .single()

    return NextResponse.json({ success: true, sale: updatedSale, data })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
