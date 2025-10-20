/* eslint-disable @next/next/no-img-element */
import { Instagram } from "lucide-react";

const Footer = () => {
  return (
    <footer className="w-full px-6 py-16 bg-background border-t">
      <div className="max-w-6xl mx-auto grid grid-cols-1 gap-10 md:grid-cols-4">
        {/* Logo & tagline */}
        <div className="space-y-4">
          <a href="/" className="flex items-center gap-2">
            <img
              src="/images/FootVault-logo-white-only.png"
              alt="FootVault"
              className="h-10 w-auto"
            />
            <span className="text-xl font-semibold">FootVault</span>
          </a>
          <p className="text-muted-foreground">Your ultimate sneaker inventory management solution.</p>
          <div className="flex gap-4 mt-4">
            <a href="https://www.facebook.com/profile.php?id=61579303066805" target="_blank" rel="noopener noreferrer">
              <svg className="w-5 h-5 hover:text-primary" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </a>
            <a href="https://www.instagram.com/footvault.dev/" target="_blank" rel="noopener noreferrer">
              <Instagram className="w-5 h-5 hover:text-primary" />
            </a>
            <a href="https://www.tiktok.com/@footvault.dev" target="_blank" rel="noopener noreferrer">
              <svg className="w-5 h-5 hover:text-primary" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19.321 5.562a5.124 5.124 0 0 1-.443-.258A6.228 6.228 0 0 1 16.21 3.2v-.003A6.212 6.212 0 0 1 14.993.535a.54.54 0 0 0-.533-.535H11.35a.54.54 0 0 0-.54.54v11.967a3.46 3.46 0 1 1-2.26-3.247V7.216a5.523 5.523 0 0 0-1.084-.095A5.508 5.508 0 1 0 8.55 18.13a5.39 5.39 0 0 0 1.084-.095v-2.042a3.46 3.46 0 1 1 2.26-3.248V.54A.54.54 0 0 1 12.434 0h3.11a.54.54 0 0 0 .533.535 6.212 6.212 0 0 0 1.217 2.662v.003a6.228 6.228 0 0 0 2.668 2.104.54.54 0 0 0 .533-.535V2.66a.54.54 0 0 1 .533-.535h3.11a.54.54 0 0 1 .54.54v2.897z"/>
              </svg>
            </a>
          </div>
        </div>

        {/* Navigation Sections */}
        <div>
          <h4 className="font-semibold mb-3">Platform</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><a href="/features/inventory" className="hover:text-primary">Inventory</a></li>
            <li><a href="/features/sales" className="hover:text-primary">Sales</a></li>
            <li><a href="/features/profit" className="hover:text-primary">Profit Distribution</a></li>
            <li><a href="/features/qr-codes" className="hover:text-primary">QR Codes</a></li>
            <li><a href="/features/stockx" className="hover:text-primary">StockX Integration</a></li>
            <li><a href="/features/checkout" className="hover:text-primary">Checkout</a></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-3">Company</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><a href="/" className="hover:text-primary">Home</a></li>
            <li><a href="/#pricing" className="hover:text-primary">Pricing</a></li>
            <li><a href="/#testimonials" className="hover:text-primary">Testimonials</a></li>
            <li><a href="/contact" className="hover:text-primary">Contact</a></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-3">Support</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><a href="/terms" className="hover:text-primary">Terms</a></li>
            <li><a href="/privacy" className="hover:text-primary">Privacy Policy</a></li>
          </ul>
        </div>
      </div>

      {/* Bottom row */}
      <div className="mt-12 border-t pt-6 text-sm flex flex-col md:flex-row justify-between items-center gap-4 text-muted-foreground">
        <p>© 2025 footvault.com. All rights reserved.</p>
        <div className="flex gap-4">
          <a href="/terms" className="hover:text-primary underline">Terms</a>
          <a href="/privacy" className="hover:text-primary underline">Privacy Policy</a>

        </div>
      </div>
    </footer>
  );
};

export default Footer;
