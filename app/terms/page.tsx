import Link from 'next/link';
import Image from 'next/image';
import Footer from '@/components/Footer';
import { AuthButton } from "@/components/auth-button";
import { DiscordBanner } from "@/components/discord-banner";

export default function TermsPage() {
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
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-semibold px-3 py-1 rounded-full border border-primary/20 mb-4">
            Legal
          </div>
          <h1 className="text-4xl font-black tracking-tight mb-3">Terms of Service</h1>
          <p className="text-muted-foreground text-sm">Last updated: August 16, 2025</p>
        </div>

        <div className="space-y-8">
          {/* Intro */}
          <section className="rounded-xl border bg-card px-6 py-5">
            <h2 className="text-lg font-semibold mb-2">Welcome to FootVault</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              By accessing and using FootVault's sneaker inventory management platform, you agree to be bound by these Terms of Service and our Privacy Policy. Please read these terms carefully before using our service.
            </p>
          </section>

          {/* Eligibility */}
          <section className="rounded-xl border bg-card px-6 py-5">
            <h2 className="text-lg font-semibold mb-4">Eligibility</h2>
            <ul className="space-y-3">
              {[
                "You must be at least 18 years old or have parental/guardian consent to use FootVault",
                "You must provide accurate and complete information when creating your account",
                "You are responsible for maintaining the security of your account credentials",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          {/* Acceptable Use */}
          <section className="rounded-xl border bg-card px-6 py-5">
            <h2 className="text-lg font-semibold mb-4">Acceptable Use</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4">
                <p className="text-xs font-semibold text-emerald-400 uppercase tracking-widest mb-3">You May</p>
                <ul className="space-y-2 text-sm text-emerald-300">
                  <li>- Use FootVault for legitimate business purposes</li>
                  <li>- Store and manage your inventory data</li>
                  <li>- Share access with your team members</li>
                  <li>- Export your data at any time</li>
                </ul>
              </div>
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4">
                <p className="text-xs font-semibold text-red-400 uppercase tracking-widest mb-3">You May Not</p>
                <ul className="space-y-2 text-sm text-red-300">
                  <li>- Attempt to disrupt or hack our service</li>
                  <li>- Use bots or automated tools without permission</li>
                  <li>- Share your account with unauthorized users</li>
                  <li>- Violate any applicable laws or regulations</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Data Responsibility */}
          <section className="rounded-xl border bg-card px-6 py-5">
            <h2 className="text-lg font-semibold mb-2">Data Responsibility</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You retain full ownership and responsibility for all inventory, sales, and customer data you input into FootVault. We provide the platform and tools, but you are responsible for the accuracy and legality of your data. We recommend regular backups and compliance with your local business regulations.
            </p>
          </section>

          {/* Service Availability */}
          <section className="rounded-xl border bg-card px-6 py-5">
            <h2 className="text-lg font-semibold mb-2">Service Availability</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              While we strive for 99.9% uptime, FootVault is provided "as is" without guarantees of uninterrupted service. We may perform maintenance, updates, or experience occasional downtime. We'll communicate any planned maintenance in advance.
            </p>
          </section>

          {/* Updates */}
          <section className="rounded-xl border bg-card px-6 py-5">
            <h2 className="text-lg font-semibold mb-2">Updates to Terms</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We reserve the right to update these terms at any time. Material changes will be communicated via email or through the platform. Continued use of FootVault after changes constitutes acceptance of the new terms.
            </p>
          </section>

          {/* Contact */}
          <section className="rounded-xl border bg-card px-6 py-5">
            <h2 className="text-lg font-semibold mb-2">Contact Us</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              If you have questions about these Terms of Service, please contact our support team through the platform or visit our{' '}
              <Link href="/contact" className="text-primary underline underline-offset-2 hover:opacity-80 transition-opacity">
                contact page
              </Link>.
            </p>
          </section>

          {/* Footer nav */}
          <div className="flex items-center justify-center gap-4 pt-4 text-sm text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <span>/</span>
            <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
