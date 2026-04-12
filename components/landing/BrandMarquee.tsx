'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

const brands = [
  'Nike',
  'Jordan',
  'Adidas',
  'New Balance',
  'Converse',
  'Puma',
  'Vans',
  'Reebok',
  'ASICS',
  'Salomon',
];

export default function BrandMarquee() {
  const marqueeRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const ctx = gsap.context(() => {
      // Fade in
      gsap.from('.marquee-wrap', {
        opacity: 0,
        duration: 0.8,
        delay: 1.5,
        ease: 'power2.out',
      });

      // Infinite scroll
      const track = document.querySelector('.marquee-track');
      if (track) {
        gsap.to(track, {
          xPercent: -50,
          duration: 30,
          ease: 'none',
          repeat: -1,
        });
      }
    }, marqueeRef);

    return () => ctx.revert();
  }, { scope: marqueeRef });

  return (
    <div ref={marqueeRef} className="marquee-wrap relative w-full py-8 sm:py-10 border-t border-b border-white/[0.04] overflow-hidden">
      {/* Fade edges */}
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-10 sm:w-24 z-10 bg-gradient-to-r from-[#0a0a0a] to-transparent" />
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-10 sm:w-24 z-10 bg-gradient-to-l from-[#0a0a0a] to-transparent" />

      <div className="relative">
        <div className="marquee-track flex w-max gap-16 px-8">
          {[...brands, ...brands].map((brand, i) => (
            <span
              key={i}
              className="text-neutral-600 text-sm font-medium uppercase tracking-widest whitespace-nowrap hover:text-neutral-400 transition-colors select-none"
            >
              {brand}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
