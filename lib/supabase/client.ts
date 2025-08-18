import { createBrowserClient } from "@supabase/ssr"

export function createClient(cookieStore: unknown) {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}
