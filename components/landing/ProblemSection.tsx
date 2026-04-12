'use client';

import { motion } from 'motion/react';
import { AlertTriangle, FileSpreadsheet, HelpCircle, TrendingDown } from 'lucide-react';

const painPoints = [
  {
    icon: AlertTriangle,
    title: 'Losing track of pairs',
    description:
      'You bought 30 pairs last week. Where are they? Which sizes? Which ones are sold? No clue.',
  },
  {
    icon: FileSpreadsheet,
    title: 'Messy spreadsheets',
    description:
      "You've tried Google Sheets. Columns break, formulas fail, and it's impossible to share with your team.",
  },
  {
    icon: HelpCircle,
    title: 'Size and variant confusion',
    description:
      'Same shoe, 8 sizes, 3 colorways. Tracking all of that by hand is a nightmare.',
  },
  {
    icon: TrendingDown,
    title: 'Not knowing your real profit',
    description:
      "Shipping, fees, cost price, selling price — after everything, did you actually make money? Most resellers can't answer that.",
  },
];

export default function ProblemSection() {
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
            Sound familiar?
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight max-w-3xl mx-auto">
            Reselling sneakers is profitable.
            <br />
            <span className="text-neutral-500">Managing them shouldn&apos;t be painful.</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
          {painPoints.map((point, index) => (
            <motion.div
              key={point.title}
              className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 sm:p-8 hover:border-white/[0.12] hover:bg-white/[0.04] transition-all duration-300"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center mb-5">
                <point.icon className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {point.title}
              </h3>
              <p className="text-neutral-400 text-sm leading-relaxed">
                {point.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
