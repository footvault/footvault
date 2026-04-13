'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { AlertTriangle, FileSpreadsheet, HelpCircle, TrendingDown } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const painPoints = [
  {
    icon: AlertTriangle,
    title: 'Pairs go missing in your workflow',
    description:
      'You buy, list, and sell fast. Then one pair disappears in a sheet and you waste time finding it.',
  },
  {
    icon: FileSpreadsheet,
    title: 'Excel gets messy fast',
    description:
      'Rows break. Formulas fail. One wrong edit and your numbers are off.',
  },
  {
    icon: HelpCircle,
    title: 'Sizes and variants get confusing',
    description:
      'Same SKU, multiple sizes, different statuses. Manual tracking creates mistakes.',
  },
  {
    icon: TrendingDown,
    title: 'Profit is unclear',
    description:
      'Cost, fees, shipping, sale price. If profit is in a spreadsheet formula, it is easy to miss the truth.',
  },
];

export default function ProblemSection() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    const ctx = gsap.context(() => {
      // Heading text reveal with clip-path
      gsap.from('.problem-heading', {
        scrollTrigger: {
          trigger: '.problem-heading',
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
        opacity: 0,
        y: 40,
        duration: 0.9,
        ease: 'power3.out',
      });

      gsap.from('.problem-subtitle', {
        scrollTrigger: {
          trigger: '.problem-heading',
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
        opacity: 0,
        y: 30,
        duration: 0.8,
        delay: 0.2,
        ease: 'power3.out',
      });

      // Cards stagger with scale + rotation
      const cards = gsap.utils.toArray<HTMLElement>('.problem-card');
      cards.forEach((card, i) => {
        gsap.from(card, {
          scrollTrigger: {
            trigger: card,
            start: 'top 88%',
            toggleActions: 'play none none none',
          },
          opacity: 0,
          y: 50,
          scale: 0.95,
          rotateY: i % 2 === 0 ? -5 : 5,
          duration: 0.7,
          delay: i * 0.1,
          ease: 'power3.out',
        });
      });

      // Card icon pulse on hover via GSAP
      cards.forEach((card) => {
        const icon = card.querySelector('.problem-icon');
        if (!icon) return;
        card.addEventListener('mouseenter', () => {
          gsap.to(icon, { scale: 1.2, rotation: -8, duration: 0.3, ease: 'back.out(1.7)' });
        });
        card.addEventListener('mouseleave', () => {
          gsap.to(icon, { scale: 1, rotation: 0, duration: 0.4, ease: 'power2.out' });
        });
      });

      // Subtle horizontal line drawing
      gsap.from('.problem-divider', {
        scrollTrigger: {
          trigger: '.problem-heading',
          start: 'top 80%',
          toggleActions: 'play none none none',
        },
        scaleX: 0,
        duration: 1.2,
        ease: 'power3.inOut',
        delay: 0.4,
      });
    }, sectionRef);

    return () => ctx.revert();
  }, { scope: sectionRef });

  return (
    <section ref={sectionRef} className="w-full px-5 sm:px-8 py-20 sm:py-28 lg:py-32">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16 sm:mb-20">
          <p className="problem-heading text-emerald-400 text-sm font-medium tracking-wide uppercase mb-4">
            The real problem
          </p>
          <h2 className="problem-subtitle text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight max-w-3xl mx-auto">
            Still tracking sneakers in Excel?
            <br />
            <span className="text-neutral-500">That is costing you money and speed.</span>
          </h2>
          <div className="problem-divider w-16 h-px bg-emerald-500/40 mx-auto mt-8 origin-left" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
          {painPoints.map((point) => (
            <div
              key={point.title}
              className="problem-card group rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 sm:p-8 hover:border-white/[0.12] hover:bg-white/[0.04] transition-all duration-300 cursor-default"
              style={{ perspective: '800px' }}
            >
              <div className="problem-icon w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center mb-5 will-change-transform">
                <point.icon className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {point.title}
              </h3>
              <p className="text-neutral-400 text-sm leading-relaxed">
                {point.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
