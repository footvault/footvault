import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function getUser() {
  const cookieStore = cookies()
  const supabase = await createClient(cookieStore)
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) throw error

    return {
      id: user.id,
      email: user.email,
      ...profile
    }
  } catch (error) {
    console.error('Error:', error)
    return null
  }
}
