'use client';

import { motion } from 'motion/react';
import { Zap, CreditCard, Footprints } from 'lucide-react';

const objections = [
  {
    icon: Zap,
    title: 'No setup needed',
    description: 'Sign up with Google, and you can start adding shoes immediately. Zero configuration.',
  },
  {
    icon: CreditCard,
    title: 'Start free, upgrade later',
    description: 'The free plan lets you test everything. No credit card required.',
  },
  {
    icon: Footprints,
    title: 'Built for sneaker workflow',
    description: "This isn't adapted from another tool. Every feature was designed around how resellers actually work.",
  },
];

export default function ObjectionSection() {
  return (
    <section className="w-full px-5 sm:px-8 py-20 sm:py-28 lg:py-32">
      <div className="max-w-5xl mx-auto">
        <motion.div
          className="text-center mb-12 sm:mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
            Still not sure?
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
          {objections.map((item, index) => (
            <motion.div
              key={item.title}
              className="text-center px-4 py-6"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className="w-10 h-10 rounded-lg bg-white/[0.05] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
                <item.icon className="w-5 h-5 text-neutral-300" />
              </div>
              <h3 className="text-white font-semibold mb-2">{item.title}</h3>
              <p className="text-neutral-400 text-sm leading-relaxed">
                {item.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
