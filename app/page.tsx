import { Metadata } from "next";
import { AuthCodeHandler } from "@/components/auth-code-handler";
import { AuthRedirect } from "@/components/auth-redirect";
import LandingNavbar from "@/components/landing/LandingNavbar";
import HeroSection from "@/components/landing/HeroSection";
import BrandMarquee from "@/components/landing/BrandMarquee";
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
    <main className="min-h-screen flex flex-col bg-[#0a0a0a] text-white relative overflow-x-hidden">
      {/* Subtle grid background */}
      {/* Subtle background texture */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Faint grid — only visible near hero, fades out */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:80px_80px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,black_20%,transparent_70%)]" />
        {/* Top emerald radial wash */}
        <div className="absolute -top-[40%] left-1/2 -translate-x-1/2 w-[1200px] h-[900px] rounded-full bg-emerald-500/[0.035] blur-[150px] animate-landing-glow-1" />
        {/* Bottom-right warm glow */}
        <div className="absolute -bottom-[20%] -right-[10%] w-[700px] h-[700px] rounded-full bg-emerald-600/[0.025] blur-[130px] animate-landing-glow-2" />
        {/* Subtle vignette — darkens edges, lifts center slightly */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />
      </div>
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

      <div className="flex-1 w-full flex flex-col relative z-10">
        <HeroSection />
        <BrandMarquee />
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
