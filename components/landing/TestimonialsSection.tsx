'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { Star } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const testimonials = [
  {
    name: 'Marco D.',
    role: 'Sneaker Reseller, Manila',
    quote:
      "I used to track everything in Google Sheets. Switched to FootVault and I finally know exactly how much I'm making per pair. Game changer.",
    stars: 5,
    initials: 'MD',
    color: 'bg-emerald-600',
  },
  {
    name: 'Jem R.',
    role: 'Full-time Reseller',
    quote:
      "The QR scanning alone saves me 30 minutes a day during live selling. I scan, show the details, and close the deal on the spot.",
    stars: 5,
    initials: 'JR',
    color: 'bg-sky-600',
  },
  {
    name: 'CJ Santos',
    role: 'Sneaker Store Owner',
    quote:
      "We manage 500+ pairs across 3 team members. FootVault keeps everyone on the same page — no more double selling or lost inventory.",
    stars: 5,
    initials: 'CJ',
    color: 'bg-violet-600',
  },
  {
    name: 'Kim L.',
    role: 'Part-time Reseller',
    quote:
      "I started reselling as a side hustle. FootVault made it easy to see which shoes were actually profitable and which were sitting too long.",
    stars: 5,
    initials: 'KL',
    color: 'bg-amber-600',
  },
];

export default function TestimonialsSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    const ctx = gsap.context(() => {
      gsap.from('.testimonials-label', {
        scrollTrigger: { trigger: '.testimonials-label', start: 'top 85%' },
        opacity: 0,
        y: 30,
        duration: 0.7,
        ease: 'power3.out',
      });

      gsap.from('.testimonials-heading', {
        scrollTrigger: { trigger: '.testimonials-heading', start: 'top 85%' },
        opacity: 0,
        y: 40,
        duration: 0.9,
        delay: 0.15,
        ease: 'power3.out',
      });

      // Cards cascade in from alternating sides
      const cards = gsap.utils.toArray<HTMLElement>('.testimonial-card');
      cards.forEach((card, i) => {
        const fromLeft = i % 2 === 0;
        gsap.from(card, {
          scrollTrigger: {
            trigger: card,
            start: 'top 88%',
            toggleActions: 'play none none none',
          },
          opacity: 0,
          x: fromLeft ? -40 : 40,
          y: 30,
          scale: 0.96,
          duration: 0.7,
          delay: i * 0.08,
          ease: 'power3.out',
        });
      });

      // Stars: stagger-fill animation per card
      cards.forEach((card) => {
        const stars = card.querySelectorAll('.testimonial-star');
        gsap.from(stars, {
          scrollTrigger: {
            trigger: card,
            start: 'top 88%',
            toggleActions: 'play none none none',
          },
          opacity: 0,
          scale: 0,
          rotation: -90,
          duration: 0.4,
          stagger: 0.06,
          delay: 0.3,
          ease: 'back.out(2)',
        });
      });

      // Card hover glow
      cards.forEach((card) => {
        const glow = card.querySelector('.card-glow');
        card.addEventListener('mouseenter', () => {
          gsap.to(glow, { opacity: 1, duration: 0.3, ease: 'power2.out' });
          gsap.to(card, { y: -4, duration: 0.3, ease: 'power2.out' });
        });
        card.addEventListener('mouseleave', () => {
          gsap.to(glow, { opacity: 0, duration: 0.4, ease: 'power2.out' });
          gsap.to(card, { y: 0, duration: 0.4, ease: 'power2.out' });
        });
      });
    }, sectionRef);

    return () => ctx.revert();
  }, { scope: sectionRef });

  return (
    <section ref={sectionRef} id="testimonials" className="w-full px-5 sm:px-8 py-20 sm:py-28 lg:py-32">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16 sm:mb-20">
          <p className="testimonials-label text-emerald-400 text-sm font-medium tracking-wide uppercase mb-4">
            Testimonials
          </p>
          <h2 className="testimonials-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight">
            Resellers trust FootVault.
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="testimonial-card relative rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 sm:p-8 overflow-hidden will-change-transform"
            >
              {/* Hover glow */}
              <div className="card-glow absolute inset-0 bg-gradient-to-br from-emerald-500/[0.06] to-transparent opacity-0 pointer-events-none" />

              {/* Stars */}
              <div className="flex gap-1 mb-4 relative z-10">
                {Array.from({ length: t.stars }).map((_, i) => (
                  <Star
                    key={i}
                    className="testimonial-star w-4 h-4 fill-emerald-400 text-emerald-400 will-change-transform"
                  />
                ))}
              </div>
              {/* Quote */}
              <p className="text-neutral-300 text-sm leading-relaxed mb-6 relative z-10">
                &ldquo;{t.quote}&rdquo;
              </p>
              {/* Author */}
              <div className="relative z-10 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full ${t.color} flex items-center justify-center flex-shrink-0`}>
                  <span className="text-white text-xs font-bold">{t.initials}</span>
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{t.name}</p>
                  <p className="text-neutral-500 text-xs">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
