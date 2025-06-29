'use client';

import { useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';
import Image from 'next/image';

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

export default function InfiniteCarousel() {
  const topControls = useAnimation();
  const bottomControls = useAnimation();

  useEffect(() => {
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
  }, [topControls, bottomControls]);

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
