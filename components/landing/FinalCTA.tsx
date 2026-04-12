'use client';

import { motion } from 'motion/react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function FinalCTA() {
  return (
    <section className="w-full px-5 sm:px-8 py-20 sm:py-28 lg:py-32">
      <div className="max-w-3xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="space-y-6"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight">
            Ready to take your sneaker business{' '}
            <span className="text-emerald-400">seriously?</span>
          </h2>
          <p className="text-neutral-400 text-lg max-w-xl mx-auto">
            Stop guessing. Start tracking. Know exactly what you own, what you sold, and what you made.
          </p>
          <div className="pt-2">
            <Link
              href="/login"
              className="group inline-flex items-center justify-center bg-white text-black font-semibold px-8 py-4 rounded-lg text-base hover:bg-neutral-200 transition-colors"
            >
              Start Free
              <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <p className="text-neutral-600 text-xs mt-4">
              Free forever plan available. No credit card required.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
