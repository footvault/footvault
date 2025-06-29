"use server";

import { createClient } from "@/lib/supabase/server"; 
import { cookies } from "next/headers";

export async function getUserSettings() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data } = await (await supabase).auth.getUser();
  const user = data.user;

  // If no user is authenticated, return null or default settings
  if (!user) {
    return {
      currency: "USD", // Default currency
      timezone: "America/New_York", // Default timezone
    };
  }

  const { data: userSettings, error } = await (await supabase)
    .from("users")
    .select("currency, timezone")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("Error fetching user settings:", error.message);
    return {
      currency: "USD", // Default currency
      timezone: "America/New_York", // Default timezone
    };
  }

  return userSettings;
}