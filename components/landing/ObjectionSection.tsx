'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { DollarSign, Gauge, Wallet } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const objections = [
  {
    icon: DollarSign,
    title: 'See your inventory value instantly',
    description: 'Know the total value of your pairs at a glance so you can make better buying decisions.',
  },
  {
    icon: Wallet,
    title: 'Track real profit, not guesses',
    description: 'Every sale shows your true profit after costs and fees. No spreadsheet formulas needed.',
  },
  {
    icon: Gauge,
    title: 'Move faster every day',
    description: 'Add, find, and update pairs quickly so you spend less time on admin and more time closing sales.',
  },
];

export default function ObjectionSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    const ctx = gsap.context(() => {
      gsap.from('.objection-heading', {
        scrollTrigger: { trigger: '.objection-heading', start: 'top 85%' },
        opacity: 0,
        y: 30,
        duration: 0.7,
        ease: 'power3.out',
      });

      const items = gsap.utils.toArray<HTMLElement>('.objection-item');
      items.forEach((item, i) => {
        gsap.from(item, {
          scrollTrigger: { trigger: item, start: 'top 88%' },
          opacity: 0,
          y: 30,
          scale: 0.95,
          duration: 0.6,
          delay: i * 0.12,
          ease: 'power3.out',
        });

        // Icon bounce on scroll-in
        const icon = item.querySelector('.objection-icon');
        if (icon) {
          gsap.from(icon, {
            scrollTrigger: { trigger: item, start: 'top 88%' },
            scale: 0,
            rotation: -180,
            duration: 0.5,
            delay: 0.3 + i * 0.12,
            ease: 'back.out(2)',
          });
        }
      });
    }, sectionRef);

    return () => ctx.revert();
  }, { scope: sectionRef });

  return (
    <section ref={sectionRef} className="w-full px-5 sm:px-8 py-20 sm:py-28 lg:py-32">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12 sm:mb-16">
          <p className="objection-heading text-emerald-400 text-sm font-medium tracking-wide uppercase mb-4">
            Why this matters
          </p>
          <h2 className="objection-heading text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
            Clear numbers. Faster workflow. Better decisions.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
          {objections.map((item) => (
            <div
              key={item.title}
              className="objection-item text-center px-4 py-6"
            >
              <div className="objection-icon w-10 h-10 rounded-lg bg-white/[0.05] border border-white/[0.06] flex items-center justify-center mx-auto mb-4 will-change-transform">
                <item.icon className="w-5 h-5 text-neutral-300" />
              </div>
              <h3 className="text-white font-semibold mb-2">{item.title}</h3>
              <p className="text-neutral-400 text-sm leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
