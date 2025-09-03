import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'

const supabaseUrl: string = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey: string = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')

    const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })

    const {
      data: { user },
      error: userError,
    }: {
      data: { user: User | null }
      error: Error | null
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const consignorId = parseInt(params.id)
    
    const { data: consignor, error } = await supabase
      .from('consignors')
      .select('*')
      .eq('id', consignorId)
      .eq('user_id', user.id)
      .eq('isarchived', false)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Consignor not found' }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ consignor })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')

    const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })

    const {
      data: { user },
      error: userError,
    }: {
      data: { user: User | null }
      error: Error | null
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const consignorId = parseInt(params.id)
    const updateData = await request.json()

    // Remove fields that shouldn't be updated directly
    delete updateData.id
    delete updateData.user_id
    delete updateData.created_at
    
    updateData.updated_at = new Date().toISOString()

    const { data: consignor, error } = await supabase
      .from('consignors')
      .update(updateData)
      .eq('id', consignorId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ consignor })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')

    const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })

    const {
      data: { user },
      error: userError,
    }: {
      data: { user: User | null }
      error: Error | null
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const consignorId = parseInt(params.id)
    const { action } = await request.json()

    if (action === 'restore') {
      // Restore archived consignor
      const { data: consignor, error } = await supabase
        .from('consignors')
        .update({ 
          isarchived: false, 
          updated_at: new Date().toISOString(),
          status: 'active'
        })
        .eq('id', consignorId)
        .eq('user_id', user.id)
        .eq('isarchived', true) // Only restore if currently archived
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      if (!consignor) {
        return NextResponse.json({ error: 'Consignor not found or not archived' }, { status: 404 })
      }

      return NextResponse.json({ 
        message: 'Consignor restored successfully', 
        consignor 
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')

    const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })

    const {
      data: { user },
      error: userError,
    }: {
      data: { user: User | null }
      error: Error | null
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const consignorId = parseInt(params.id)
    const { searchParams } = new URL(request.url)
    const permanent = searchParams.get('permanent') === 'true'

    if (permanent) {
      // Permanent deletion: remove consignor but keep variants
      // First, update variants to remove consignor reference
      const { error: updateVariantsError } = await supabase
        .from('variants')
        .update({ 
          consignor_id: null,
          owner_type: 'store'
        })
        .eq('consignor_id', consignorId)

      if (updateVariantsError) {
        return NextResponse.json({ error: updateVariantsError.message }, { status: 500 })
      }

      // Now permanently delete the consignor
      const { error: deleteError } = await supabase
        .from('consignors')
        .delete()
        .eq('id', consignorId)
        .eq('user_id', user.id)
        .eq('isarchived', true) // Only allow permanent deletion of archived consignors

      if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 500 })
      }

      return NextResponse.json({ message: 'Consignor permanently deleted. Connected shoes are now owned by the store.' })
    }

    // Regular archive operation (existing logic)
    // Check if consignor has any active variants
    const { data: variants, error: variantsError } = await supabase
      .from('variants')
      .select('id')
      .eq('consignor_id', consignorId)
      .eq('owner_type', 'consignor')
      .limit(1)

    if (variantsError) {
      return NextResponse.json({ error: variantsError.message }, { status: 500 })
    }

    if (variants && variants.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete consignor with active variants. Archive the consignor instead.' 
      }, { status: 400 })
    }

    // Soft delete (archive) the consignor
    const { data: consignor, error } = await supabase
      .from('consignors')
      .update({ 
        isarchived: true, 
        updated_at: new Date().toISOString(),
        status: 'inactive'
      })
      .eq('id', consignorId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'Consignor archived successfully' })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
