'use client';

import { motion } from "framer-motion"; // You had `"motion/react"` which is incorrect; should be from `framer-motion`
import Image from "next/image";

const companies = [
  { name: "Supabase", logo: "https://supabase.com/icons/supabase-logo.svg" },
  { name: "Next.js", logo: "https://upload.wikimedia.org/wikipedia/commons/8/8e/Nextjs-logo.svg" },
  { name: "Vercel", logo: "https://assets.vercel.com/image/upload/front/assets/design/vercel-triangle-black.svg" },
  { name: "Stripe", logo: "https://seeklogo.com/images/S/stripe-logo-7B2420E5B7-seeklogo.com.png" },
  { name: "Notion", logo: "https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png" },
];

export default function Marquee() {
  return (
    <div className="relative w-full py-8 overflow-hidden border-t border-border">
      {/* Left fade gradient */}
      <div className="pointer-events-none absolute top-0 bottom-0 left-0 w-24 z-10 bg-gradient-to-r from-white to-transparent dark:from-background" />
      
      {/* Right fade gradient */}
      <div className="pointer-events-none absolute top-0 bottom-0 right-0 w-24 z-10 bg-gradient-to-l from-white to-transparent dark:from-background" />

      <motion.div
        className="flex gap-16 w-max px-24 animate-marquee"
        initial={{ x: 0 }}
        animate={{ x: ["0%", "-50%"] }}
        transition={{
          ease: "linear",
          duration: 20,
          repeat: Infinity,
        }}
      >
        {[...companies, ...companies].map((company, index) => (
          <div
            key={index}
            className="flex items-center justify-center w-32 h-20 grayscale hover:grayscale-0 transition-all"
          >
            <Image
              src={company.logo}
              alt={company.name}
              width={100}
              height={40}
              className="object-contain max-h-10"
            />
          </div>
        ))}
      </motion.div>
    </div>
  );
}
