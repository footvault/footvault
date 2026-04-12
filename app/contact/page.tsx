'use client';

import Link from 'next/link';
import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import LandingNavbar from '@/components/landing/LandingNavbar';
import LandingFooter from '@/components/landing/LandingFooter';
import { Mail, Clock, MessageCircle, ChevronDown, Send, ExternalLink } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

export default function ContactPage() {
  const pageRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const ctx = gsap.context(() => {
      // Hero entrance
      gsap.from('.contact-label', { opacity: 0, y: 20, duration: 0.6, delay: 0.2, ease: 'power3.out' });
      gsap.from('.contact-heading', { opacity: 0, y: 30, duration: 0.8, delay: 0.35, ease: 'power3.out' });
      gsap.from('.contact-subtitle', { opacity: 0, y: 20, duration: 0.7, delay: 0.5, ease: 'power3.out' });

      // Contact card rise
      gsap.from('.contact-card', {
        scrollTrigger: { trigger: '.contact-card', start: 'top 85%' },
        opacity: 0, y: 50, scale: 0.96, duration: 0.8, ease: 'power3.out',
      });

      // Info cards stagger
      gsap.from('.info-card', {
        scrollTrigger: { trigger: '.info-cards', start: 'top 85%' },
        opacity: 0, y: 40, scale: 0.95, duration: 0.7, stagger: 0.1, ease: 'power3.out',
      });

      // FAQ heading
      gsap.from('.faq-heading', {
        scrollTrigger: { trigger: '.faq-heading', start: 'top 85%' },
        opacity: 0, y: 30, duration: 0.7, ease: 'power3.out',
      });

      // FAQ items stagger
      gsap.from('.faq-item', {
        scrollTrigger: { trigger: '.faq-list', start: 'top 85%' },
        opacity: 0, y: 25, duration: 0.6, stagger: 0.08, ease: 'power3.out',
      });

      // Info card hover
      const infoCards = gsap.utils.toArray<HTMLElement>('.info-card');
      infoCards.forEach((card) => {
        card.addEventListener('mouseenter', () => {
          gsap.to(card, { y: -4, duration: 0.3, ease: 'power2.out' });
          gsap.to(card.querySelector('.info-icon'), { scale: 1.15, rotation: -5, duration: 0.3, ease: 'back.out(2)' });
        });
        card.addEventListener('mouseleave', () => {
          gsap.to(card, { y: 0, duration: 0.4, ease: 'power2.out' });
          gsap.to(card.querySelector('.info-icon'), { scale: 1, rotation: 0, duration: 0.3, ease: 'power2.out' });
        });
      });
    }, pageRef);

    return () => ctx.revert();
  }, { scope: pageRef });

  return (
    <div ref={pageRef} className="min-h-screen bg-[#0a0a0a] text-white relative">
      {/* Subtle background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:80px_80px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,black_20%,transparent_70%)]" />
        <div className="absolute -top-[40%] left-1/2 -translate-x-1/2 w-[1000px] h-[700px] rounded-full bg-emerald-500/[0.03] blur-[150px]" />
      </div>

      <LandingNavbar />

      <main className="relative z-10 pt-28 pb-20">
        {/* Hero */}
        <div className="max-w-4xl mx-auto px-5 sm:px-8 text-center mb-16">
          <p className="contact-label text-emerald-400 text-sm font-medium tracking-wide uppercase mb-4">
            Contact
          </p>
          <h1 className="contact-heading text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 tracking-tight">
            Get in touch
          </h1>
          <p className="contact-subtitle text-lg text-neutral-400 max-w-2xl mx-auto">
            Have questions about FootVault? We&apos;d love to hear from you. Reach out and we&apos;ll get back to you within 24 hours.
          </p>
        </div>

        {/* Contact Card */}
        <div className="max-w-2xl mx-auto px-5 sm:px-8 mb-20">
          <div className="contact-card rounded-2xl border border-white/[0.06] bg-white/[0.02] p-10 sm:p-12 text-center backdrop-blur-sm">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
              <Send className="w-7 h-7 text-emerald-400" />
            </div>

            <h2 className="text-2xl font-bold text-white mb-3">Send us a message</h2>
            <p className="text-neutral-400 mb-8">We typically respond within 24 hours</p>

            <a
              href="https://tally.so/r/31el0l"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-xl transition-all duration-200"
            >
              <ExternalLink className="w-4 h-4" />
              Open Contact Form
            </a>
          </div>
        </div>

        {/* Contact Info */}
        <div className="max-w-4xl mx-auto px-5 sm:px-8 mb-20">
          <div className="info-cards grid md:grid-cols-3 gap-5">
            <div className="info-card rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 text-center will-change-transform">
              <div className="info-icon w-11 h-11 rounded-lg bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="text-base font-semibold text-white mb-1">Email</h3>
              <p className="text-neutral-400 text-sm">footvault.dev@gmail.com</p>
            </div>

            <div className="info-card rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 text-center will-change-transform">
              <div className="info-icon w-11 h-11 rounded-lg bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                <Clock className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="text-base font-semibold text-white mb-1">Response Time</h3>
              <p className="text-neutral-400 text-sm">Within 24 hours</p>
            </div>

            <div className="info-card rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 text-center will-change-transform">
              <div className="info-icon w-11 h-11 rounded-lg bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="text-base font-semibold text-white mb-1">Support</h3>
              <p className="text-neutral-400 text-sm">Monday – Friday</p>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto px-5 sm:px-8">
          <div className="faq-heading text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              Frequently Asked Questions
            </h2>
            <p className="text-neutral-400">Quick answers to common questions</p>
          </div>

          <div className="faq-list space-y-3">
            {[
              {
                q: 'How do I get started with FootVault?',
                a: 'Simply sign up for an account and you can start managing your sneaker inventory immediately. Our free plan includes basic features to get you started.',
              },
              {
                q: 'Can I export my inventory data?',
                a: 'Yes! FootVault supports CSV exports so you can download your inventory, sales, and profit data anytime.',
              },
              {
                q: 'Is my data secure?',
                a: 'Absolutely. We use enterprise-grade security measures including encryption, secure hosting, and regular backups to protect your data.',
              },
              {
                q: 'Can I cancel my subscription anytime?',
                a: 'Yes, you can cancel your subscription at any time. You\'ll continue to have access until the end of your billing period.',
              },
            ].map((faq) => (
              <details
                key={faq.q}
                className="faq-item group rounded-xl border border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1] transition-colors"
              >
                <summary className="flex items-center justify-between cursor-pointer p-5 sm:p-6 text-white font-medium text-sm sm:text-base list-none [&::-webkit-details-marker]:hidden">
                  {faq.q}
                  <ChevronDown className="w-4 h-4 text-neutral-500 group-open:rotate-180 transition-transform duration-200 flex-shrink-0 ml-4" />
                </summary>
                <div className="px-5 sm:px-6 pb-5 sm:pb-6 -mt-1">
                  <p className="text-neutral-400 text-sm leading-relaxed">{faq.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
