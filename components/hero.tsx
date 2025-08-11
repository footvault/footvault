'use client';

import { motion } from "motion/react";
import { easeOut } from "motion";
import Image from "next/image";

// Configuration
const SHOW_BETA_BADGE = true; // Set to false to hide the beta badge

// Variants for smoother staggered children
const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.25,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: easeOut,
    },
  },
};

export function Hero() {
  return (
    <section className="w-full px-4 sm:px-6 py-12 sm:py-16 lg:py-24 overflow-hidden relative min-h-screen flex flex-col justify-center">
      {/* Enhanced smooth gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-100/50 dark:from-gray-950 dark:via-slate-900 dark:to-indigo-950/60"></div>
      
      {/* Additional gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-white/40 via-transparent to-transparent dark:from-gray-950/60 dark:via-transparent"></div>
      
      <div className="max-w-7xl mx-auto relative z-10 flex flex-col items-center text-center">

        {/* Top Content - Centered */}
        <motion.div
          className="flex flex-col gap-4 sm:gap-6 items-center text-center max-w-5xl mb-8 sm:mb-12 lg:mb-16"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <motion.h1
            variants={itemVariants}
            className="text-3xl sm:text-4xl lg:text-6xl xl:text-7xl font-bold leading-tight tracking-tight text-gray-900 dark:text-white px-2"
          >
            The #1 Inventory System Built for{' '}
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 dark:from-blue-400 dark:via-purple-400 dark:to-indigo-400 bg-clip-text text-transparent font-extrabold">
              Sneaker Resellers
            </span>
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="text-base sm:text-lg lg:text-xl text-gray-600 dark:text-gray-300 max-w-3xl leading-relaxed px-2"
          >
            Track your kicks, manage sales, and stay organized with our powerful dashboard. 
            Built for resellers who want to scale their business efficiently.
          </motion.p>

          <motion.div variants={itemVariants} className="flex flex-col items-center gap-4 w-full">
            <a
              href="/login"
              className="group inline-flex items-center justify-center bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl text-base sm:text-lg font-semibold transition-all duration-300 hover:scale-105 hover:shadow-xl shadow-lg w-full max-w-xs sm:max-w-sm"
            >
              Get Started Free
              <svg 
                className="ml-2 w-4 h-4 sm:w-5 sm:h-5 transition-transform group-hover:translate-x-1" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
            
            {SHOW_BETA_BADGE && (
              <motion.div
                className="flex items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.4 }}
              >
                <div className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
                  Currently in Beta
                </div>
              </motion.div>
            )}
          </motion.div>
        </motion.div>

        {/* Dashboard Mockups - Mobile Optimized Layout */}
        <motion.div
          className="relative w-full max-w-6xl mt-4 sm:mt-0"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.8 }}
        >
          {/* Mobile-First Layout */}
          <div className="block sm:hidden">
            {/* Mobile: Show phone mockup for better fit and relevance */}
            <motion.div
              className="relative z-20 flex justify-center"
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 1.4, ease: "easeOut", delay: 1.0 }}
            >
              <div className="relative max-w-[280px] mx-auto">
                <Image
                  src="images/footvault phone.png"
                  alt="FootVault Mobile App"
                  width={280}
                  height={560}
                  className="h-auto object-contain filter drop-shadow-[0_25px_50px_rgba(0,0,0,0.25)] rounded-[2.5rem] w-full"
                  priority
                />
                {/* Enhanced glow effect for mobile */}
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/15 to-blue-500/15 rounded-[2.5rem] blur-2xl -z-10 scale-110"></div>
                
                {/* Subtle reflection effect */}
                <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-white/10 rounded-[2.5rem] pointer-events-none"></div>
              </div>
            </motion.div>
          </div>

          {/* Desktop/Tablet Layout with floating phones */}
          <div className="hidden sm:block">
            <div className="relative flex items-center justify-center">
              
              {/* Main Tablet Dashboard - Center Stage */}
              <motion.div
                className="relative z-20"
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 1.4, ease: "easeOut", delay: 1.0 }}
              >
                <div className="relative">
                  <Image
                    src="images/footvault tablet.png"
                    alt="FootVault Desktop Dashboard"
                    width={700}
                    height={525}
                    className="h-auto object-contain filter drop-shadow-[0_25px_50px_rgba(0,0,0,0.15)] rounded-2xl"
                    priority
                  />
                  {/* Enhanced glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-2xl blur-2xl -z-10 scale-110"></div>
                </div>
              </motion.div>

              {/* Mobile Phone - Floating to the right */}
              <motion.div
                className="absolute -right-4 sm:-right-8 lg:-right-16 bottom-4 sm:bottom-8 lg:bottom-12 z-30"
                initial={{ opacity: 0, x: 100, rotate: 12 }}
                animate={{ opacity: 1, x: 0, rotate: 12 }}
                transition={{ duration: 1.4, ease: "easeOut", delay: 1.3 }}
              >
                <div className="relative">
                  <Image
                    src="images/footvault phone.png"
                    alt="FootVault Mobile App"
                    width={240}
                    height={480}
                    className="h-auto object-contain filter drop-shadow-[0_20px_40px_rgba(0,0,0,0.2)] rounded-3xl"
                    priority
                  />
                  {/* Phone glow */}
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-blue-500/10 rounded-[2.5rem] blur-xl -z-10 scale-110"></div>
                </div>
              </motion.div>

              {/* Additional Phone - Floating to the left */}
              <motion.div
                className="absolute -left-4 sm:-left-8 lg:-left-16 top-8 sm:top-16 lg:top-20 z-10"
                initial={{ opacity: 0, x: -100, rotate: -8 }}
                animate={{ opacity: 1, x: 0, rotate: -8 }}
                transition={{ duration: 1.4, ease: "easeOut", delay: 1.5 }}
              >
                <div className="relative opacity-75">
                  <Image
                    src="images/footvault phone.png"
                    alt="FootVault Mobile App"
                    width={200}
                    height={400}
                    className="h-auto object-contain filter drop-shadow-[0_15px_30px_rgba(0,0,0,0.15)] rounded-3xl"
                    priority
                  />
                  {/* Subtle glow for secondary phone */}
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/8 to-blue-500/8 rounded-[2rem] blur-lg -z-10 scale-105"></div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Background Elements - Shared for both layouts */}
          <div className="absolute inset-0 -z-20">
            {/* Enhanced smooth gradient that extends beyond viewport */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[800px] bg-gradient-to-r from-blue-100/60 via-indigo-100/40 to-purple-100/60 dark:from-blue-900/20 dark:via-indigo-900/15 dark:to-purple-900/20 rounded-full blur-3xl opacity-80"></div>
            
            {/* Secondary gradient for depth */}
            <div className="absolute top-1/3 left-1/3 w-[600px] h-[400px] bg-gradient-to-br from-cyan-100/50 to-blue-200/50 dark:from-cyan-900/10 dark:to-blue-800/10 rounded-full blur-2xl"></div>
            
            {/* Refined decorative elements */}
            <div className="absolute top-16 right-1/4 w-2 h-2 bg-blue-400/60 rounded-full animate-pulse"></div>
            <div className="absolute bottom-24 left-1/4 w-3 h-3 bg-indigo-400/50 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
            <div className="absolute top-1/3 left-20 w-1.5 h-1.5 bg-purple-400/60 rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
            <div className="absolute bottom-1/3 right-20 w-2 h-2 bg-cyan-400/50 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
