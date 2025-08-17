import Link from 'next/link';
import Image from 'next/image';
import Footer from '@/components/Footer';
import { AuthButton } from "@/components/auth-button";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="w-full border-b border-gray-200 h-16 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          <div className="font-semibold text-gray-900">
            <Link href="/" className="flex items-center gap-2">
              <Image src={"/images/FootVault-logo-white-only.png"} alt="FootVault" width={32} height={32} />
              <span>FootVault</span>
            </Link>
          </div>

          <div className="hidden md:flex gap-8 text-sm font-medium text-gray-600">
            <Link href="/" className="hover:text-gray-900 transition-colors">Home</Link>
            <a href="/#features" className="hover:text-gray-900 transition-colors">Features</a>
            <a href="/#pricing" className="hover:text-gray-900 transition-colors">Pricing</a>
            <Link href="/contact" className="text-gray-900">Contact</Link>
          </div>

          <div>
            <AuthButton />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-20 pb-20">
        {/* Hero Section */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6 tracking-tight">
            Contact Us
          </h1>
          <p className="text-xl text-gray-600 mb-16 max-w-2xl mx-auto">
            Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
          </p>
        </div>

        {/* Contact Card */}
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
          <div className="bg-white border border-gray-200 rounded-2xl p-12 shadow-sm">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">Get in touch</h2>
              <p className="text-gray-600 mb-8">We typically respond within 24 hours</p>
              
              <a 
                href="https://tally.so/r/31el0l" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all duration-200"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Send us a message
              </a>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="bg-gray-50 py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div>
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Email</h3>
                <p className="text-gray-600">support@footvault.com</p>
              </div>

              <div>
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Response Time</h3>
                <p className="text-gray-600">Within 24 hours</p>
              </div>

              <div>
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Support</h3>
                <p className="text-gray-600">Monday - Friday</p>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Frequently Asked Questions
              </h2>
              <p className="text-lg text-gray-600">
                Quick answers to common questions
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-sm transition-shadow">
                <h3 className="font-semibold text-gray-900 mb-3">How do I get started with FootVault?</h3>
                <p className="text-gray-600">Simply sign up for an account and you can start managing your sneaker inventory immediately. Our free plan includes basic features to get you started.</p>
              </div>
              
              <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-sm transition-shadow">
                <h3 className="font-semibold text-gray-900 mb-3">Can I import my existing inventory?</h3>
                <p className="text-gray-600">Yes! FootVault supports CSV imports and manual entry. You can easily migrate your existing inventory data.</p>
              </div>
              
              <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-sm transition-shadow">
                <h3 className="font-semibold text-gray-900 mb-3">Is my data secure?</h3>
                <p className="text-gray-600">Absolutely. We use enterprise-grade security measures including encryption, secure hosting, and regular backups to protect your data.</p>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-sm transition-shadow">
                <h3 className="font-semibold text-gray-900 mb-3">Can I cancel my subscription anytime?</h3>
                <p className="text-gray-600">Yes, you can cancel your subscription at any time. You'll continue to have access until the end of your billing period.</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
