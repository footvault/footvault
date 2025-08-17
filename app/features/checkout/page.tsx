import { ArrowLeft, ShoppingCart, Calculator, Users, CreditCard, Receipt, CheckCircle, Percent, DollarSign } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import CallToAction from '@/components/CallToAction';
import Footer from '@/components/Footer';
import { AuthButton } from "@/components/auth-button";
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sneaker Checkout System - FootVault Reseller Tools',
  description: 'Complete sneaker checkout solution with variant selection, sales summaries, customizable payment fees, flexible discounts, and real-time profit distribution for sneaker resellers.',
  keywords: 'sneaker checkout system, sneaker reselling checkout, footwear sales, sneaker variant selection, reseller tools, sneaker business checkout, footwear commerce',
  openGraph: {
    title: 'Sneaker Checkout System - FootVault Reseller Tools',
    description: 'Complete sneaker checkout solution with variant selection, sales summaries, customizable payment fees, flexible discounts, and real-time profit distribution for sneaker resellers.',
    type: 'website',
  },
};

export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-background">
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
          <Button variant="ghost" className="mb-12 group">
            <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to Features
          </Button>
        </Link>

        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <Badge variant="secondary" className="mb-6">Checkout System</Badge>
          <h1 className="text-5xl font-bold mb-6 tracking-tight">
            Complete Checkout Solution
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Checkout available variants with comprehensive sales summaries, customizable payment fees, flexible discounts, and real-time profit distribution visualization across all team members.
          </p>
        </div>

        {/* Hero Image */}
        <div className="mb-24">
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-2xl p-8 border">
            {/* Main Checkout Interface Image - 1200x600px */}
            <div className="bg-white dark:bg-gray-900 rounded-xl aspect-[2/1] border shadow-sm overflow-hidden">
              <Image 
                src="/checkout pictures/checkout banner.png"
                alt="Checkout System Interface"
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
          
          {/* Feature 1 - Variant Selection & Sales Summary */}
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-4">Variant Selection & Sales Summary</h2>
              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                Checkout available variants with detailed sales summaries showing costs, prices, and profit margins. Get real-time calculations as you build each transaction.
              </p>
              <div className="flex flex-wrap gap-3">
                <Badge variant="outline">Available Variants</Badge>
                <Badge variant="outline">Sales Summary</Badge>
                <Badge variant="outline">Real-time Calculations</Badge>
              </div>
            </div>
            {/* Variant Selection Image - 600x400px */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl aspect-[3/2] border overflow-hidden">
              <Image 
                src="/checkout pictures/checkout img 1.png"
                alt="Variant Selection & Sales Summary"
                width={600}
                height={400}
                unoptimized
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          {/* Feature 2 - Payment Fees & Discount Management */}
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Payment Management Image - 600x400px */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl aspect-[3/2] border lg:order-first order-last overflow-hidden">
              <Image 
                src="/checkout pictures/checkout img 2.png"
                alt="Payment & Discount Management"
                width={600}
                height={400}
                unoptimized
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-4">Smart Payment & Discount System</h2>
              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                Add payment types with customizable fees that can be deducted from profit or cost. Apply percentage or fixed discounts while maintaining accurate profit calculations.
              </p>
              <div className="flex flex-wrap gap-3">
                <Badge variant="outline">Payment Types</Badge>
                <Badge variant="outline">Customizable Fees</Badge>
                <Badge variant="outline">Flexible Discounts</Badge>
              </div>
            </div>
          </div>

          {/* Feature 3 - Real-time Profit Distribution */}
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-4">Real-time Profit Distribution</h2>
              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                Visualize exactly how profits will be distributed among each avatar in real-time. See individual profit shares, percentages, and amounts before completing the transaction.
              </p>
              <div className="flex flex-wrap gap-3">
                <Badge variant="outline">Avatar Visualization</Badge>
                <Badge variant="outline">Real-time Updates</Badge>
                <Badge variant="outline">Profit Transparency</Badge>
              </div>
            </div>
            {/* Profit Distribution Image - 600x400px */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl aspect-[3/2] border overflow-hidden">
              <Image 
                src="/checkout pictures/checkout profit distribution 3.png"
                alt="Real-time Profit Distribution Visualization"
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
              <Percent className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="font-semibold mb-2">Flexible Discounts</h3>
            <p className="text-sm text-muted-foreground">Apply percentage or fixed amount discounts with real-time calculations</p>
          </div>
          
          <div className="text-center p-6">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mx-auto mb-4">
              <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="font-semibold mb-2">Payment Fee Control</h3>
            <p className="text-sm text-muted-foreground">Customize whether fees impact profit or cost calculations</p>
          </div>
          
          <div className="text-center p-6">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="font-semibold mb-2">Avatar Profit Shares</h3>
            <p className="text-sm text-muted-foreground">See each team member's profit share before checkout completion</p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link href="/signup">
            <Button size="lg" className="px-8 py-3">
              Start Processing Sales
            </Button>
          </Link>
        </div>
      </div>

      {/* Call to Action Section */}
      <CallToAction 
        heading="Ready to Streamline Your Sales Process?"
        description="Process sales efficiently with automatic profit distribution, customer management, and comprehensive checkout features designed for sneaker resellers."
        image="/images/checkout one.png"
        buttons={{
          primary: {
            text: "Get Started",
            url: "/signup"
          }
        }}
      />

      {/* Footer */}
      <Footer />
    </div>
  );
}
