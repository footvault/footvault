'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { Layers, Repeat, Zap } from 'lucide-react';
import Image from 'next/image';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const reasons = [
  {
    icon: Zap,
    title: 'Built for sneaker resellers',
    description:
      "Not a generic inventory app. Every feature is designed around how resellers actually buy, store, and sell sneakers.",
    image: '/images/search product.png',
  },
  {
    icon: Layers,
    title: 'Handles variants properly',
    description:
      'Sizes, colorways, conditions — FootVault tracks every variant without the clutter. One product, all the details.',
    image: '/images/product variants page.png',
  },
  {
    icon: Repeat,
    title: 'Designed for the flipping workflow',
    description:
      'Buy → store → list → sell → profit. FootVault follows your exact workflow instead of forcing a generic process on you.',
    image: '/images/sales table.png',
  },
];

export default function WhyFootVault() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    const ctx = gsap.context(() => {
      gsap.from('.why-label', {
        scrollTrigger: { trigger: '.why-label', start: 'top 85%' },
        opacity: 0,
        y: 30,
        duration: 0.7,
        ease: 'power3.out',
      });

      gsap.from('.why-heading', {
        scrollTrigger: { trigger: '.why-heading', start: 'top 85%' },
        opacity: 0,
        y: 40,
        duration: 0.9,
        delay: 0.15,
        ease: 'power3.out',
      });

      // Cards enter from bottom with stagger + subtle 3D
      const cards = gsap.utils.toArray<HTMLElement>('.why-card');
      gsap.from(cards, {
        scrollTrigger: {
          trigger: '.why-cards',
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
        opacity: 0,
        y: 60,
        scale: 0.92,
        duration: 0.8,
        stagger: 0.12,
        ease: 'power3.out',
      });

      // Card 3D tilt on hover
      cards.forEach((card) => {
        const handleMove = (e: MouseEvent) => {
          const rect = card.getBoundingClientRect();
          const x = (e.clientX - rect.left) / rect.width - 0.5;
          const y = (e.clientY - rect.top) / rect.height - 0.5;
          gsap.to(card, {
            rotateY: x * 8,
            rotateX: -y * 8,
            duration: 0.3,
            ease: 'power2.out',
          });
        };
        const handleLeave = () => {
          gsap.to(card, {
            rotateY: 0,
            rotateX: 0,
            duration: 0.5,
            ease: 'power2.out',
          });
        };
        card.addEventListener('mousemove', handleMove);
        card.addEventListener('mouseleave', handleLeave);
      });
    }, sectionRef);

    return () => ctx.revert();
  }, { scope: sectionRef });

  return (
    <section ref={sectionRef} className="w-full px-5 sm:px-8 py-20 sm:py-28 lg:py-32">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16 sm:mb-20">
          <p className="why-label text-emerald-400 text-sm font-medium tracking-wide uppercase mb-4">
            Why FootVault
          </p>
          <h2 className="why-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight max-w-3xl mx-auto">
            Generic tools weren&apos;t made for this.{' '}
            <span className="text-neutral-500">FootVault was.</span>
          </h2>
        </div>

        <div className="why-cards grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
          {reasons.map((reason) => (
            <div
              key={reason.title}
              className="why-card rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 sm:p-8 hover:border-emerald-500/20 hover:bg-white/[0.04] transition-colors duration-300 will-change-transform"
              style={{ perspective: '800px', transformStyle: 'preserve-3d' }}
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-5">
                <reason.icon className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {reason.title}
              </h3>
              <p className="text-neutral-400 text-sm leading-relaxed mb-5">
                {reason.description}
              </p>
              <div className="rounded-lg overflow-hidden border border-white/[0.06] mt-auto">
                <Image
                  src={reason.image}
                  alt={reason.title}
                  width={400}
                  height={240}
                  className="w-full h-auto opacity-70 hover:opacity-100 transition-opacity duration-300"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
