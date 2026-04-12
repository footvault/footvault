'use client';

import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { Check, HelpCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const plans = [
  {
    key: 'free',
    title: 'Starter',
    audience: 'For beginners',
    priceMonthlyUSD: 0,
    priceYearlyUSD: 0,
    features: [
      { label: 'Track available & sold shoes' },
      { label: 'Manage inventory and sales' },
      { label: 'Up to 30 available variants' },
      { label: 'Community support', tooltip: 'Access community forums and resources.' },
    ],
    recommended: false,
    cta: 'Start Free',
  },
  {
    key: 'individual',
    title: 'Reseller',
    audience: 'For active resellers',
    priceMonthlyUSD: 10,
    priceYearlyUSD: 100,
    features: [
      { label: 'Everything in Starter' },
      { label: 'Up to 500 available variants' },
      { label: 'Export via CSV', tooltip: 'Download your inventory as CSV files.' },
      { label: 'QR code printing', tooltip: 'Generate QR stickers for each pair.' },
    ],
    recommended: false,
    cta: 'Get Started',
  },
  {
    key: 'team',
    title: 'Business',
    audience: 'For growing businesses',
    priceMonthlyUSD: 14,
    priceYearlyUSD: 140,
    features: [
      { label: 'Everything in Reseller' },
      { label: 'Up to 1,500 available variants' },
      { label: '5 team member avatars', tooltip: 'Split profits with team members.' },
      { label: 'Priority email support', tooltip: 'Faster response times.' },
    ],
    recommended: true,
    cta: 'Get Started',
  },
  {
    key: 'store',
    title: 'Store',
    audience: 'For full-time sellers',
    priceMonthlyUSD: 20,
    priceYearlyUSD: 200,
    features: [
      { label: 'Everything in Business' },
      { label: 'Up to 5,000 available variants' },
      { label: 'Unlimited team avatars', tooltip: 'Add as many team members as needed.' },
      { label: 'Dedicated support', tooltip: '1-on-1 help from a support manager.' },
    ],
    recommended: false,
    cta: 'Get Started',
  },
];

export default function PricingSection() {
  const [isYearly, setIsYearly] = useState(false);
  const router = useRouter();
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    const ctx = gsap.context(() => {
      gsap.from('.pricing-label', {
        scrollTrigger: { trigger: '.pricing-label', start: 'top 85%' },
        opacity: 0,
        y: 30,
        duration: 0.7,
        ease: 'power3.out',
      });

      gsap.from('.pricing-heading', {
        scrollTrigger: { trigger: '.pricing-heading', start: 'top 85%' },
        opacity: 0,
        y: 40,
        duration: 0.9,
        delay: 0.15,
        ease: 'power3.out',
      });

      gsap.from('.pricing-toggle', {
        scrollTrigger: { trigger: '.pricing-toggle', start: 'top 90%' },
        opacity: 0,
        y: 20,
        duration: 0.6,
        delay: 0.3,
        ease: 'power3.out',
      });
    }, sectionRef);

    return () => ctx.revert();
  }, { scope: sectionRef });

  // Animate pricing cards
  useGSAP(() => {
    const ctx = gsap.context(() => {
      gsap.from('.pricing-card', {
        scrollTrigger: { trigger: '.pricing-card', start: 'top 85%' },
        opacity: 0,
        y: 50,
        scale: 0.95,
        duration: 0.7,
        stagger: 0.1,
        ease: 'power3.out',
      });
    }, sectionRef);
    return () => ctx.revert();
  }, { scope: sectionRef });

  // Card hover effects
  useEffect(() => {
    const cards = document.querySelectorAll('.pricing-card');
    const enters: Array<() => void> = [];
    const leaves: Array<() => void> = [];
    cards.forEach((card, i) => {
      const enter = () => gsap.to(card, { y: -6, duration: 0.3, ease: 'power2.out' });
      const leave = () => gsap.to(card, { y: 0, duration: 0.4, ease: 'power2.out' });
      enters.push(enter);
      leaves.push(leave);
      card.addEventListener('mouseenter', enter);
      card.addEventListener('mouseleave', leave);
    });
    return () => {
      cards.forEach((card, i) => {
        card.removeEventListener('mouseenter', enters[i]);
        card.removeEventListener('mouseleave', leaves[i]);
      });
    };
  }, []);

  const getPrice = (plan: (typeof plans)[number]) => {
    return isYearly ? plan.priceYearlyUSD : plan.priceMonthlyUSD;
  };

  const getSavings = (plan: (typeof plans)[number]) => {
    return plan.priceMonthlyUSD * 12 - plan.priceYearlyUSD;
  };

  return (
    <section ref={sectionRef} id="pricing" className="w-full px-5 sm:px-8 py-20 sm:py-28 lg:py-32">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12 sm:mb-16">
          <p className="pricing-label text-emerald-400 text-sm font-medium tracking-wide uppercase mb-4">
            Pricing
          </p>
          <h2 className="pricing-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight mb-4">
            Pick your plan. Scale when ready.
          </h2>
          <p className="pricing-heading text-neutral-400 max-w-xl mx-auto">
            Start free. Upgrade as your business grows.
          </p>

          {/* Toggle */}
          <div className="pricing-toggle mt-8 inline-flex items-center gap-1 bg-white/[0.05] border border-white/[0.06] rounded-lg p-1">
            <button
              onClick={() => setIsYearly(false)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                !isYearly
                  ? 'bg-white text-black'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsYearly(true)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                isYearly
                  ? 'bg-white text-black'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Yearly
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {plans.map((plan) => (
                <div
                  key={plan.key}
                  className={`pricing-card relative rounded-xl border p-6 flex flex-col transition-colors duration-300 will-change-transform ${
                    plan.recommended
                      ? 'border-emerald-500/40 bg-emerald-500/[0.05] ring-1 ring-emerald-500/20'
                      : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]'
                  }`}
                >
                  {plan.recommended && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-emerald-500 text-black text-xs font-semibold px-3 py-1 rounded-full">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-white">{plan.title}</h3>
                    <p className="text-neutral-500 text-sm">{plan.audience}</p>
                  </div>

                  <div className="mb-6">
                    <div className="flex items-end gap-1">
                      <span className="text-3xl font-bold text-white">
                        ${getPrice(plan).toLocaleString()}
                      </span>
                      <span className="text-neutral-500 text-sm mb-1">
                        / {isYearly ? 'year' : 'month'}
                      </span>
                    </div>
                    {isYearly && getSavings(plan) > 0 && (
                      <p className="text-emerald-400 text-xs mt-1">
                        Save ${getSavings(plan).toLocaleString()}/year
                      </p>
                    )}
                  </div>

                  <TooltipProvider>
                    <ul className="space-y-3 mb-8 flex-grow">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm">
                          <Check className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                          <span className="text-neutral-300 flex items-center gap-1">
                            {feature.label}
                            {feature.tooltip && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <HelpCircle className="w-3 h-3 text-neutral-600 hover:text-neutral-400 cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-xs text-xs">{feature.tooltip}</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </TooltipProvider>

                  <button
                    onClick={() => router.push('/login')}
                    className={`w-full py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                      plan.recommended
                        ? 'bg-emerald-500 text-black hover:bg-emerald-400'
                        : 'border border-white/[0.1] text-white hover:bg-white/[0.05] hover:border-white/[0.2]'
                    }`}
                  >
                    {plan.cta}
                  </button>
                </div>
              ))}
        </div>
      </div>
    </section>
  );
}
