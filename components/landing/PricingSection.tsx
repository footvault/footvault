'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Check, HelpCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const plans = [
  {
    key: 'free',
    title: 'Starter',
    audience: 'For beginners',
    priceMonthlyUSD: 0,
    priceYearlyUSD: 0,
    priceMonthlyPHP: 0,
    priceYearlyPHP: 0,
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
    priceMonthlyPHP: 499,
    priceYearlyPHP: 4990,
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
    priceMonthlyPHP: 799,
    priceYearlyPHP: 7990,
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
    priceMonthlyPHP: 1199,
    priceYearlyPHP: 11990,
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
  const [isPhilippines, setIsPhilippines] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const detectLocation = async () => {
      try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        if (data.country_code === 'PH') {
          setIsPhilippines(true);
        }
      } catch {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (timezone.includes('Manila')) {
          setIsPhilippines(true);
        }
      } finally {
        setIsLoading(false);
      }
    };
    detectLocation();
  }, []);

  const currencySymbol = isPhilippines ? '₱' : '$';

  const getPrice = (plan: (typeof plans)[number]) => {
    if (isYearly) {
      return isPhilippines ? plan.priceYearlyPHP : plan.priceYearlyUSD;
    }
    return isPhilippines ? plan.priceMonthlyPHP : plan.priceMonthlyUSD;
  };

  const getSavings = (plan: (typeof plans)[number]) => {
    const monthly = isPhilippines ? plan.priceMonthlyPHP : plan.priceMonthlyUSD;
    const yearly = isPhilippines ? plan.priceYearlyPHP : plan.priceYearlyUSD;
    return monthly * 12 - yearly;
  };

  return (
    <section id="pricing" className="w-full px-5 sm:px-8 py-20 sm:py-28 lg:py-32">
      <div className="max-w-5xl mx-auto">
        <motion.div
          className="text-center mb-12 sm:mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-emerald-400 text-sm font-medium tracking-wide uppercase mb-4">
            Pricing
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight mb-4">
            Pick your plan. Scale when ready.
          </h2>
          <p className="text-neutral-400 max-w-xl mx-auto">
            Start free. Upgrade as your business grows.
          </p>

          {/* Toggle */}
          <div className="mt-8 inline-flex items-center gap-1 bg-white/[0.05] border border-white/[0.06] rounded-lg p-1">
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
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 animate-pulse"
                >
                  <div className="h-5 bg-white/[0.06] rounded w-20 mb-2" />
                  <div className="h-4 bg-white/[0.06] rounded w-28 mb-6" />
                  <div className="h-8 bg-white/[0.06] rounded w-24 mb-8" />
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((j) => (
                      <div key={j} className="h-4 bg-white/[0.06] rounded w-full" />
                    ))}
                  </div>
                </div>
              ))
            : plans.map((plan, index) => (
                <motion.div
                  key={plan.key}
                  className={`relative rounded-xl border p-6 flex flex-col transition-all duration-300 ${
                    plan.recommended
                      ? 'border-emerald-500/40 bg-emerald-500/[0.05] ring-1 ring-emerald-500/20'
                      : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]'
                  }`}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.08 }}
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
                        {currencySymbol}
                        {getPrice(plan).toLocaleString()}
                      </span>
                      <span className="text-neutral-500 text-sm mb-1">
                        / {isYearly ? 'year' : 'month'}
                      </span>
                    </div>
                    {isYearly && getSavings(plan) > 0 && (
                      <p className="text-emerald-400 text-xs mt-1">
                        Save {currencySymbol}
                        {getSavings(plan).toLocaleString()}/year
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
                </motion.div>
              ))}
        </div>
      </div>
    </section>
  );
}
