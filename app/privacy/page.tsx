import Link from 'next/link';
import Image from 'next/image';
import Footer from '@/components/Footer';
import { AuthButton } from "@/components/auth-button";

export default function PrivacyPage() {
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
            <a href="/#features" className="hover:text-gray-900 transition-colors">Features</a>
            <a href="/#pricing" className="hover:text-gray-900 transition-colors">Pricing</a>
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
              Privacy Policy
            </h1>
            <p className="text-lg text-muted-foreground">
              Last updated: August 16, 2025
            </p>
          </div>

          <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4">Your Privacy Matters</h2>
              <p className="text-muted-foreground leading-relaxed">
                At FootVault, we're committed to protecting your privacy and being transparent about how we collect, use, and protect your data. 
                This policy explains our practices and your rights regarding your personal information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Information We Collect</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
                  <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-3">Account Information</h3>
                  <ul className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
                    <li>• Email address and name</li>
                    <li>• Account preferences and settings</li>
                    <li>• Subscription and billing information</li>
                    <li>• Profile and avatar data</li>
                  </ul>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6">
                  <h3 className="font-semibold text-green-800 dark:text-green-300 mb-3">Business Data</h3>
                  <ul className="space-y-2 text-sm text-green-700 dark:text-green-300">
                    <li>• Inventory and product information</li>
                    <li>• Sales and transaction records</li>
                    <li>• Customer data you input</li>
                    <li>• Usage analytics and patterns</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">How We Use Your Data</h2>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mx-auto mb-3">
                      <span className="text-blue-600 dark:text-blue-400 text-xl">🔧</span>
                    </div>
                    <h3 className="font-semibold mb-2">Service Provision</h3>
                    <p className="text-sm text-muted-foreground">To provide and maintain FootVault's features and functionality</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mx-auto mb-3">
                      <span className="text-green-600 dark:text-green-400 text-xl">📈</span>
                    </div>
                    <h3 className="font-semibold mb-2">Improvement</h3>
                    <p className="text-sm text-muted-foreground">To analyze usage and improve our platform based on user needs</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mx-auto mb-3">
                      <span className="text-purple-600 dark:text-purple-400 text-xl">💬</span>
                    </div>
                    <h3 className="font-semibold mb-2">Communication</h3>
                    <p className="text-sm text-muted-foreground">To send important updates, support responses, and feature announcements</p>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Data Security</h2>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-green-800 dark:text-green-300 mb-3">Security Measures</h3>
                    <ul className="space-y-2 text-sm text-green-700 dark:text-green-300">
                      <li>• End-to-end encryption for sensitive data</li>
                      <li>• Regular security audits and updates</li>
                      <li>• Secure cloud infrastructure (AWS/Supabase)</li>
                      <li>• Multi-factor authentication support</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold text-green-800 dark:text-green-300 mb-3">Your Control</h3>
                    <ul className="space-y-2 text-sm text-green-700 dark:text-green-300">
                      <li>• Access and download your data anytime</li>
                      <li>• Delete your account and data completely</li>
                      <li>• Control sharing and team access</li>
                      <li>• Manage communication preferences</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Third-Party Services</h2>
              <div className="space-y-4">
                <p className="text-muted-foreground leading-relaxed">
                  FootVault integrates with trusted third-party services to provide enhanced functionality:
                </p>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Authentication</h4>
                    <p className="text-sm text-muted-foreground">Supabase for secure user authentication and session management</p>
                  </div>
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Analytics</h4>
                    <p className="text-sm text-muted-foreground">Privacy-focused analytics to improve user experience</p>
                  </div>
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Product Data</h4>
                    <p className="text-sm text-muted-foreground">StockX API for product information and market data</p>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Your Rights</h2>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                      <span className="text-muted-foreground">Request access to your personal data</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                      <span className="text-muted-foreground">Correct inaccurate or incomplete data</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                      <span className="text-muted-foreground">Request deletion of your account and data</span>
                    </li>
                  </ul>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                      <span className="text-muted-foreground">Export your data in a portable format</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                      <span className="text-muted-foreground">Opt out of marketing communications</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                      <span className="text-muted-foreground">Contact us about privacy concerns</span>
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Policy Updates</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update this Privacy Policy periodically to reflect changes in our practices or legal requirements. 
                We'll notify you of material changes via email or through the platform, and the updated policy will include a new "Last updated" date.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                <p className="text-muted-foreground leading-relaxed">
                  If you have questions about this Privacy Policy or how we handle your data, please reach out through our 
                  <Link href="/contact" className="text-blue-600 hover:text-blue-700 underline mx-1">contact page</Link>
                  or email us directly. We're committed to addressing your privacy concerns promptly.
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