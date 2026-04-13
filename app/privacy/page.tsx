import Link from 'next/link';
import Image from 'next/image';
import Footer from '@/components/Footer';
import { AuthButton } from "@/components/auth-button";
import { DiscordBanner } from "@/components/discord-banner";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <DiscordBanner />

      {/* Navbar */}
      <nav className="w-full border-b border-border h-16 bg-background/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-base">
            <Image src="/images/FootVault-logo-white-only.png" alt="FootVault" width={32} height={32} />
            <span>FootVault</span>
          </Link>
          <div className="hidden md:flex gap-6 text-sm font-medium text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
            <a href="/#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="/#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
          </div>
          <AuthButton />
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto py-16 px-6">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-semibold px-3 py-1 rounded-full border border-primary/20 mb-4">
            Legal
          </div>
          <h1 className="text-4xl font-black tracking-tight mb-3">Privacy Policy</h1>
          <p className="text-muted-foreground text-sm">Last updated: August 16, 2025</p>
        </div>

        <div className="space-y-8">
          <section className="rounded-xl border bg-card px-6 py-5">
            <h2 className="text-lg font-semibold mb-2">Your Privacy Matters</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              At FootVault, we are committed to protecting your privacy and being transparent about how we collect, use, and protect your data. This policy explains our practices and your rights regarding your personal information.
            </p>
          </section>

          <section className="rounded-xl border bg-card px-6 py-5">
            <h2 className="text-lg font-semibold mb-4">Information We Collect</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-4">
                <p className="text-xs font-semibold text-blue-400 uppercase tracking-widest mb-3">Account Information</p>
                <ul className="space-y-1.5 text-sm text-blue-300">
                  <li>- Email address and name</li>
                  <li>- Account preferences and settings</li>
                  <li>- Subscription and billing information</li>
                  <li>- Profile and avatar data</li>
                </ul>
              </div>
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4">
                <p className="text-xs font-semibold text-emerald-400 uppercase tracking-widest mb-3">Business Data</p>
                <ul className="space-y-1.5 text-sm text-emerald-300">
                  <li>- Inventory and product information</li>
                  <li>- Sales and transaction records</li>
                  <li>- Customer data you input</li>
                  <li>- Usage analytics and patterns</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="rounded-xl border bg-card px-6 py-5">
            <h2 className="text-lg font-semibold mb-4">How We Use Your Data</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="rounded-lg bg-muted/50 border border-border p-4 text-center">
                <p className="text-sm font-semibold mb-1">Service Provision</p>
                <p className="text-xs text-muted-foreground">To provide and maintain FootVault features and functionality</p>
              </div>
              <div className="rounded-lg bg-muted/50 border border-border p-4 text-center">
                <p className="text-sm font-semibold mb-1">Improvement</p>
                <p className="text-xs text-muted-foreground">To analyze usage and improve our platform based on user needs</p>
              </div>
              <div className="rounded-lg bg-muted/50 border border-border p-4 text-center">
                <p className="text-sm font-semibold mb-1">Communication</p>
                <p className="text-xs text-muted-foreground">To send important updates, support responses, and feature announcements</p>
              </div>
            </div>
          </section>

          <section className="rounded-xl border bg-card px-6 py-5">
            <h2 className="text-lg font-semibold mb-4">Data Security</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4">
                <p className="text-xs font-semibold text-emerald-400 uppercase tracking-widest mb-3">Security Measures</p>
                <ul className="space-y-1.5 text-sm text-emerald-300">
                  <li>- End-to-end encryption for sensitive data</li>
                  <li>- Regular security audits and updates</li>
                  <li>- Secure cloud infrastructure (Supabase)</li>
                  <li>- Multi-factor authentication support</li>
                </ul>
              </div>
              <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-4">
                <p className="text-xs font-semibold text-blue-400 uppercase tracking-widest mb-3">Your Control</p>
                <ul className="space-y-1.5 text-sm text-blue-300">
                  <li>- Access and download your data anytime</li>
                  <li>- Delete your account and data completely</li>
                  <li>- Control sharing and team access</li>
                  <li>- Manage communication preferences</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="rounded-xl border bg-card px-6 py-5">
            <h2 className="text-lg font-semibold mb-3">Third-Party Services</h2>
            <p className="text-sm text-muted-foreground mb-4">FootVault integrates with trusted third-party services to provide enhanced functionality:</p>
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-sm font-semibold mb-1">Authentication</p>
                <p className="text-xs text-muted-foreground">Supabase for secure user authentication and session management</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-sm font-semibold mb-1">Analytics</p>
                <p className="text-xs text-muted-foreground">Privacy-focused analytics to improve user experience</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-sm font-semibold mb-1">Product Data</p>
                <p className="text-xs text-muted-foreground">StockX API for product information and market data</p>
              </div>
            </div>
          </section>

          <section className="rounded-xl border bg-card px-6 py-5">
            <h2 className="text-lg font-semibold mb-4">Your Rights</h2>
            <ul className="grid sm:grid-cols-2 gap-3">
              {[
                "Request access to your personal data",
                "Correct inaccurate or incomplete data",
                "Request deletion of your account and data",
                "Export your data in a portable format",
                "Opt out of marketing communications",
                "Contact us about privacy concerns",
              ].map((right) => (
                <li key={right} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  {right}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border bg-card px-6 py-5">
            <h2 className="text-lg font-semibold mb-2">Policy Updates</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We may update this Privacy Policy periodically to reflect changes in our practices or legal requirements. We will notify you of material changes via email or through the platform.
            </p>
          </section>

          <section className="rounded-xl border bg-card px-6 py-5">
            <h2 className="text-lg font-semibold mb-2">Contact Us</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              If you have questions about this Privacy Policy or how we handle your data, please reach out through our{' '}
              <Link href="/contact" className="text-primary underline underline-offset-2 hover:opacity-80 transition-opacity">
                contact page
              </Link>.
            </p>
          </section>

          <div className="flex items-center justify-center gap-4 pt-4 text-sm text-muted-foreground">
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
            <span>/</span>
            <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}