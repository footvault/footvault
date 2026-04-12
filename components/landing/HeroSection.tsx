'use client';

import { motion } from 'motion/react';
import { easeOut } from 'motion';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: easeOut },
  },
};

export default function HeroSection() {
  return (
    <section className="relative w-full px-5 sm:px-8 pt-20 pb-16 sm:pt-28 sm:pb-24 lg:pt-36 lg:pb-32 overflow-hidden">
      {/* Subtle grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />

      {/* Radial glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-emerald-500/[0.05] rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-5xl mx-auto relative z-10">
        <motion.div
          className="flex flex-col items-center text-center gap-6 sm:gap-8"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          {/* Trust badge */}
          <motion.div variants={itemVariants}>
            <div className="inline-flex items-center gap-2 border border-white/[0.08] bg-white/[0.03] rounded-full px-4 py-1.5 text-xs text-neutral-400">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              Used by sneaker resellers across the Philippines
            </div>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={itemVariants}
            className="text-4xl sm:text-5xl lg:text-7xl font-bold leading-[1.1] tracking-tight text-white max-w-4xl"
          >
            Track every pair.{' '}
            <br className="hidden sm:block" />
            Know your{' '}
            <span className="text-emerald-400">real profit.</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            variants={itemVariants}
            className="text-base sm:text-lg lg:text-xl text-neutral-400 max-w-2xl leading-relaxed"
          >
            FootVault is the inventory and sales management system built specifically
            for sneaker resellers. Add pairs, track sizes, sell, and see your profit — all in one place.
          </motion.p>

          {/* CTA */}
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center gap-4">
            <Link
              href="/login"
              className="group inline-flex items-center justify-center bg-white text-black font-semibold px-7 py-3.5 rounded-lg text-sm hover:bg-neutral-200 transition-colors"
            >
              Start Free
              <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#features"
              className="text-sm text-neutral-400 hover:text-white transition-colors"
            >
              See how it works
            </a>
          </motion.div>
        </motion.div>

        {/* Dashboard mockup */}
        <motion.div
          className="mt-16 sm:mt-20 lg:mt-24 relative"
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.8 }}
        >
          {/* Glow behind mockup */}
          <div className="absolute -inset-4 bg-gradient-to-b from-emerald-500/[0.08] via-transparent to-transparent rounded-3xl blur-2xl pointer-events-none" />

          {/* Main dashboard image */}
          <div className="relative rounded-xl border border-white/[0.08] overflow-hidden bg-[#111]">
            <Image
              src="/images/footvault tablet.png"
              alt="FootVault Dashboard"
              width={1200}
              height={750}
              className="w-full h-auto"
              priority
            />
            {/* Bottom fade */}
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
          </div>

          {/* Floating phone mockup - desktop only */}
          <motion.div
            className="hidden lg:block absolute -right-8 -bottom-8 z-10"
            initial={{ opacity: 0, x: 40, y: 20 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ duration: 1, ease: 'easeOut', delay: 1.2 }}
          >
            <div className="relative">
              <Image
                src="/images/footvault phone.png"
                alt="FootVault Mobile"
                width={200}
                height={400}
                className="rounded-2xl drop-shadow-2xl"
              />
              <div className="absolute inset-0 rounded-2xl ring-1 ring-white/[0.08]" />
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
