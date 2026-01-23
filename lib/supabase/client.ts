import { createBrowserClient } from "@supabase/ssr"

export function createClient(cookieStore?: unknown) {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true, // Ensure sessions persist across browser sessions
        autoRefreshToken: true, // Automatically refresh expired tokens
        detectSessionInUrl: true, // Handle OAuth callbacks
        storage: typeof window !== 'undefined' ? window.localStorage : undefined, // Use localStorage for persistence
      }
    }
  )
}
