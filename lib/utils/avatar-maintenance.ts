import { createClient } from '@supabase/supabase-js'

// This is a utility function to ensure every user has a Main avatar
// Should be called during user setup or as a maintenance function

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role for admin operations

export async function ensureUserHasMainAvatar(userId: string) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  try {
    // Check if user has a Main avatar
    const { data: mainAvatar, error: checkError } = await supabase
      .from('avatars')
      .select('id')
      .eq('user_id', userId)
      .eq('type', 'Main')
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking for main avatar:', checkError)
      return { success: false, error: checkError.message }
    }

    if (mainAvatar) {
      return { success: true, message: 'User already has a main avatar' }
    }

    // Get user info
    const { data: user, error: userError } = await supabase.auth.admin.getUserById(userId)
    if (userError) {
      console.error('Error getting user:', userError)
      return { success: false, error: userError.message }
    }

    // Check if user has any avatars at all
    const { data: existingAvatars, error: avatarsError } = await supabase
      .from('avatars')
      .select('id, name, image, default_percentage')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (avatarsError) {
      console.error('Error getting existing avatars:', avatarsError)
      return { success: false, error: avatarsError.message }
    }

    if (existingAvatars && existingAvatars.length > 0) {
      // User has avatars but no Main type, convert the first one to Main
      const { error: updateError } = await supabase
        .from('avatars')
        .update({ 
          type: 'Main',
          default_percentage: 100.00
        })
        .eq('id', existingAvatars[0].id)

      if (updateError) {
        console.error('Error updating avatar to Main:', updateError)
        return { success: false, error: updateError.message }
      }

      return { success: true, message: 'Converted existing avatar to Main' }
    } else {
      // User has no avatars, create a Main one
      const email = user.user?.email || 'unknown'
      const fullName = user.user?.user_metadata?.full_name
      const avatarUrl = user.user?.user_metadata?.avatar_url
      
      const fallbackInitials = email
        .split('@')[0]
        .split(/[._-]/)
        .map(part => part[0]?.toUpperCase())
        .join('')
        .slice(0, 2) || 'NN'
      
      const fallbackAvatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${fallbackInitials}`
      const avatarImage = avatarUrl || fallbackAvatarUrl

      const { error: insertError } = await supabase
        .from('avatars')
        .insert({
          name: fullName || 'Main',
          user_id: userId,
          default_percentage: 100.00,
          image: avatarImage,
          type: 'Main',
        })

      if (insertError) {
        console.error('Error creating Main avatar:', insertError)
        return { success: false, error: insertError.message }
      }

      return { success: true, message: 'Created new Main avatar' }
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    return { success: false, error: 'Unexpected error occurred' }
  }
}

// Function to fix all users without main avatars
export async function fixAllUsersMainAvatars() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  try {
    // Get all users who don't have a Main avatar
    const { data: usersWithoutMain, error: queryError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        username
      `)
      .not('id', 'in', `(
        SELECT DISTINCT user_id 
        FROM avatars 
        WHERE type = 'Main'
      )`)

    if (queryError) {
      console.error('Error querying users without main avatars:', queryError)
      return { success: false, error: queryError.message }
    }

    if (!usersWithoutMain || usersWithoutMain.length === 0) {
      return { success: true, message: 'All users have Main avatars' }
    }

    const results = []
    for (const user of usersWithoutMain) {
      const result = await ensureUserHasMainAvatar(user.id)
      results.push({ userId: user.id, email: user.email, result })
    }

    return { 
      success: true, 
      message: `Processed ${results.length} users`,
      results 
    }
  } catch (error) {
    console.error('Unexpected error in fixAllUsersMainAvatars:', error)
    return { success: false, error: 'Unexpected error occurred' }
  }
}
