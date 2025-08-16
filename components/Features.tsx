'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

interface Feature {
  title: string;
  description: string;
  image: string;
  href: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      duration: 0.5,
    },
  },
};

const itemVariants = {
  hidden: { 
    opacity: 0, 
    y: 30,
    scale: 0.95,
  },
  visible: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 15,
      duration: 0.6,
    },
  },
};

const hoverVariants = {
  rest: {
    scale: 1,
    y: 0,
    boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
  },
  hover: {
    scale: 1.02,
    y: -4,
    boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
    transition: {
      type: "spring" as const,
      stiffness: 400,
      damping: 30,
    },
  },
};

const arrowVariants = {
  rest: {
    x: 0,
    opacity: 0.6,
  },
  hover: {
    x: 4,
    opacity: 1,
    transition: {
      type: "spring" as const,
      stiffness: 400,
      damping: 25,
    },
  },
};

const imageVariants = {
  rest: {
    scale: 1,
  },
  hover: {
    scale: 1.05,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 30,
    },
  },
};

const features: Feature[] = [
  {
    title: 'Inventory Management',
    description:
      'Track your sneakers with size variants, serial numbers, and real-time stock updates. Never lose track of your collection.',
    image: '/feature/inventory management.png',
    href: '/features/inventory',
  },
  {
    title: 'StockX Integration',
    description:
      'Automatically fetch product data, pricing, and images from StockX for quick setup.',
    image: '/feature/Stockx integration.png',
    href: '/features/stockx',
  },
  {
    title: 'QR Scanner & Sticker Generation',
    description:
      'Generate QR stickers for inventory and scan products with your phone camera.',
    image: '/feature/qrscan feature.png',
    href: '/features/qr-scanner',
  },
  {
    title: 'Sales Tracking',
    description:
      'Monitor all sales with customer info, payment tracking, and detailed analytics.',
    image: '/feature/sales system.png',
    href: '/features/sales',
  },
  {
    title: 'Checkout System',
    description:
      'Streamlined checkout process with payment integration and order management.',
    image: '/feature/checkout system.png',
    href: '/features/checkout',
  },
  {
    title: 'Profit Distribution',
    description:
      'Calculate and distribute profits with detailed cost analysis and fee tracking.',
    image: '/feature/profit distribution.png',
    href: '/features/profit',
  },
];

export default function Features() {
  return (
    <section className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Everything you need to manage your sneaker business
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Powerful features designed specifically for sneaker retailers and collectors
          </p>
        </motion.div>

        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 max-w-7xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {features.map((feature, index) => {
            // Define width classes for alternating layout
            let colSpan = "";
            let aspectRatio = "aspect-video"; // default
            if (feature.title === 'Inventory Management') {
              colSpan = "lg:col-span-2";
              aspectRatio = "aspect-[16/9]";
            }
            else if (feature.title === 'StockX Integration') {
              colSpan = "lg:col-span-1";
              aspectRatio = "aspect-square";
            }
            else if (feature.title === 'QR Scanner & Sticker Generation') {
              colSpan = "lg:col-span-1";
              aspectRatio = "aspect-square";
            }
            else if (feature.title === 'Sales Tracking') {
              colSpan = "lg:col-span-2";
              aspectRatio = "aspect-[16/9]";
            }
            else if (feature.title === 'Checkout System') {
              colSpan = "lg:col-span-2";
              aspectRatio = "aspect-[16/9]";
            }
            else if (feature.title === 'Profit Distribution') {
              colSpan = "lg:col-span-1";
              aspectRatio = "aspect-square";
            }
            
            return (
              <motion.div
                key={feature.title}
                variants={itemVariants}
                whileHover="hover"
                initial="rest"
                animate="rest"
                className={`${colSpan}`}
              >
              <Link href={feature.href} className="block h-full">
                <motion.div
                  variants={hoverVariants}
                  className="h-full"
                >
                  <Card className="overflow-hidden h-full group cursor-pointer border border-border bg-card hover:shadow-lg transition-shadow duration-200">
                    <div className={`${aspectRatio} overflow-hidden relative`}>
                      <motion.img
                        src={feature.image}
                        alt={feature.title}
                        className="w-full h-full object-cover"
                        variants={imageVariants}
                      />
                    </div>
                    
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors duration-200">
                          {feature.title}
                        </h3>
                        <motion.div
                          variants={arrowVariants}
                          className="text-muted-foreground group-hover:text-primary transition-colors duration-200"
                        >
                          <ArrowRight className="h-5 w-5" />
                        </motion.div>
                      </div>
                      
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        {feature.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              </Link>
            </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
