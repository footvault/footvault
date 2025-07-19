'use client';

import { motion } from "framer-motion"; // You had `"motion/react"` which is incorrect; should be from `framer-motion`
import Image from "next/image";

const sneakerBrands = [
  { name: "Nike", logo: "https://logos-world.net/wp-content/uploads/2020/04/Nike-Logo.png" },
  { name: "Jordan", logo: "https://i.pinimg.com/736x/01/39/93/0139937c2f641ab61fd020844ccfd459.jpg" },
  { name: "Adidas", logo: "https://logos-world.net/wp-content/uploads/2020/04/Adidas-Logo.png" },
  { name: "Converse", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Converse_logo.svg/1200px-Converse_logo.svg.png" },
  { name: "Puma", logo: "https://logos-world.net/wp-content/uploads/2020/04/Puma-Logo.png" },
  { name: "New Balance", logo: "https://images.seeklogo.com/logo-png/9/1/new-balance-logo-png_seeklogo-98723.png" },
  { name: "Vans", logo: "https://logos-world.net/wp-content/uploads/2020/04/Vans-Logo.png" },
  { name: "Reebok", logo: "https://logos-world.net/wp-content/uploads/2020/04/Reebok-Logo.png" },
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
        {[...sneakerBrands, ...sneakerBrands].map((brand, index) => (
          <div
            key={index}
            className="flex items-center justify-center w-32 h-20 grayscale hover:grayscale-0 transition-all"
          >
            <Image
              src={brand.logo}
              alt={brand.name}
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
