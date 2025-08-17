import { ArrowLeft, Package, BarChart3, Search, RefreshCw, Filter, MapPin, DollarSign } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import CallToAction from '@/components/CallToAction';
import Footer from '@/components/Footer';
import { AuthButton } from "@/components/auth-button";
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sneaker Inventory Management - FootVault Reseller Tools',
  description: 'Track every sneaker, variant, and size with precision. Monitor costs, locations, and get real-time insights into your sneaker inventory performance for reselling success.',
  keywords: 'sneaker inventory management, sneaker tracking, footwear inventory, sneaker variant tracking, reseller inventory tools, sneaker warehouse management, footwear stock management',
  openGraph: {
    title: 'Sneaker Inventory Management - FootVault Reseller Tools',
    description: 'Track every sneaker, variant, and size with precision. Monitor costs, locations, and get real-time insights into your sneaker inventory performance for reselling success.',
    type: 'website',
  },
};

export default function InventoryPage() {
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
          <Badge variant="secondary" className="mb-6">Inventory Management</Badge>
          <h1 className="text-5xl font-bold mb-6 tracking-tight">
            Smart Inventory Tracking
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Track every sneaker, variant, and size with precision. Monitor costs, locations, and get real-time insights into your inventory performance.
          </p>
        </div>

        {/* Hero Image */}
        <div className="mb-24">
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-2xl p-8 border">
            {/* Main Dashboard Image - 1200x600px */}
            <div className="bg-white dark:bg-gray-900 rounded-xl aspect-[2/1] border shadow-sm overflow-hidden">
              <Image 
                src="/inventory feature/inventory feature banner.png"
                alt="Inventory Management Dashboard"
                width={1200}
                height={600}
                priority
                unoptimized
                className="w-full h-full object-contain"
                style={{ imageRendering: 'crisp-edges' }}
              />
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="space-y-24 mb-24">
          
          {/* Feature 1 */}
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-4">Track Every Variant</h2>
              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                Manage individual sizes and variants with their own stock numbers, prices, and locations. Never lose track of what you have in inventory.
              </p>
              <div className="flex flex-wrap gap-3">
                <Badge variant="outline">Size Variants</Badge>
                <Badge variant="outline">Stock Tracking</Badge>
                <Badge variant="outline">Individual Pricing</Badge>
              </div>
            </div>
            {/* Variants Image - 600x400px */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl aspect-[3/2] border overflow-hidden">
              <Image 
                src="/inventory feature/variant feature.png"
                alt="Variant Management Interface"
                width={600}
                height={400}
                unoptimized
                className="w-full h-full object-contain"
                style={{ imageRendering: 'crisp-edges' }}
              />
            </div>
          </div>

          {/* Feature 2 */}
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Filtering Image - 600x400px */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl aspect-[3/2] flex items-center justify-center border lg:order-first order-last overflow-hidden">
              <Image 
                src="/inventory feature/inventory filter.png"
                alt="Smart Filtering Interface"
                width={600}
                height={400}
                quality={100}
                className="w-full h-full object-contain rounded-xl"
              />
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-4">Find Anything Instantly</h2>
              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                Advanced filtering by size, brand, category, location, and price range. Powerful search to locate specific shoes in seconds.
              </p>
              <div className="flex flex-wrap gap-3">
                <Badge variant="outline">Smart Search</Badge>
                <Badge variant="outline">Multiple Filters</Badge>
                <Badge variant="outline">Quick Access</Badge>
              </div>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-4">Performance Insights</h2>
              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                Real-time analytics showing inventory value, stock levels, and profitability. Make data-driven decisions for your business.
              </p>
              <div className="flex flex-wrap gap-3">
                <Badge variant="outline">Real-time Stats</Badge>
                <Badge variant="outline">Profit Tracking</Badge>
                <Badge variant="outline">Performance Metrics</Badge>
              </div>
            </div>
            {/* Stats Image - 600x400px */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl aspect-[3/2] flex items-center justify-center border overflow-hidden">
              <Image 
                src="/inventory feature/inventory stat card.png"
                alt="Inventory Analytics Dashboard"
                width={600}
                height={400}
                quality={100}
                className="w-full h-full object-contain rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          <div className="text-center p-6">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="font-semibold mb-2">Individual Tracking</h3>
            <p className="text-sm text-muted-foreground">Unique identifiers and stock numbers for every shoe</p>
          </div>
          
          <div className="text-center p-6">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mx-auto mb-4">
              <MapPin className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="font-semibold mb-2">Location Management</h3>
            <p className="text-sm text-muted-foreground">Track where each item is physically stored</p>
          </div>
          
          <div className="text-center p-6">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mx-auto mb-4">
              <DollarSign className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="font-semibold mb-2">Cost & Profit Tracking</h3>
            <p className="text-sm text-muted-foreground">Monitor investments and profit margins</p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link href="/signup">
            <Button size="lg" className="px-8 py-3">
              Start Managing Your Inventory
            </Button>
          </Link>
        </div>
      </div>

      {/* Call to Action Section */}
      <CallToAction 
        heading="Ready to Transform Your Inventory Management?"
        description="Join thousands of sneaker resellers who use FootVault to track their inventory with precision and boost their profits."
        image="/images/dashboard.png"
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
