'use client';

import { motion } from 'motion/react';
import { Star } from 'lucide-react';

const testimonials = [
  {
    name: 'Marco D.',
    role: 'Sneaker Reseller, Manila',
    quote:
      "I used to track everything in Google Sheets. Switched to FootVault and I finally know exactly how much I'm making per pair. Game changer.",
    stars: 5,
  },
  {
    name: 'Jem R.',
    role: 'Full-time Reseller',
    quote:
      "The QR scanning alone saves me 30 minutes a day during live selling. I scan, show the details, and close the deal on the spot.",
    stars: 5,
  },
  {
    name: 'CJ Santos',
    role: 'Sneaker Store Owner',
    quote:
      "We manage 500+ pairs across 3 team members. FootVault keeps everyone on the same page — no more double selling or lost inventory.",
    stars: 5,
  },
  {
    name: 'Kim L.',
    role: 'Part-time Reseller',
    quote:
      "I started reselling as a side hustle. FootVault made it easy to see which shoes were actually profitable and which were sitting too long.",
    stars: 5,
  },
];

export default function TestimonialsSection() {
  return (
    <section id="testimonials" className="w-full px-5 sm:px-8 py-20 sm:py-28 lg:py-32">
      <div className="max-w-5xl mx-auto">
        <motion.div
          className="text-center mb-16 sm:mb-20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-emerald-400 text-sm font-medium tracking-wide uppercase mb-4">
            Testimonials
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight">
            Resellers trust FootVault.
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
          {testimonials.map((t, index) => (
            <motion.div
              key={t.name}
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 sm:p-8"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {Array.from({ length: t.stars }).map((_, i) => (
                  <Star
                    key={i}
                    className="w-4 h-4 fill-emerald-400 text-emerald-400"
                  />
                ))}
              </div>
              {/* Quote */}
              <p className="text-neutral-300 text-sm leading-relaxed mb-6">
                &ldquo;{t.quote}&rdquo;
              </p>
              {/* Author */}
              <div>
                <p className="text-white text-sm font-medium">{t.name}</p>
                <p className="text-neutral-500 text-xs">{t.role}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
