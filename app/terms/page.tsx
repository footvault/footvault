import Link from 'next/link';
import Image from 'next/image';
import Footer from '@/components/Footer';
import { AuthButton } from "@/components/auth-button";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 dark:from-gray-950 dark:to-slate-900">
      {/* Navbar */}
      <nav className="w-full border-b border-b-foreground/10 h-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          {/* Left Logo */}
          <div className="font-bold text-base">
            <Link href="/" className="flex items-center gap-2">
              <Image src={"/images/FootVault-logo-white-only.png"} alt="FootVault" width={32} height={32} />
              <p>FootVault</p>
            </Link>
          </div>

          {/* Centered links for medium+ screens */}
          <div className="hidden md:flex gap-6 font-medium">
            <Link href="/">Home</Link>
            <Link href="/#features">Features</Link>
            <Link href="/#pricing">Pricing</Link>
            <Link href="/contact">Contact</Link>
          </div>

          {/* Right-side buttons */}
          <div>
            <AuthButton />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto py-16 px-6">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border p-12">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              Terms of Service
            </h1>
            <p className="text-lg text-muted-foreground">
              Last updated: August 16, 2025
            </p>
          </div>

          <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4">Welcome to FootVault</h2>
              <p className="text-muted-foreground leading-relaxed">
                By accessing and using FootVault's sneaker inventory management platform, you agree to be bound by these Terms of Service and our Privacy Policy. Please read these terms carefully before using our service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Eligibility</h2>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-start gap-3">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                    You must be at least 18 years old or have parental/guardian consent to use FootVault
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                    You must provide accurate and complete information when creating your account
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                    You are responsible for maintaining the security of your account credentials
                  </li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Acceptable Use</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6">
                  <h3 className="font-semibold text-green-800 dark:text-green-300 mb-3">✓ You May</h3>
                  <ul className="space-y-2 text-sm text-green-700 dark:text-green-300">
                    <li>• Use FootVault for legitimate business purposes</li>
                    <li>• Store and manage your inventory data</li>
                    <li>• Share access with your team members</li>
                    <li>• Export your data at any time</li>
                  </ul>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-6">
                  <h3 className="font-semibold text-red-800 dark:text-red-300 mb-3">✗ You May Not</h3>
                  <ul className="space-y-2 text-sm text-red-700 dark:text-red-300">
                    <li>• Attempt to disrupt or hack our service</li>
                    <li>• Use bots or automated tools without permission</li>
                    <li>• Share your account with unauthorized users</li>
                    <li>• Violate any applicable laws or regulations</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Data Responsibility</h2>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
                <p className="text-muted-foreground leading-relaxed">
                  You retain full ownership and responsibility for all inventory, sales, and customer data you input into FootVault. 
                  We provide the platform and tools, but you are responsible for the accuracy and legality of your data. 
                  We recommend regular backups and compliance with your local business regulations.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Service Availability</h2>
              <p className="text-muted-foreground leading-relaxed">
                While we strive for 99.9% uptime, FootVault is provided "as is" without guarantees of uninterrupted service. 
                We may perform maintenance, updates, or experience occasional downtime. We'll communicate any planned maintenance in advance.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Updates to Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to update these terms at any time. Material changes will be communicated via email or through the platform. 
                Continued use of FootVault after changes constitutes acceptance of the new terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                <p className="text-muted-foreground leading-relaxed">
                  If you have questions about these Terms of Service, please contact our support team through the platform 
                  or visit our <Link href="/contact" className="text-blue-600 hover:text-blue-700 underline">contact page</Link>.
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
