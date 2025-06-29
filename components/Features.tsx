/* eslint-disable @next/next/no-img-element */
'use client';

import { motion } from 'framer-motion';
import React, { JSX } from 'react';
import { easeOut } from 'framer-motion';

type Feature = {
  title: string;
  description: string;
  image: string;
};

const features: Feature[] = [
  {
    title: 'UI/UX Design',
    description:
      'Creating intuitive user experiences with modern interface design principles and user-centered methodologies.',
    image: 'https://deifkwefumgah.cloudfront.net/shadcnblocks/block/placeholder-1.svg',
  },
  {
    title: 'Responsive Development',
    description:
      'Building websites that look and function perfectly across all devices and screen sizes.',
    image: 'https://deifkwefumgah.cloudfront.net/shadcnblocks/block/placeholder-2.svg',
  },
  {
    title: 'Brand Integration',
    description:
      'Seamlessly incorporating your brand identity into every aspect of your website’s design.',
    image: 'https://deifkwefumgah.cloudfront.net/shadcnblocks/block/placeholder-1.svg',
  },
  {
    title: 'Performance Optimization',
    description:
      'Ensuring fast loading times and smooth performance through optimized code and assets.',
    image: 'https://deifkwefumgah.cloudfront.net/shadcnblocks/block/placeholder-2.svg',
  },
];

// Animation variants
const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: easeOut } },
};

export default function Features(): JSX.Element {
  return (
    <motion.section
      initial="hidden"
      whileInView="show"
      viewport={{ once: true }}
      variants={containerVariants}
      className="py-12"
    >
      <div className="container">
        <motion.div
          variants={cardVariants}
          className="mb-24 flex flex-col items-center gap-6"
        >
          <h1 className="text-center text-3xl font-semibold lg:max-w-3xl lg:text-5xl">
            Blocks built with Shadcn & Tailwind
          </h1>
          <p className="text-center text-lg font-medium text-muted-foreground md:max-w-4xl lg:text-xl">
            Finely crafted components built with React, Tailwind and Shadcn UI.
            Developers can copy and paste these blocks directly into their project.
          </p>
        </motion.div>

        <div className="relative flex justify-center">
          <motion.div
            variants={containerVariants}
            className="border-muted2 relative flex w-full flex-col border md:w-1/2 lg:w-full"
          >
            <div className="relative flex flex-col lg:flex-row">
              <FeatureCard feature={features[0]} large />
              <FeatureCard feature={features[1]} />
            </div>
            <div className="border-muted2 relative flex flex-col border-t border-solid lg:flex-row">
              <FeatureCard feature={features[2]} />
              <FeatureCard feature={features[3]} large />
            </div>
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
}

function FeatureCard({
  feature,
  large = false,
}: {
  feature: Feature;
  large?: boolean;
}) {
  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ scale: 1.02 }}
      className={`group border-muted2 flex flex-col justify-between p-10 transition-transform duration-300 hover:shadow-xl ${
        large ? 'lg:w-3/5' : 'lg:w-2/5'
      } ${large ? '' : 'border-b border-solid'} ${
        !large ? 'lg:border-r lg:border-b-0' : ''
      }`}
    >
      <h2 className="text-xl font-semibold">{feature.title}</h2>
      <p className="text-muted-foreground">{feature.description}</p>
      <div className="overflow-hidden mt-8 rounded-xl">
        <motion.img
          src={feature.image}
          alt={feature.title}
          className={`h-full w-full object-cover transition-transform duration-500 ${
            large ? 'aspect-[1.5] lg:aspect-[2.4]' : 'aspect-[1.45]'
          } group-hover:scale-105`}
        />
      </div>
    </motion.div>
  );
}
