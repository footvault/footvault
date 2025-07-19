import type { Metadata } from "next"
import "./globals.css"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { CurrencyProvider } from "@/context/CurrencyContext"
import { getUserSettings } from "./settings/settingActions"
import ClientLayout from "@/components/ClientLayout"

export const metadata: Metadata = {
  title: "FootVault",
  description: "Created with FootVault",
  generator: "FootVault",
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = cookies()
  const supabase = await createClient(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Define protected routes
  const protectedRoutes = ["/inventory", "/add-product", "/checkout", "/sales", "/subscription", "/settings"]
  const currentPath = (await cookieStore).get("next-url")?.value || "/" // Get current path from cookie or default to /

  // Check inventory limit for all authenticated users
  let overLimit = false
  if (user) {
    // Call the API route to get inventory stats
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/user-inventory-stats`,
        {
          method: "GET",
          headers: { Cookie: cookieStore.toString() },
        }
      )
      const data = await res.json()
      if (data.overLimit) {
        overLimit = true
      }
    } catch (e) {
      // fail silently, allow access
    }
  }

  // Redirect unauthenticated users from protected routes
  if (!user && protectedRoutes.includes(currentPath)) {
    redirect("/login")
  }

  // Redirect users over the hard inventory limit
  if (overLimit && protectedRoutes.includes(currentPath)) {
    redirect("/contact-enterprise")
  }

  const userSettings = await getUserSettings()

  return (
    <html lang="en">
      <body>
        <CurrencyProvider currency={userSettings?.currency || "USD"}>
          <ClientLayout user={user}>{children}</ClientLayout>
        </CurrencyProvider>
      </body>
    </html>
  )
}
