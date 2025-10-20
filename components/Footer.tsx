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
                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
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
