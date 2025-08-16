'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { Check, HelpCircle } from 'lucide-react';
import { easeOut } from 'framer-motion';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip"

const plans = [
  {
    title: 'Free',
    priceMonthly: 0,
    priceYearly: 0,
    subtitle: 'Perfect for casual resellers',
    features: [
      { label: 'Track available shoes' },
      { label: 'Track sold shoes' },
      { label: 'Manage your inventory and sales' },
      { label: 'Up to 100 available variants' },
      {
        label: 'Community support',
        tooltip: 'Access community forums and resources for help.'
      }
    ],
    recommended: false,
  },
  {
    title: 'Individual',
    priceMonthly: 10,
    priceYearly: 90,
    subtitle: 'For serious solo resellers',
    features: [
      { label: 'Everything in Free Tier' },
      { label: 'Up to 500 available variants' },
      {
        label: 'Export via CSV',
        tooltip: 'Easily download your inventory using CSV files.'
      },
      {
        label: 'QR code printing for each pair',
        tooltip: 'Generate QR codes for shoes to simplify physical inventory management.'
      }
    ],
    recommended: false,
  },
  {
    title: 'Team',
    priceMonthly: 14,
    priceYearly: 150,
    subtitle: 'For small reseller teams',
    features: [
      { label: 'All Individual features' },
      { label: 'Up to 1,500 available variants' },
      {
        label: '5 Team member avatars',
        tooltip: 'Able to split profits with team members using avatars.'
      },
      {
        label: 'Priority email support',
        tooltip: 'Faster email support response time.'
      }
    ],
    recommended: true,
  },
  {
    title: 'Store',
    priceMonthly: 20,
    priceYearly: 190,
    subtitle: 'For full-scale sneaker stores',
    features: [
      { label: 'All Team features' },
      { label: 'Up to 5,000 available variants' },
      {
        label: 'Unlimited team avatars',
        tooltip: 'Add as many team members as needed.'
      },
      {
        label: 'Dedicated customer support',
        tooltip: 'Get 1-on-1 help from a support manager.'
      }
    ],
    recommended: false,
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
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              variants={cardVariants}
              whileHover={{ scale: 1.02 }}
              className={`relative flex flex-col justify-between p-6 rounded-lg border transition-all duration-200 ${
                plan.recommended
                  ? 'bg-primary/5 border-primary ring-1 ring-primary'
                  : 'bg-card border-border hover:border-primary/50'
              }`}
            >
              {plan.recommended && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <div className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                    Recommended
                  </div>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-xl font-bold">{plan.title}</h3>
                <p className="text-muted-foreground mt-1 text-sm">{plan.subtitle}</p>
              </div>

              <div className="mb-6">
                <div className="text-3xl font-bold">
                  ${isYearly ? plan.priceYearly : plan.priceMonthly}
                </div>
                <div className="text-sm text-muted-foreground">
                  / {isYearly ? 'year' : 'month'}
                </div>
                {isYearly && plan.priceMonthly > 0 && (
                  <div className="text-xs text-green-600 mt-1">
                    Save ${(plan.priceMonthly * 12) - plan.priceYearly} per year
                  </div>
                )}
              </div>

              <TooltipProvider>
                <ul className="mb-8 space-y-3 text-sm flex-grow">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground flex items-center gap-1">
                        {typeof feature === 'string' ? feature : feature.label}
                        {typeof feature === 'object' && feature.tooltip && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="w-3 h-3 text-muted-foreground hover:text-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">{feature.tooltip}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </TooltipProvider>

              <button
                className={`w-full py-3 text-sm rounded-md font-medium transition-all duration-200 ${
                  plan.recommended
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md'
                    : 'border border-border hover:bg-muted hover:border-primary/50'
                }`}
              >
                Get Started
              </button>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.section>
  );
}
