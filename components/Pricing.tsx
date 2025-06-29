'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { Check } from 'lucide-react';
import { easeOut } from 'framer-motion';

const plans = [
  {
    title: 'Free',
    priceMonthly: 0,
    priceYearly: 0,
    description: 'Basic tools to explore and get started.',
    features: ['100 shoes limit', 'Basic analytics', 'Limited support'],
    recommended: false,
  },
  {
    title: 'Individual',
    priceMonthly: 5,
    priceYearly: 50,
    description: 'Great for solo resellers and hobbyists.',
    features: ['100 shoes limit', 'Advanced filtering', 'Email support'],
    recommended: false,
  },
  {
    title: 'Store',
    priceMonthly: 10,
    priceYearly: 100,
    description: 'Everything you need to manage your shop.',
    features: ['500 shoes limit', 'All features unlocked', 'Priority support'],
    recommended: true,
  },
];

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: easeOut } },
};

export default function Pricing() {
  const [isYearly, setIsYearly] = useState(false);

  return (
    <motion.section
      initial="hidden"
      whileInView="show"
      viewport={{ once: true }}
      variants={containerVariants}
      className="py-12 bg-background"
    >
      <div className="container px-6 lg:px-12">
        <motion.div
          variants={cardVariants}
          className="mb-16 text-center flex flex-col items-center gap-4"
        >
          <h2 className="text-4xl lg:text-5xl font-bold tracking-tight">
            Choose Your Plan
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl">
            Simple pricing plans for all kinds of sneaker sellers.
          </p>

          <div className="mt-6 flex items-center gap-2 bg-muted rounded-md p-1">
            <button
              onClick={() => setIsYearly(false)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                !isYearly ? 'bg-primary text-white dark:text-black' : 'text-muted-foreground'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsYearly(true)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                isYearly ? 'bg-primary text-white dark:text-black' : 'text-muted-foreground'
              }`}
            >
              Yearly
            </button>
          </div>
        </motion.div>

        <motion.div
          variants={containerVariants}
          className="grid grid-cols-1 md:grid-cols-3 border rounded-md overflow-hidden"
        >
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              variants={cardVariants}
              whileHover={{ scale: 1.01 }}
              className={`relative flex flex-col justify-between p-8 border-b md:border-b-0 md:border-r last:border-r-0 transition ${
                plan.recommended
                  ? 'bg-muted/20 border-primary'
                  : 'border-border'
              }`}
            >
              {plan.recommended && (
                <div className="absolute top-4 right-4 bg-primary text-white dark:text-black text-xs font-medium px-2 py-0.5 rounded">
                  Recommended
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-xl font-semibold">{plan.title}</h3>
                <p className="text-muted-foreground mt-1">{plan.description}</p>
              </div>

              <div>
                <div className="text-4xl font-bold">
                  ${isYearly ? plan.priceYearly : plan.priceMonthly}
                </div>
                <div className="text-sm text-muted-foreground">
                  / {isYearly ? 'year' : 'month'}
                </div>
              </div>

              <ul className="mt-6 space-y-2 text-sm">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-muted-foreground">
                    <Check className="w-4 h-4 text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                className={`mt-8 w-full py-2 border text-sm rounded-md font-medium transition-colors ${
                  plan.recommended
                    ? 'bg-primary text-white :text-black hover:bg-primary/90'
                    : 'border-border hover:bg-muted'
                }`}
              >
                {plan.priceMonthly === 0 ? 'Start Free' : 'Subscribe'}
              </button>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.section>
  );
}
