'use client';

import { useRef, useCallback } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

export default function FinalCTA() {
  const sectionRef = useRef<HTMLElement>(null);
  const btnRef = useRef<HTMLAnchorElement>(null);

  // Magnetic CTA
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    gsap.to(btn, { x: x * 0.25, y: y * 0.25, duration: 0.3, ease: 'power2.out' });
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (btnRef.current) {
      gsap.to(btnRef.current, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.4)' });
    }
  }, []);

  useGSAP(() => {
    const ctx = gsap.context(() => {
      // Heading word-by-word reveal
      const words = gsap.utils.toArray<HTMLElement>('.cta-word');
      gsap.from(words, {
        scrollTrigger: { trigger: '.cta-heading', start: 'top 80%' },
        opacity: 0,
        y: 40,
        rotateX: -30,
        duration: 0.7,
        stagger: 0.05,
        ease: 'power3.out',
      });

      gsap.from('.cta-sub', {
        scrollTrigger: { trigger: '.cta-heading', start: 'top 80%' },
        opacity: 0,
        y: 20,
        duration: 0.7,
        delay: 0.5,
        ease: 'power3.out',
      });

      gsap.from('.cta-btn-wrap', {
        scrollTrigger: { trigger: '.cta-heading', start: 'top 80%' },
        opacity: 0,
        y: 30,
        scale: 0.9,
        duration: 0.7,
        delay: 0.7,
        ease: 'back.out(1.7)',
      });

      // Ambient glow pulse
      gsap.to('.cta-glow', {
        scale: 1.3,
        opacity: 0.08,
        duration: 3,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
      });
    }, sectionRef);

    return () => ctx.revert();
  }, { scope: sectionRef });

  const headlineWords = "Ready to take your sneaker business".split(' ');

  return (
    <section ref={sectionRef} className="relative w-full px-5 sm:px-8 py-20 sm:py-28 lg:py-32 overflow-hidden">
      {/* Background glow */}
      <div className="cta-glow absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-emerald-500/[0.05] rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-3xl mx-auto text-center relative z-10">
        <div className="space-y-6">
          <h2 className="cta-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight" style={{ perspective: '800px' }}>
            {headlineWords.map((word, i) => (
              <span key={i} className="cta-word inline-block">
                {word}&nbsp;
              </span>
            ))}
            <span className="cta-word inline-block text-emerald-400">seriously?</span>
          </h2>
          <p className="cta-sub text-neutral-400 text-lg max-w-xl mx-auto">
            Stop guessing. Start tracking. Know exactly what you own, what you sold, and what you made.
          </p>
          <div className="cta-btn-wrap pt-2">
            <Link
              ref={btnRef}
              href="/login"
              className="group w-full sm:w-auto inline-flex items-center justify-center bg-white text-black font-semibold px-8 py-4 rounded-lg text-base hover:bg-neutral-200 transition-colors will-change-transform"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              Start Free
              <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <p className="text-neutral-600 text-xs mt-4">
              Free forever plan available. No credit card required.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
