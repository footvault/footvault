import { AuthButton } from "@/components/auth-button";
import { Hero } from "@/components/hero";
import { Metadata } from "next";
import { DiscordBanner } from "@/components/discord-banner";

import Link from "next/link";
import Image from "next/image";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Marquee from "@/components/Marquee";
import Features from "@/components/Features";
import Pricing from "@/components/Pricing";
import Footer from "@/components/Footer";
import InfiniteCarousel from "@/components/Testimonials";
import CallToAction from "@/components/CallToAction";
import { AuthCodeHandler } from "@/components/auth-code-handler";


export const metadata: Metadata = {
  title: "FootVault - Ultimate Sneaker Reseller Inventory Management Tool",
  description: "The most powerful sneaker reseller inventory management platform. Track sneaker stock, manage resale profits, automate pricing, and scale your sneaker business with advanced tools for Jordan, Nike, Yeezy, and designer footwear.",
  keywords: "sneaker reseller tools, sneaker inventory management, resale inventory tracker, sneaker stock management, sneaker business software, Jordan reseller tools, Nike inventory tracker, Yeezy resale management",
  openGraph: {
    title: "FootVault - Ultimate Sneaker Reseller Inventory Management Tool",
    description: "The most powerful sneaker reseller inventory management platform. Track sneaker stock, manage resale profits, automate pricing, and scale your sneaker business.",
    url: "https://https://footvault.dev",
    siteName: "FootVault",
    images: [
      {
        url: "/images/footvault-og-home.jpg",
        width: 1200,
        height: 630,
        alt: "FootVault Homepage - Sneaker Reseller Tools",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FootVault - Ultimate Sneaker Reseller Inventory Management Tool",
    description: "The most powerful sneaker reseller inventory management platform for sneaker resellers and businesses.",
    images: ["/images/footvault-twitter-home.jpg"],
  },
  alternates: {
    canonical: "https://https://footvault.dev",
  },
}


export default async function Home() {
  // Re-enable server-side auth check now that OAuth is working
  const cookieStore = await import("next/headers").then((mod) => mod.cookies());
  const supabase = await createClient(cookieStore);
  
  try {
    const { data } = await supabase.auth.getUser();
    
    if (data?.user) {
      redirect("/inventory");
    }
  } catch (error) {
    console.error('Auth check error on homepage:', error);
    // Don't redirect on auth errors, just show the homepage
  }

  return (
    <main className="min-h-screen flex flex-col items-center">
      {/* Handle OAuth codes that end up on root page */}
      <AuthCodeHandler />
      
      {/* SEO Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": "FootVault - Ultimate Sneaker Reseller Inventory Management Tool",
            "description": "The most powerful sneaker reseller inventory management platform. Track sneaker stock, manage resale profits, automate pricing, and scale your sneaker business.",
            "url": "https://https://footvault.dev",
            "mainEntity": {
              "@type": "SoftwareApplication",
              "name": "FootVault",
              "applicationCategory": "BusinessApplication",
              "description": "Advanced sneaker reseller inventory management platform with tools for tracking stock, managing profits, and scaling sneaker businesses.",
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
                  "item": "https://https://footvault.dev"
                }
              ]
            }
          })
        }}
      />
      
      <div className="flex-1 w-full flex flex-col">
        {/* Discord Banner */}
        <DiscordBanner />

        {/* ✅ Responsive Navbar */}
        <nav className="w-full border-b border-b-foreground/10 h-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
            {/* Left Logo */}
            <div className="font-bold text-base ">
              
              <Link href="/" className="flex items-center gap-2">
              <Image src={"/images/FootVault-logo-white-only.png"} alt="FootVault" width={32} height={32} />
              <p>FootVault</p>
              </Link>
            </div>

            {/* Centered links for medium+ screens */}
              <div className="hidden md:flex gap-6 font-medium">
                <Link href="/">Home</Link>
                <a href="#features">Features</a>
                <a href="#pricing">Pricing</a>
                <Link href="/contact">Contact</Link>
              </div>

            {/* Right-side buttons */}
            <div>
               <AuthButton />
            </div>
          </div>
        </nav>

        {/* ✅ Page Content */}
          <div className="flex-1 w-full mx-auto  flex flex-col ">
            <Hero />
            <Marquee />
            <section id="features">
              <Features />
            </section>
            <section id="pricing">
              <Pricing />
            </section>
            <InfiniteCarousel />
            <CallToAction/>
          </div>

        {/* ✅ Footer */}
        <div>
          <Footer />
          
        </div>
      </div>
    </main>
  );
}
