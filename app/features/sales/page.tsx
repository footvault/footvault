import { ArrowLeft, ShoppingBag, TrendingUp, Calendar, Users, DollarSign, BarChart3, CreditCard } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import CallToAction from '@/components/CallToAction';
import Footer from '@/components/Footer';
import { AuthButton } from "@/components/auth-button";
import { DiscordBanner } from "@/components/discord-banner";
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sneaker Sales Tracking - FootVault Reseller Tools',
  description: 'Track sneaker sales revenue, profits, and team distributions with detailed customer information, payment methods, and comprehensive sneaker reselling analytics including refund management.',
  keywords: 'sneaker sales analytics, sneaker reselling, sneaker revenue tracking, sneaker profit tracking, reseller tools, sneaker business analytics, footwear sales reports',
  openGraph: {
    title: 'Sneaker Sales Tracking - FootVault Reseller Tools',
    description: 'Track sneaker sales revenue, profits, and team distributions with detailed customer information, payment methods, and comprehensive sneaker reselling analytics including refund management.',
    type: 'website',
  },
};

export default function SalesPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Discord Banner */}
      <DiscordBanner />
      
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

      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Back Button */}
        <Link href="/#features">
          <Button variant="ghost" className="mb-8 group">
            <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to Features
          </Button>
        </Link>

        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <Badge variant="secondary" className="mb-6">Sales Analytics</Badge>
          <h1 className="text-5xl font-bold mb-6 tracking-tight">
            Complete Sales Tracking
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Track revenue, profits, and avatar distributions with detailed customer information, payment methods, and comprehensive sales analytics including refund management.
          </p>
        </div>

        {/* Hero Image */}
        <div className="mb-24">
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-2xl p-8 border">
            {/* Main Sales Dashboard Image - 1200x600px */}
            <div className="bg-white dark:bg-gray-900 rounded-xl aspect-[2/1] border shadow-sm overflow-hidden">
              <Image 
                src="/sales pictures/sales banner.png"
                alt="Sales Analytics Dashboard"
                width={1200}
                height={600}
                priority
                unoptimized
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="space-y-24 mb-24">
          
          {/* Feature 1 - Revenue & Profit Analytics */}
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-4">Revenue & Profit Analytics</h2>
              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                Monitor total revenue, net profits, and avatar-based profit distributions. Advanced date filtering helps you analyze performance across any time period.
              </p>
              <div className="flex flex-wrap gap-3">
                <Badge variant="outline">Revenue Tracking</Badge>
                <Badge variant="outline">Profit Analytics</Badge>
                <Badge variant="outline">Date Filtering</Badge>
              </div>
            </div>
            {/* Revenue Analytics Image - 600x400px */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl aspect-[3/2] border overflow-hidden">
              <Image 
                src="/sales pictures/sales img 1.png"
                alt="Revenue & Profit Analytics Interface"
                width={600}
                height={400}
                unoptimized
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          {/* Feature 2 - Customer & Payment Tracking */}
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Customer Management Image - 600x400px */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl aspect-[3/2] border lg:order-first order-last overflow-hidden">
              <Image 
                src="/sales pictures/sales table 2.png"
                alt="Customer & Payment Management"
                width={600}
                height={400}
                unoptimized
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-4">Customer & Payment Details</h2>
              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                Track customer names, phone numbers, and payment methods for every sale. Comprehensive customer database helps you build relationships and analyze buying patterns.
              </p>
              <div className="flex flex-wrap gap-3">
                <Badge variant="outline">Customer Database</Badge>
                <Badge variant="outline">Payment Methods</Badge>
                <Badge variant="outline">Contact Information</Badge>
              </div>
            </div>
          </div>

          {/* Feature 3 - Detailed Sales Records */}
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-4">Detailed Sales Records</h2>
              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                Complete transaction details including shoes sold, fees, discounts, and refund management. Every sale is tracked with full transparency and detailed breakdowns.
              </p>
              <div className="flex flex-wrap gap-3">
                <Badge variant="outline">Transaction Details</Badge>
                <Badge variant="outline">Fee Tracking</Badge>
                <Badge variant="outline">Refund Management</Badge>
              </div>
            </div>
            {/* Sales Details Image - 600x400px */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl aspect-[3/2] border overflow-hidden">
              <Image 
                src="/sales pictures/sales details 3.png"
                alt="Detailed Sales Records Interface"
                width={600}
                height={400}
                unoptimized
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          <div className="text-center p-6">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="font-semibold mb-2">Avatar Profit Distribution</h3>
            <p className="text-sm text-muted-foreground">See profit breakdown by team members</p>
          </div>
          
          <div className="text-center p-6">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="font-semibold mb-2">Advanced Filtering</h3>
            <p className="text-sm text-muted-foreground">Filter by date ranges and custom periods</p>
          </div>
          
          <div className="text-center p-6">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mx-auto mb-4">
              <CreditCard className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="font-semibold mb-2">Refund Processing</h3>
            <p className="text-sm text-muted-foreground">Handle returns and refunds seamlessly</p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link href="/login">
            <Button size="lg" className="px-8 py-3">
              Start Tracking Sales
            </Button>
          </Link>
        </div>
      </div>

      {/* Call to Action Section */}
      <CallToAction 
        heading="Ready to Track Your Sales Performance?"
        description="Monitor your sales, analyze customer behavior, and optimize your sneaker business with comprehensive sales tracking."
        image="/images/sales table.png"
        buttons={{
          primary: {
            text: "Get Started",
            url: "/login"
          }
        }}
      />

      {/* Footer */}
      <Footer />
    </div>
  );
}
