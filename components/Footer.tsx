/* eslint-disable @next/next/no-img-element */
import { Twitter, Instagram, Linkedin } from "lucide-react";

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
            <a href="#" target="_blank"><Twitter className="w-5 h-5 hover:text-primary" /></a>
            <a href="#" target="_blank"><Instagram className="w-5 h-5 hover:text-primary" /></a>
            <a href="#" target="_blank"><Linkedin className="w-5 h-5 hover:text-primary" /></a>
          </div>
        </div>

        {/* Navigation Sections */}
        <div>
          <h4 className="font-semibold mb-3">Platform</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><a href="/inventory" className="hover:text-primary">Inventory</a></li>
            <li><a href="/sales" className="hover:text-primary">Sales</a></li>
            <li><a href="/products" className="hover:text-primary">Products</a></li>
            <li><a href="/variants" className="hover:text-primary">Variants</a></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-3">Company</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><a href="/about" className="hover:text-primary">About</a></li>
            <li><a href="/contact-enterprise" className="hover:text-primary">Enterprise</a></li>
            <li><a href="/subscription" className="hover:text-primary">Pricing</a></li>
            <li><a href="/contact-enterprise" className="hover:text-primary">Contact</a></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-3">Support</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><a href="/settings" className="hover:text-primary">Settings</a></li>
            <li><a href="/contact-enterprise" className="hover:text-primary">Help Center</a></li>
            <li><a href="/privacy" className="hover:text-primary">Privacy Policy</a></li>
          </ul>
        </div>
      </div>

      {/* Bottom row */}
      <div className="mt-12 border-t pt-6 text-sm flex flex-col md:flex-row justify-between items-center gap-4 text-muted-foreground">
        <p>© 2025 footvault.com. All rights reserved.</p>
        <div className="flex gap-4">
          <a href="/terms" className="hover:text-primary underline">Terms</a>
          <a href="/privacy" className="hover:text-primary underline">Privacy</a>

        </div>
      </div>
    </footer>
  );
};

export default Footer;
