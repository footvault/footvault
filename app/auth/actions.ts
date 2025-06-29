"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

export async function signInWithEmail(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const cookieStore = await cookies()
  const supabase = await createClient(cookieStore)

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    console.error("Sign-in error:", error.message)
    return { success: false, message: error.message }
  }

  redirect("/inventory") // Redirect to inventory after successful login
}

export async function signUpWithEmail(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const cookieStore = await cookies()
  const supabase = await createClient(cookieStore)

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`, // Ensure this URL is configured in Supabase
    },
  })

  if (error) {
    console.error("Sign-up error:", error.message)
    return { success: false, message: error.message }
  }

  return { success: true, message: "Check your email for a confirmation link!" }
}

export async function signInWithGoogle() {
  const cookieStore = await cookies()
  const supabase = await createClient(cookieStore)
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`, // Ensure this URL is configured in Supabase
    },
  })

  if (error) {
    console.error("Google sign-in error:", error.message)
    return { success: false, message: error.message }
  }

  redirect(data.url) // Redirect to Google OAuth provider
}

export async function signOut(formData: FormData) {
  const cookieStore = cookies()
  const supabase = createClient(cookieStore)

  const { error } = await (await supabase).auth.signOut()

  if (error) {
    console.error("Sign-out error:", error.message)
    throw error
  }

  revalidatePath("/")
  redirect("/login") // Redirect to login page after sign out
}
