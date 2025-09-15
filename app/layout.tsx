import type { Metadata } from "next"
import "./globals.css"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { CurrencyProvider } from "@/context/CurrencyContext"
import { TimezoneProvider } from "@/context/TimezoneContext"
import { getUserSettings } from "./settings/settingActions"
import ClientLayout from "@/components/ClientLayout"

export const metadata: Metadata = {
  title: {
    default: "FootVault - Ultimate Sneaker Reseller Inventory Management Tool",
    template: "%s | FootVault - Sneaker Reseller Tools"
  },
  description: "The most powerful sneaker reseller inventory management platform. Track sneaker stock, manage resale profits, automate pricing, and scale your sneaker business with advanced tools for Jordan, Nike, Yeezy, and designer footwear.",
  keywords: [
    "sneaker reseller tools",
    "sneaker inventory management",
    "resale inventory tracker",
    "sneaker stock management",
    "sneaker business software",
    "footwear inventory system",
    "Jordan reseller tools",
    "Nike inventory tracker",
    "Yeezy resale management",
    "sneaker profit calculator",
    "reseller dashboard",
    "shoe inventory app",
    "sneakerhead business tools",
    
    "sneaker authentication tools",
    "resale price tracking",
    "sneaker database",
    "footwear reseller platform",
    "sneaker collection manager"
  ],
  authors: [{ name: "FootVault Team" }],
  creator: "FootVault",
  publisher: "FootVault",
  applicationName: "FootVault",
  generator: "Next.js",
  referrer: "origin-when-cross-origin",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://footvault.dev",
    siteName: "FootVault",
    title: "FootVault - Ultimate Sneaker Reseller Inventory Management Tool",
    description: "The most powerful sneaker reseller inventory management platform. Track sneaker stock, manage resale profits, automate pricing, and scale your sneaker business.",
    images: [
      {
        url: "/images/footvault-og-image.jpg",
        width: 1200,
        height: 630,
        alt: "FootVault - Sneaker Reseller Inventory Management Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@FootVaultApp",
    creator: "@FootVaultApp",
    title: "FootVault - Ultimate Sneaker Reseller Inventory Management Tool",
    description: "The most powerful sneaker reseller inventory management platform. Track sneaker stock, manage resale profits, automate pricing, and scale your sneaker business.",
    images: ["/images/footvault-twitter-card.jpg"],
  },
  verification: {
    google: "your-google-verification-code",
    yandex: "your-yandex-verification-code",
    yahoo: "your-yahoo-verification-code",
  },
  category: "Business Software",
  classification: "Inventory Management",
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
          headers: { Cookie: (await cookieStore).toString() },
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
    <html lang="en" itemScope itemType="https://schema.org/WebApplication">
      <head>
        <link rel="canonical" href="https://footvault.dev " />
        <link rel="alternate" hrefLang="en" href="https://https://footvault.dev" />
        <meta name="theme-color" content="#000000" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="format-detection" content="telephone=no" />
        
        {/* Structured Data for SaaS Application */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "FootVault",
              "description": "The most powerful sneaker reseller inventory management platform for tracking stock, managing profits, and scaling sneaker businesses.",
              "applicationCategory": "BusinessApplication",
              "operatingSystem": "Web Browser",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD",
                "category": "Free Tier Available"
              },
              "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": "4.9",
                "ratingCount": "1200",
                "bestRating": "5",
                "worstRating": "1"
              },
              "creator": {
                "@type": "Organization",
                "name": "FootVault",
                "url": "https://https://footvault.dev"
              },
              "keywords": "sneaker reseller tools, sneaker inventory management, resale inventory tracker, sneaker stock management, sneaker business software",
              "url": "https://https://footvault.dev",
              "downloadUrl": "https://https://footvault.dev",
              "screenshot": "https://https://footvault.dev/images/footvault-screenshot.jpg"
            })
          }}
        />

        {/* Organization Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "FootVault",
              "description": "Leading provider of sneaker reseller inventory management tools and software solutions.",
              "url": "https://https://footvault.dev",
              "logo": "https://https://footvault.dev/images/FootVault-logo-white-only.png",
              "contactPoint": {
                "@type": "ContactPoint",
                "telephone": "+1-555-FOOTVAULT",
                "contactType": "Customer Service",
                "email": "support@https://footvault.dev"
              },
              "sameAs": [
                "https://twitter.com/FootVaultApp",
                "https://linkedin.com/company/footvault",
                "https://instagram.com/footvaultapp"
              ]
            })
          }}
        />
      </head>
      <body>
        <CurrencyProvider currency={userSettings?.currency || "USD"}>
          <TimezoneProvider timezone={userSettings?.timezone || "America/New_York"}>
            <ClientLayout user={user}>{children}</ClientLayout>
          </TimezoneProvider>
        </CurrencyProvider>
      </body>
    </html>
  )
}
