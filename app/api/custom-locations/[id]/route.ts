import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// UPDATE location name
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
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name } = await request.json()
    
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Location name is required' }, { status: 400 })
    }

    // Check if a location with this name already exists for this user
    const { data: existing, error: checkError } = await supabase
      .from('custom_locations')
      .select('id')
      .eq('name', name.trim())
      .eq('user_id', user.id)
      .neq('id', params.id)
      .single()

    if (existing) {
      return NextResponse.json({ 
        error: 'A location with this name already exists' 
      }, { status: 400 })
    }

    // Update the location name
    const { data, error } = await supabase
      .from('custom_locations')
      .update({ 
        name: name.trim(), 
        updated_at: new Date().toISOString() 
      })
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating location:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Error in PATCH /api/custom-locations/[id]:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE location
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
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if any variants are using this location (using location_id foreign key)
    const { data: variantsUsingLocation, error: checkError } = await supabase
      .from('variants')
      .select('id')
      .eq('location_id', params.id)
      .eq('user_id', user.id)
      .limit(1)

    if (checkError) {
      console.error('Error checking location usage:', checkError)
      return NextResponse.json({ error: checkError.message }, { status: 500 })
    }

    if (variantsUsingLocation && variantsUsingLocation.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete location that is currently in use by variants',
        inUse: true 
      }, { status: 400 })
    }

    // Delete location
    const { error } = await supabase
      .from('custom_locations')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting location:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in DELETE /api/custom-locations/[id]:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
