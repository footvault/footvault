import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  let next = searchParams.get('next') ?? '/'
  if (!next.startsWith('/')) next = '/'

  if (code) {
    const supabase = await createAdminClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        // Check if user already exists
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('id', user.id)
          .single()

        if (!existingUser) {
          const plan = 'Free'
          const email = user.email || 'NoEmail'
          const currency = 'USD'
          const username = user.user_metadata.full_name ?? email ?? 'NoName'

          // Insert into users table
          const { error: insertUserError } = await supabase.from('users').insert({
            id: user.id,
            username: username,
            plan: plan,
            email: email,
            currency: currency,
          })

          if (insertUserError) {
            console.error('Insert user error:', insertUserError)
          } else {
            // Prepare avatar name
            const avatarName = username.replace(/\s+/g, '_').toLowerCase()

            // Use Google image if available
            const googleImage = user.user_metadata.avatar_url || null

            // Generate initials from email
            const fallbackInitials = email
              .split('@')[0]
              .split(/[._-]/)
              .map(part => part[0]?.toUpperCase())
              .join('')
              .slice(0, 2) || 'NN'

            // DiceBear fallback avatar URL
            const fallbackAvatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${fallbackInitials}`

            const avatarImage = googleImage ?? fallbackAvatarUrl

            // Insert avatar
            const { error: insertAvatarError } = await supabase.from('avatars').insert({
              name: avatarName,
              user_id: user.id,
              default_percentage: 0.0,
              image: avatarImage,
            })

            if (insertAvatarError) {
              console.error('Insert avatar error:', insertAvatarError)
            }
          }
        }
      }

      // Redirect logic
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
