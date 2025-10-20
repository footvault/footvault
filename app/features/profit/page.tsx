import { ArrowLeft, Calculator, PieChart, TrendingUp, Users, DollarSign, Percent, BarChart3, HandCoins } from 'lucide-react';
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
  title: 'Sneaker Profit Distribution - FootVault Reseller Tools',
  description: 'Create avatar-based profit distribution templates for sneaker reselling team payouts and organized profit tracking. Automatically split sneaker profits in checkout and monitor individual performance.',
  keywords: 'sneaker profit distribution, sneaker reselling profits, footwear team payouts, sneaker business profit tracking, reseller profit splitting, sneaker team performance',
  openGraph: {
    title: 'Sneaker Profit Distribution - FootVault Reseller Tools',
    description: 'Create avatar-based profit distribution templates for sneaker reselling team payouts and organized profit tracking. Automatically split sneaker profits in checkout and monitor individual performance.',
    type: 'website',
  },
};

export default function ProfitPage() {
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
          <Badge variant="secondary" className="mb-6">Profit Distribution</Badge>
          <h1 className="text-5xl font-bold mb-6 tracking-tight">
            Smart Profit Distribution
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Create avatar-based profit distribution templates for team payouts and organized profit tracking. Automatically split profits in checkout and monitor individual performance.
          </p>
        </div>

        {/* Hero Image */}
        <div className="mb-24">
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-2xl p-8 border">
            {/* Main Profit Dashboard Image - 1200x600px */}
            <div className="bg-white dark:bg-gray-900 rounded-xl aspect-[2/1] border shadow-sm overflow-hidden">
              <Image 
                src="/profit distribution/profit distribution banner.png"
                alt="Profit Distribution Dashboard"
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
          
          {/* Feature 1 - Avatar Management */}
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-4">Create Team Avatars</h2>
              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                Set up avatars for team members, partners, or different profit categories. Each avatar has a name and default percentage for quick template creation.
              </p>
              <div className="flex flex-wrap gap-3">
                <Badge variant="outline">Custom Avatars</Badge>
                <Badge variant="outline">Default Percentages</Badge>
                <Badge variant="outline">Team Management</Badge>
              </div>
            </div>
            {/* Avatar Management Image - 600x400px */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl aspect-[3/2] border overflow-hidden">
              <Image 
                src="/profit distribution/profit distribution img 1.png"
                alt="Team Avatar Management Interface"
                width={600}
                height={400}
                unoptimized
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          {/* Feature 2 - Distribution Templates */}
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Template Creation Image - 600x400px */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl aspect-[3/2] border lg:order-first order-last overflow-hidden">
              <Image 
                src="/profit distribution/profit distribution img 2.png"
                alt="Distribution Templates Interface"
                width={600}
                height={400}
                unoptimized
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-4">Build Distribution Templates</h2>
              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                Combine avatars to create reusable profit distribution templates. Set custom percentages and use templates in checkout for automatic profit splitting.
              </p>
              <div className="flex flex-wrap gap-3">
                <Badge variant="outline">Template Builder</Badge>
                <Badge variant="outline">Reusable Splits</Badge>
                <Badge variant="outline">Checkout Integration</Badge>
              </div>
            </div>
          </div>

          {/* Feature 3 - Profit Tracking */}
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-4">Track Individual Performance</h2>
              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                Monitor each avatar's profit performance over time. View detailed analytics in the sales page and optimize team compensation strategies.
              </p>
              <div className="flex flex-wrap gap-3">
                <Badge variant="outline">Performance Analytics</Badge>
                <Badge variant="outline">Sales Integration</Badge>
                <Badge variant="outline">Profit Reports</Badge>
              </div>
            </div>
            {/* Profit Analytics Image - 600x400px */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl aspect-[3/2] border overflow-hidden">
              <Image 
                src="/profit distribution/profit distribution img 3.png"
                alt="Individual Performance Analytics"
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
              <Calculator className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="font-semibold mb-2">Automatic Calculations</h3>
            <p className="text-sm text-muted-foreground">Instant profit splitting during checkout process</p>
          </div>
          
          <div className="text-center p-6">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="font-semibold mb-2">Team Collaboration</h3>
            <p className="text-sm text-muted-foreground">Organize profits for teams and partnerships</p>
          </div>
          
          <div className="text-center p-6">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mx-auto mb-4">
              <PieChart className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="font-semibold mb-2">Visual Distribution</h3>
            <p className="text-sm text-muted-foreground">Clear breakdown of profit allocation</p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <Link href="/login">
            <Button size="lg" className="text-lg px-8 py-4">
              Optimize Your Profits
              <DollarSign className="h-5 w-5 ml-2" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Call to Action Section */}
      <CallToAction 
        heading="Ready to Maximize Your Profits?"
        description="Start calculating accurate profits and optimizing your sneaker business with our advanced profit distribution tools."
        image="/images/sales.png"
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
