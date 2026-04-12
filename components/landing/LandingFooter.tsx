import Link from 'next/link';
import Image from 'next/image';
import { Instagram } from 'lucide-react';

export default function LandingFooter() {
  return (
    <footer className="w-full border-t border-white/[0.06] bg-[#0a0a0a]">
      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-16">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-10">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <Image
                src="/images/FootVault-logo-white-only.png"
                alt="FootVault"
                width={24}
                height={24}
              />
              <span className="text-white font-semibold">FootVault</span>
            </Link>
            <p className="text-neutral-500 text-sm leading-relaxed mb-5">
              Inventory and sales management for sneaker resellers.
            </p>
            <div className="flex gap-3">
              <a
                href="https://www.facebook.com/profile.php?id=61579303066805"
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-600 hover:text-white transition-colors"
                aria-label="Facebook"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
              <a
                href="https://www.instagram.com/footvault.dev/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-600 hover:text-white transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="https://www.tiktok.com/@footvault.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-600 hover:text-white transition-colors"
                aria-label="TikTok"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Platform */}
          <div>
            <h4 className="text-white text-sm font-semibold mb-4">Platform</h4>
            <ul className="space-y-2.5">
              <li>
                <a href="/features/inventory" className="text-neutral-500 text-sm hover:text-white transition-colors">
                  Inventory
                </a>
              </li>
              <li>
                <a href="/features/sales" className="text-neutral-500 text-sm hover:text-white transition-colors">
                  Sales
                </a>
              </li>
              <li>
                <a href="/features/profit" className="text-neutral-500 text-sm hover:text-white transition-colors">
                  Profit Tracking
                </a>
              </li>
              <li>
                <a href="/features/qr-scanner" className="text-neutral-500 text-sm hover:text-white transition-colors">
                  QR Scanner
                </a>
              </li>
              <li>
                <a href="/features/stockx" className="text-neutral-500 text-sm hover:text-white transition-colors">
                  StockX Integration
                </a>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-white text-sm font-semibold mb-4">Company</h4>
            <ul className="space-y-2.5">
              <li>
                <a href="/#pricing" className="text-neutral-500 text-sm hover:text-white transition-colors">
                  Pricing
                </a>
              </li>
              <li>
                <a href="/contact" className="text-neutral-500 text-sm hover:text-white transition-colors">
                  Contact
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-white text-sm font-semibold mb-4">Legal</h4>
            <ul className="space-y-2.5">
              <li>
                <a href="/terms" className="text-neutral-500 text-sm hover:text-white transition-colors">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="/privacy" className="text-neutral-500 text-sm hover:text-white transition-colors">
                  Privacy Policy
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-neutral-600 text-xs">
            &copy; {new Date().getFullYear()} FootVault. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
