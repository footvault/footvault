'use client';

import { motion } from "motion/react";
import { easeOut } from "motion";
import Image from "next/image";


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
    <section className="w-full  px-6 overflow-hidden">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12">

        {/* Left Content */}
        <motion.div
          className="flex-1 flex flex-col gap-6 text-center md:text-left"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
         

          <motion.h1
            variants={itemVariants}
            className="text-4xl lg:text-5xl font-extrabold leading-tight"
          >
            The #1 Inventory System Built for Sneaker Resellers
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="text-lg text-muted-foreground max-w-md mx-auto md:mx-0"
          >
            Track your kicks, manage sales, and stay organized — all in one powerful dashboard.
          </motion.p>

          <motion.div variants={itemVariants}>
            <a
              href="/login"
              className="inline-block bg-black text-white dark:bg-white dark:text-black px-6 py-3 rounded-xl text-sm font-semibold transition hover:scale-105 hover:shadow-lg"
            >
              Get Started
            </a>
          </motion.div>
        </motion.div>

        {/* Right Image */}
        <motion.div
          className="flex-1"
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.4 }}
        >
          <Image
            src="https://illustrations.popsy.co/gray/code-thinking.svg"
            alt="Hero Illustration"
            width={500}
            height={500}
            className="w-full h-auto object-contain"
          />
        </motion.div>
      </div>
    </section>
  );
}
