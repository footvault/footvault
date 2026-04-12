'use client';

import { motion } from 'motion/react';
import Image from 'next/image';
import { Search, LayoutGrid, QrCode, ShoppingBag, TrendingUp } from 'lucide-react';

const steps = [
  {
    step: '01',
    icon: Search,
    title: 'Add sneakers in seconds',
    description:
      'Search any shoe, select the pair, and FootVault auto-fills product data, images, and retail price. No manual entry needed.',
    image: '/feature/Stockx integration.png',
  },
  {
    step: '02',
    icon: LayoutGrid,
    title: 'Stay organized',
    description:
      'Track every size, colorway, and variant in one clean dashboard. Know what you have, where it is, and what\'s left to sell.',
    image: '/feature/inventory management.png',
  },
  {
    step: '03',
    icon: QrCode,
    title: 'Scan with QR',
    description:
      'Generate QR stickers for each pair. Scan to instantly pull up product details, cost, and status — perfect for live selling.',
    image: '/feature/qrscan feature.png',
  },
  {
    step: '04',
    icon: ShoppingBag,
    title: 'Sell and track',
    description:
      'Create orders, assign customers, track payments, and manage your entire sales pipeline without leaving FootVault.',
    image: '/feature/sales system.png',
  },
  {
    step: '05',
    icon: TrendingUp,
    title: 'Know your profit',
    description:
      'Every sale automatically calculates your net profit after cost, shipping, and fees. No more guessing if you made money.',
    image: '/feature/profit distribution.png',
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="w-full px-5 sm:px-8 py-20 sm:py-28 lg:py-32">
      <div className="max-w-5xl mx-auto">
        <motion.div
          className="text-center mb-16 sm:mb-20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-emerald-400 text-sm font-medium tracking-wide uppercase mb-4">
            How it works
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight max-w-3xl mx-auto">
            From adding pairs to counting profit.{' '}
            <span className="text-neutral-500">In minutes, not hours.</span>
          </h2>
        </motion.div>

        <div className="space-y-12 sm:space-y-16 lg:space-y-20">
          {steps.map((step, index) => {
            const isReversed = index % 2 !== 0;
            return (
              <motion.div
                key={step.step}
                className={`flex flex-col ${isReversed ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-8 lg:gap-16`}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                {/* Text */}
                <div className="flex-1 w-full lg:w-auto">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-emerald-400/60 text-sm font-mono font-medium">
                      {step.step}
                    </span>
                    <div className="w-8 h-px bg-white/[0.1]" />
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-5">
                    <step.icon className="w-5 h-5 text-emerald-400" />
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                    {step.title}
                  </h3>
                  <p className="text-neutral-400 leading-relaxed max-w-md">
                    {step.description}
                  </p>
                </div>

                {/* Image */}
                <div className="flex-1 w-full lg:w-auto">
                  <div className="rounded-xl border border-white/[0.06] overflow-hidden bg-[#111]">
                    <Image
                      src={step.image}
                      alt={step.title}
                      width={600}
                      height={400}
                      className="w-full h-auto"
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
