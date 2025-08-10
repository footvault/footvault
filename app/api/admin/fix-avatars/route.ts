import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fixAllUsersMainAvatars, ensureUserHasMainAvatar } from '@/lib/utils/avatar-maintenance'

// This endpoint is for maintenance purposes
// Should be protected and only accessible by admins
export async function POST(request: Request) {
  try {
    // Add basic authentication check
    const authHeader = request.headers.get('authorization')
    if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_API_KEY}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, userId } = body

    if (action === 'fix-single-user' && userId) {
      const result = await ensureUserHasMainAvatar(userId)
      return NextResponse.json(result)
    }

    if (action === 'fix-all-users') {
      const result = await fixAllUsersMainAvatars()
      return NextResponse.json(result)
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Avatar maintenance error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

// GET endpoint to check avatar status
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_API_KEY}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (userId) {
      // Check specific user's avatar status
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      const { data: avatars, error } = await supabase
        .from('avatars')
        .select('*')
        .eq('user_id', userId)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ userId, avatars })
    }

    return NextResponse.json({ error: 'userId required' }, { status: 400 })
  } catch (error) {
    console.error('Avatar check error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}
