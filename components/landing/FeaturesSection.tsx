'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import Image from 'next/image';
import { Search, LayoutGrid, QrCode, ShoppingBag, TrendingUp } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

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
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    const ctx = gsap.context(() => {
      // Section heading
      gsap.from('.features-label', {
        scrollTrigger: { trigger: '.features-label', start: 'top 85%' },
        opacity: 0,
        y: 30,
        duration: 0.7,
        ease: 'power3.out',
      });
      gsap.from('.features-heading', {
        scrollTrigger: { trigger: '.features-heading', start: 'top 85%' },
        opacity: 0,
        y: 40,
        duration: 0.9,
        delay: 0.15,
        ease: 'power3.out',
      });

      // Vertical progress line that grows as you scroll
      gsap.to('.features-progress-line', {
        scrollTrigger: {
          trigger: '.features-steps',
          start: 'top 70%',
          end: 'bottom 30%',
          scrub: 0.5,
        },
        scaleY: 1,
        ease: 'none',
      });

      // Glow dot rides down the line
      gsap.to('.features-progress-dot', {
        scrollTrigger: {
          trigger: '.features-steps',
          start: 'top 70%',
          end: 'bottom 30%',
          scrub: 0.5,
        },
        top: '100%',
        opacity: 1,
        ease: 'none',
      });

      // Each feature row
      const rows = gsap.utils.toArray<HTMLElement>('.feature-row');
      rows.forEach((row, i) => {
        const text = row.querySelector('.feature-text');
        const img = row.querySelector('.feature-img');
        const isReversed = i % 2 !== 0;

        if (text) {
          gsap.from(text, {
            scrollTrigger: { trigger: row, start: 'top 80%', toggleActions: 'play none none none' },
            opacity: 0,
            x: isReversed ? 60 : -60,
            duration: 0.9,
            ease: 'power3.out',
          });
        }

        if (img) {
          gsap.from(img, {
            scrollTrigger: { trigger: row, start: 'top 80%', toggleActions: 'play none none none' },
            opacity: 0,
            x: isReversed ? -60 : 60,
            scale: 0.95,
            duration: 0.9,
            delay: 0.15,
            ease: 'power3.out',
          });
        }

        // Step number counter pop
        const stepNum = row.querySelector('.step-number');
        if (stepNum) {
          gsap.from(stepNum, {
            scrollTrigger: { trigger: row, start: 'top 80%', toggleActions: 'play none none none' },
            opacity: 0,
            scale: 0,
            duration: 0.5,
            delay: 0.3,
            ease: 'back.out(2)',
          });
        }
      });

      // Image hover tilt effect
      const images = gsap.utils.toArray<HTMLElement>('.feature-img-wrap');
      images.forEach((img) => {
        img.addEventListener('mouseenter', () => {
          gsap.to(img, { scale: 1.02, duration: 0.4, ease: 'power2.out' });
        });
        img.addEventListener('mouseleave', () => {
          gsap.to(img, { scale: 1, duration: 0.5, ease: 'power2.out' });
        });
      });
    }, sectionRef);

    return () => ctx.revert();
  }, { scope: sectionRef });

  return (
    <section ref={sectionRef} id="features" className="w-full px-5 sm:px-8 py-20 sm:py-28 lg:py-32">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16 sm:mb-20">
          <p className="features-label text-emerald-400 text-sm font-medium tracking-wide uppercase mb-4">
            How it works
          </p>
          <h2 className="features-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight max-w-3xl mx-auto">
            From adding pairs to counting profit.{' '}
            <span className="text-neutral-500">In minutes, not hours.</span>
          </h2>
        </div>

        <div className="features-steps relative space-y-16 sm:space-y-20 lg:space-y-28">
          {/* Vertical progress line */}
          <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2">
            <div className="w-full h-full bg-white/[0.04]" />
            <div
              className="features-progress-line absolute top-0 left-0 w-full bg-emerald-500/50 origin-top"
              style={{ scaleY: 0, width: '2px', height: '100%', marginLeft: '-0.5px' }}
            />
            {/* Glow dot that rides the line */}
            <div
              className="features-progress-dot absolute left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_12px_4px_rgba(52,211,153,0.5)] opacity-0"
              style={{ top: 0 }}
            />
          </div>

          {steps.map((step, index) => {
            const isReversed = index % 2 !== 0;
            return (
              <div
                key={step.step}
                className={`feature-row relative flex flex-col ${isReversed ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-8 lg:gap-16`}
              >
                {/* Step indicator dot on the line */}
                <div className="step-number hidden lg:flex absolute left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-[#0a0a0a] border-2 border-emerald-500/40 items-center justify-center z-10">
                  <span className="text-emerald-400 text-xs font-mono font-bold">{step.step}</span>
                </div>

                {/* Text */}
                <div className="feature-text flex-1 w-full lg:w-auto">
                  <div className="flex items-center gap-3 mb-4 lg:hidden">
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
                <div className="feature-img flex-1 w-full lg:w-auto">
                  <div className="feature-img-wrap rounded-xl border border-white/[0.06] overflow-hidden bg-[#111] will-change-transform">
                    <Image
                      src={step.image}
                      alt={step.title}
                      width={600}
                      height={400}
                      className="w-full h-auto"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
