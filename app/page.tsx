import { Metadata } from "next";
import { AuthCodeHandler } from "@/components/auth-code-handler";
import { AuthRedirect } from "@/components/auth-redirect";
import LandingNavbar from "@/components/landing/LandingNavbar";
import HeroSection from "@/components/landing/HeroSection";
import ProblemSection from "@/components/landing/ProblemSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import WhyFootVault from "@/components/landing/WhyFootVault";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import PricingSection from "@/components/landing/PricingSection";
import ObjectionSection from "@/components/landing/ObjectionSection";
import FinalCTA from "@/components/landing/FinalCTA";
import LandingFooter from "@/components/landing/LandingFooter";


export const metadata: Metadata = {
  title: "FootVault - Inventory & Sales Management for Sneaker Resellers",
  description: "Track every pair, manage sales, and know your real profit. FootVault is the inventory and sales management system built specifically for sneaker resellers.",
  keywords: "sneaker reseller tools, sneaker inventory management, resale inventory tracker, sneaker stock management, sneaker business software, Jordan reseller tools, Nike inventory tracker, Yeezy resale management",
  openGraph: {
    title: "FootVault - Inventory & Sales Management for Sneaker Resellers",
    description: "Track every pair, manage sales, and know your real profit. Built specifically for sneaker resellers.",
    url: "https://footvault.dev",
    siteName: "FootVault",
    images: [
      {
        url: "/images/footvault-og-home.jpg",
        width: 1200,
        height: 630,
        alt: "FootVault - Sneaker Reseller Inventory Management",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FootVault - Inventory & Sales Management for Sneaker Resellers",
    description: "Track every pair, manage sales, and know your real profit. Built specifically for sneaker resellers.",
    images: ["/images/footvault-twitter-home.jpg"],
  },
  alternates: {
    canonical: "https://footvault.dev",
  },
}


export default async function Home() {
  return (
    <main className="min-h-screen flex flex-col bg-[#0a0a0a] text-white">
      {/* Handle OAuth codes that end up on root page */}
      <AuthCodeHandler />
      
      {/* Client-side auth redirect for persistent sessions */}
      <AuthRedirect />
      
      {/* SEO Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": "FootVault - Inventory & Sales Management for Sneaker Resellers",
            "description": "Track every pair, manage sales, and know your real profit. Built specifically for sneaker resellers.",
            "url": "https://footvault.dev",
            "mainEntity": {
              "@type": "SoftwareApplication",
              "name": "FootVault",
              "applicationCategory": "BusinessApplication",
              "description": "Inventory and sales management platform built specifically for sneaker resellers.",
              "operatingSystem": "Web Browser",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              }
            },
            "breadcrumb": {
              "@type": "BreadcrumbList",
              "itemListElement": [
                {
                  "@type": "ListItem",
                  "position": 1,
                  "name": "Home",
                  "item": "https://footvault.dev"
                }
              ]
            }
          })
        }}
      />
      
      <LandingNavbar />

      <div className="flex-1 w-full flex flex-col">
        <HeroSection />
        <ProblemSection />
        <FeaturesSection />
        <WhyFootVault />
        <TestimonialsSection />
        <PricingSection />
        <ObjectionSection />
        <FinalCTA />
      </div>

      <LandingFooter />
    </main>
  );
}
