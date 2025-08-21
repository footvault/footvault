'use client';

import { useEffect, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';
import Image from 'next/image';
import { Users, MessageCircle, Heart, Star, TrendingUp, Zap } from 'lucide-react';

// Beta feedback content
const betaFeatures = [
  {
    icon: <Users className="w-6 h-6 text-blue-500" />,
    title: 'Early Access',
    description: 'Be among the first to experience FootVault and shape its future',
  },
  {
    icon: <MessageCircle className="w-6 h-6 text-green-500" />,
    title: 'Direct Feedback',
    description: 'Your suggestions directly influence new features and improvements',
  },
  {
    icon: <Heart className="w-6 h-6 text-red-500" />,
    title: 'Community Driven',
    description: 'Join a passionate community of sneaker enthusiasts and resellers',
  },
  {
    icon: <Star className="w-6 h-6 text-yellow-500" />,
    title: 'Free Beta Access',
    description: 'Get full access to premium features during the beta period',
  },
  {
    icon: <TrendingUp className="w-6 h-6 text-purple-500" />,
    title: 'Priority Support',
    description: 'Receive priority support and direct access to our development team',
  },
  {
    icon: <Zap className="w-6 h-6 text-orange-500" />,
    title: 'Exclusive Benefits',
    description: 'Beta users get special pricing and exclusive features when we launch',
  },
];

const testimonials = [
  {
    name: 'John Smith',
    role: 'COO',
    quote: 'Lorem ipsum dolor sit, amet Odio, incidunt. Ratione, ullam? Iusto id ut omnis repellat.',
    avatar: '/images/block/avatar-1.webp',
  },
  {
    name: 'Jane Smith',
    role: 'Tech Lead',
    quote: 'Lorem ipsum dolor sit, amet Odio, incidunt. Ratione, ullam? Iusto id ut omnis repellat.',
    avatar: '/images/block/avatar-2.webp',
  },
  {
    name: 'Richard Doe',
    role: 'Designer',
    quote: 'Lorem ipsum dolor sit, amet Odio, incidunt. Ratione, ullam? Iusto id ut omnis repellat.',
    avatar: '/images/block/avatar-3.webp',
  },
];

const duplicated = [...testimonials, ...testimonials];

export default function TestimonialsSection() {
  // Toggle this value to switch between beta mode (true) and testimonials mode (false)
  const [isBetaMode, setIsBetaMode] = useState(true);
  const topControls = useAnimation();
  const bottomControls = useAnimation();

  useEffect(() => {
    if (isBetaMode) return; // Don't run animations in beta mode

    const loop = async (controls: typeof topControls, direction: 'left' | 'right') => {
      while (true) {
        await controls.start({
          x: direction === 'left' ? '-50%' : '0%',
          transition: { duration: 25, ease: 'linear' },
        });
        controls.set({ x: direction === 'left' ? '0%' : '-50%' });
      }
    };

    loop(topControls, 'left');
    loop(bottomControls, 'right');
  }, [topControls, bottomControls, isBetaMode]);

  if (isBetaMode) {
    return (
      <section className="py-20 bg-gradient-to-br from-background to-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
              Beta Version
            </div>
            <h2 className="text-3xl font-bold mb-4 lg:text-5xl">
              Help Us Build the Future of Sneaker Management
            </h2>
            <p className="text-muted-foreground mb-8 text-lg max-w-3xl mx-auto">
              FootVault is in beta! Join our community of early adopters and help shape the ultimate 
              sneaker inventory management platform. Your feedback drives our development.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="/login">
                <button className="bg-primary text-primary-foreground px-8 py-3 rounded-lg hover:bg-primary/90 transition-all duration-200 font-medium">
                  Join Beta - Free Access
                </button>
              </a>
              <a href="/contact">
                <button className="border border-border text-foreground px-8 py-3 rounded-lg hover:bg-muted transition-all duration-200 font-medium">
                  Send Feedback
                </button>
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {betaFeatures.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow duration-200"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 p-2 bg-muted rounded-lg">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground text-sm">{feature.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

        </div>
      </section>
    );
  }

  // Original testimonials mode
  return (
    <section className="py-20 bg-background space-y-10">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-2 lg:text-5xl">Meet our happy clients</h2>
        <p className="text-muted-foreground mb-6">All of our 1000+ clients are happy</p>
        <a href="/login">
          <button className="bg-primary text-white px-6 py-2 rounded-md hover:bg-primary/90 transition">
            Get started for free
          </button>
        </a>
      </div>

      {/* Top Row */}
      <div className="overflow-hidden">
        <motion.div
          className="flex gap-6 w-max px-4"
          animate={topControls}
          initial={{ x: '0%' }}
        >
          {duplicated.map((t, i) => (
            <Card key={`top-${i}`} {...t} />
          ))}
        </motion.div>
      </div>

      {/* Bottom Row (reverse direction) */}
      <div className="overflow-hidden">
        <motion.div
          className="flex gap-6 w-max px-4"
          animate={bottomControls}
          initial={{ x: '-50%' }}
        >
          {duplicated.map((t, i) => (
            <Card key={`bottom-${i}`} {...t} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

type CardProps = {
  name: string;
  role: string;
  quote: string;
  avatar: string;
};

function Card({ name, role, quote, avatar }: CardProps) {
  return (
    <div className="flex-shrink-0 w-80 bg-card text-card-foreground border shadow-sm rounded-xl p-6 select-none">
      <div className="flex items-center gap-4 mb-4">
        <span className="relative flex shrink-0 overflow-hidden w-9 h-9 rounded-full ring-1 ring-input">
          <Image src={avatar} alt={name} width={36} height={36} />
        </span>
        <div className="text-left text-sm">
          <p className="font-medium">{name}</p>
          <p className="text-muted-foreground">{role}</p>
        </div>
      </div>
      <q className="text-sm text-muted-foreground italic block">{quote}</q>
    </div>
  );
}
