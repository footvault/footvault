'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Testimonials', href: '#testimonials' },
  { label: 'Contact', href: '/contact' },
];

export default function LandingNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="w-full border-b border-white/[0.06] bg-[#0a0a0a]/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/images/FootVault-logo-white-only.png"
            alt="FootVault"
            width={28}
            height={28}
          />
          <span className="text-white font-semibold text-lg tracking-tight">
            FootVault
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm text-neutral-400 hover:text-white transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm text-neutral-400 hover:text-white transition-colors"
          >
            Log in
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium bg-white text-black px-4 py-2 rounded-lg hover:bg-neutral-200 transition-colors"
          >
            Start Free
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden text-neutral-400 hover:text-white"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/[0.06] bg-[#0a0a0a] px-5 py-4 space-y-3">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="block text-sm text-neutral-400 hover:text-white transition-colors py-2"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <div className="pt-3 border-t border-white/[0.06] flex flex-col gap-2">
            <Link
              href="/login"
              className="text-sm text-neutral-400 hover:text-white transition-colors py-2"
            >
              Log in
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium bg-white text-black px-4 py-2.5 rounded-lg text-center hover:bg-neutral-200 transition-colors"
            >
              Start Free
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
