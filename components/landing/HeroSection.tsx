'use client';

import { useRef, useEffect, useCallback } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

gsap.registerPlugin(useGSAP);

export default function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const magnetRef = useRef<HTMLAnchorElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  // Magnetic button effect
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    const btn = magnetRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    gsap.to(btn, { x: x * 0.3, y: y * 0.3, duration: 0.3, ease: 'power2.out' });
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (magnetRef.current) {
      gsap.to(magnetRef.current, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.4)' });
    }
  }, []);

  // Ambient glow follow mouse
  useEffect(() => {
    const section = sectionRef.current;
    const glow = glowRef.current;
    if (!section || !glow) return;

    const onMove = (e: MouseEvent) => {
      const rect = section.getBoundingClientRect();
      gsap.to(glow, {
        x: e.clientX - rect.left - 400,
        y: e.clientY - rect.top - 300,
        duration: 1.2,
        ease: 'power2.out',
      });
    };
    section.addEventListener('mousemove', onMove);
    return () => section.removeEventListener('mousemove', onMove);
  }, []);

  useGSAP(() => {
    const ctx = gsap.context(() => {
      // Split headline words for stagger
      if (headlineRef.current) {
        const words = headlineRef.current.querySelectorAll('.hero-word');
        gsap.set(words, { opacity: 0, y: 60, rotateX: -40 });
        gsap.to(words, {
          opacity: 1,
          y: 0,
          rotateX: 0,
          duration: 0.9,
          stagger: 0.08,
          ease: 'power3.out',
          delay: 0.3,
        });
      }

      // Badge entrance
      gsap.from('.hero-badge', {
        opacity: 0,
        y: 20,
        scale: 0.9,
        duration: 0.7,
        ease: 'back.out(1.7)',
        delay: 0.1,
      });

      // Subheadline
      gsap.from('.hero-sub', {
        opacity: 0,
        y: 30,
        duration: 0.8,
        ease: 'power3.out',
        delay: 1.0,
      });

      // CTA buttons
      gsap.from('.hero-cta', {
        opacity: 0,
        y: 20,
        duration: 0.7,
        stagger: 0.15,
        ease: 'power3.out',
        delay: 1.3,
      });

      // Dashboard mockup – 3D perspective rise
      gsap.from('.hero-mockup', {
        opacity: 0,
        y: 100,
        scale: 0.92,
        rotateX: 8,
        duration: 1.4,
        ease: 'power3.out',
        delay: 1.0,
      });

      // Floating phone
      gsap.from('.hero-phone', {
        opacity: 0,
        x: 80,
        y: 40,
        rotation: 16,
        duration: 1.2,
        ease: 'power3.out',
        delay: 1.8,
      });

      // Phone gentle float
      gsap.to('.hero-phone', {
        y: '-=12',
        duration: 3,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
        delay: 3,
      });

      // Glow pulse
      gsap.to('.hero-glow-pulse', {
        scale: 1.15,
        opacity: 0.06,
        duration: 4,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
      });
    }, sectionRef);

    return () => ctx.revert();
  }, { scope: sectionRef });

  // Helper: split text into word spans
  const renderWords = (text: string, className?: string) =>
    text.split(' ').map((word, i) => (
      <span
        key={i}
        className={`hero-word inline-block ${className || ''}`}
        style={{ perspective: '600px' }}
      >
        {word}&nbsp;
      </span>
    ));

  return (
    <section
      ref={sectionRef}
      className="relative w-full px-5 sm:px-8 pt-20 pb-16 sm:pt-28 sm:pb-24 lg:pt-36 lg:pb-32 overflow-hidden"
    >
      {/* Grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />

      {/* Mouse-following ambient glow */}
      <div
        ref={glowRef}
        className="absolute w-[800px] h-[600px] bg-emerald-500/[0.04] rounded-full blur-[120px] pointer-events-none"
        style={{ top: 0, left: 0 }}
      />

      {/* Static pulsing glow */}
      <div className="hero-glow-pulse absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-emerald-500/[0.05] rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-5xl mx-auto relative z-10" style={{ perspective: '1200px' }}>
        <div className="flex flex-col items-center text-center gap-6 sm:gap-8">
          {/* Trust badge */}
          <div className="hero-badge">
            <div className="inline-flex items-center gap-2 border border-white/[0.08] bg-white/[0.03] rounded-full px-3 sm:px-4 py-1.5 text-[10px] sm:text-xs text-neutral-400">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse flex-shrink-0" />
              <span className="hidden sm:inline">Built for sneaker resellers scaling past spreadsheets</span>
              <span className="sm:hidden">Built for sneaker resellers</span>
            </div>
          </div>

          {/* Headline with word-split animation */}
          <h1
            ref={headlineRef}
            className="text-3xl sm:text-5xl lg:text-7xl font-bold leading-[1.1] tracking-tight text-white max-w-4xl"
          >
            {renderWords('Track every pair.')}
            <br className="hidden sm:block" />
            {renderWords('Know your')}
            <span className="hero-word inline-block text-emerald-400" style={{ perspective: '600px' }}>
              real profit.
            </span>
          </h1>

          {/* Subheadline */}
          <p className="hero-sub text-base sm:text-lg lg:text-xl text-neutral-400 max-w-2xl leading-relaxed">
            FootVault helps sneaker resellers move faster and see exactly how much they make.
          </p>
          <p className="hero-sub text-sm sm:text-base text-neutral-500 max-w-2xl leading-relaxed">
            Still using spreadsheets? Stop wasting time and guessing your profits.
          </p>

          {/* CTAs with magnetic button */}
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <Link
              ref={magnetRef}
              href="/login"
              className="hero-cta group w-full sm:w-auto inline-flex items-center justify-center bg-white text-black font-semibold px-7 py-3.5 rounded-lg text-sm hover:bg-neutral-200 transition-colors will-change-transform"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              Start Tracking Free
              <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <a
              href="#features"
              className="hero-cta text-sm text-neutral-400 hover:text-white transition-colors"
            >
              See how it works
            </a>
          </div>
          <p className="hero-cta text-xs text-neutral-600">No credit card required.</p>
        </div>

        {/* Dashboard mockup with 3D perspective */}
        <div className="hero-mockup mt-16 sm:mt-20 lg:mt-24 relative" style={{ transformStyle: 'preserve-3d' }}>
          {/* Glow behind mockup */}
          <div className="absolute -inset-4 bg-gradient-to-b from-emerald-500/[0.08] via-transparent to-transparent rounded-3xl blur-2xl pointer-events-none" />

          {/* Mobile: show only phone mockup */}
          <div className="lg:hidden relative mx-auto w-fit">
            <Image
              src="/revamp-img/hero-phone.png"
              alt="FootVault Mobile"
              width={280}
              height={560}
              className="rounded-2xl drop-shadow-2xl"
              priority
            />
            <div className="absolute inset-0 rounded-2xl ring-1 ring-white/[0.08]" />
          </div>

          {/* Main dashboard */}
          <div className="hidden lg:block relative rounded-xl border border-white/[0.08] overflow-hidden bg-[#111]">
            <Image
              src="/revamp-img/hero-tablet.png"
              alt="FootVault Dashboard"
              width={1200}
              height={750}
              className="w-full h-auto"
            />
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
          </div>

          {/* Floating phone */}
          <div className="hero-phone hidden lg:block absolute -right-8 -bottom-8 z-10">
            <div className="relative">
              <Image
                src="/revamp-img/hero-phone.png"
                alt="FootVault Mobile"
                width={200}
                height={400}
                className="rounded-2xl drop-shadow-2xl"
              />
              <div className="absolute inset-0 rounded-2xl ring-1 ring-white/[0.08]" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
