'use client';

import { motion } from 'motion/react';
import { Sneaker, Layers, Repeat, Zap } from 'lucide-react';

// Using custom icon for sneaker since lucide doesn't have one
const reasons = [
  {
    icon: Zap,
    title: 'Built for sneaker resellers',
    description:
      "Not a generic inventory app. Every feature is designed around how resellers actually buy, store, and sell sneakers.",
  },
  {
    icon: Layers,
    title: 'Handles variants properly',
    description:
      'Sizes, colorways, conditions — FootVault tracks every variant without the clutter. One product, all the details.',
  },
  {
    icon: Repeat,
    title: 'Designed for the flipping workflow',
    description:
      'Buy → store → list → sell → profit. FootVault follows your exact workflow instead of forcing a generic process on you.',
  },
];

export default function WhyFootVault() {
  return (
    <section className="w-full px-5 sm:px-8 py-20 sm:py-28 lg:py-32">
      <div className="max-w-5xl mx-auto">
        <motion.div
          className="text-center mb-16 sm:mb-20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-emerald-400 text-sm font-medium tracking-wide uppercase mb-4">
            Why FootVault
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight max-w-3xl mx-auto">
            Generic tools weren&apos;t made for this.{' '}
            <span className="text-neutral-500">FootVault was.</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
          {reasons.map((reason, index) => (
            <motion.div
              key={reason.title}
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 sm:p-8 hover:border-emerald-500/20 hover:bg-white/[0.04] transition-all duration-300"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-5">
                <reason.icon className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {reason.title}
              </h3>
              <p className="text-neutral-400 text-sm leading-relaxed">
                {reason.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
