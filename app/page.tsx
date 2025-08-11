import { AuthButton } from "@/components/auth-button";
import { Hero } from "@/components/hero";


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


export default async function Home() {
  const cookieStore = await import("next/headers").then((mod) => mod.cookies());
  const supabase = await createClient(cookieStore);
  const { data } = await supabase.auth.getUser();

  if (data?.user) {
    redirect("/inventory");
  }

  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col">
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
              <Link href="/features">Features</Link>
              <Link href="/pricing">Pricing</Link>
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
          <Features />
          <Pricing />
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
