"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"

export async function updateUsername(formData: FormData) {
  const cookieStore = cookies()
  const supabase = await createClient(cookieStore)
  const username = formData.get("username") as string

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { error } = await supabase
    .from("users")
    .update({ username })
    .eq("id", user.id)

  if (error) throw error

  revalidatePath("/settings")
  return { message: "Username updated successfully" }
}

export async function getUserProfile() {
  const cookieStore = cookies()
  const supabase = await createClient(cookieStore)
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single()

  if (error) throw error
  return data
}

export async function updateSettings({
  username,
  currency,
  timezone,
}: {
  username?: string
  currency?: string
  timezone?: string
}) {
  const cookieStore = cookies()
  const supabase = await createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("User not authenticated")   
  }

  const updates: Record<string, any> = {}
  if (username) updates.username = username
  if (currency) updates.currency = currency
  if (timezone) updates.timezone = timezone

  const { error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", user.id)

  if (error) {
    throw new Error(error.message)
  }
}
