import { ArrowLeft, Search, Package, ImageIcon, Edit3, Plus, Database } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import CallToAction from '@/components/CallToAction';
import Footer from '@/components/Footer';
import { AuthButton } from "@/components/auth-button";
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sneaker Product Management - FootVault Reseller Tools',
  description: 'Add sneakers instantly using StockX information or create custom sneaker listings with manual entry. Streamline your sneaker inventory setup with intelligent data population for resellers.',
  keywords: 'sneaker product management, StockX sneaker integration, sneaker product addition, footwear listings, sneaker inventory setup, reseller tools, sneaker database management',
  openGraph: {
    title: 'Sneaker Product Management - FootVault Reseller Tools',
    description: 'Add sneakers instantly using StockX information or create custom sneaker listings with manual entry. Streamline your sneaker inventory setup with intelligent data population for resellers.',
    type: 'website',
  },
};

export default function StockXPage() {
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
          <Badge variant="secondary" className="mb-6">Product Management</Badge>
          <h1 className="text-5xl font-bold mb-6 tracking-tight">
            Smart Product Addition
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Add products instantly using StockX information or create custom listings with manual entry. Streamline your inventory setup with intelligent data population.
          </p>
        </div>

        {/* Hero Image */}
        <div className="mb-24">
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-2xl p-8 border">
            {/* Main StockX Integration Image - 1200x600px */}
            <div className="bg-white dark:bg-gray-900 rounded-xl aspect-[2/1] border shadow-sm overflow-hidden">
              <Image 
                src="/stockx pictures/stockx banner.png"
                alt="StockX Integration Interface"
                width={1200}
                height={600}
                priority
                unoptimized
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>

        {/* Main Features */}
        <div className="space-y-32 mb-24">
          
          {/* Feature 1 - StockX Integration */}
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-4">StockX Product Integration</h2>
              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                Search and add products using StockX information. Automatically populate product names, SKUs, images, and details. Simply set the shoe size and quantity - everything else is handled automatically.
              </p>
              <div className="flex flex-wrap gap-3">
                <Badge variant="outline">Automatic Data Population</Badge>
                <Badge variant="outline">Size & Quantity Selection</Badge>
                <Badge variant="outline">StockX Product Database</Badge>
              </div>
            </div>
            {/* StockX Search Image - 600x400px */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl aspect-[3/2] border overflow-hidden">
              <Image 
                src="/stockx pictures/product info.png"
                alt="StockX Product Search Interface"
                width={600}
                height={400}
                unoptimized
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          {/* Feature 2 - Manual Product Creation */}
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Manual Entry Image - 600x400px */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl aspect-[3/2] border lg:order-first order-last overflow-hidden">
              <Image 
                src="/stockx pictures/manual add.png"
                alt="Manual Product Creation Interface"
                width={600}
                height={400}
                unoptimized
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-4">Custom Product Creation</h2>
              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                For unique or custom items, create products manually. Paste image links and fill out all product information yourself. Perfect for exclusive items not found on StockX.
              </p>
              <div className="flex flex-wrap gap-3">
                <Badge variant="outline">Image Link Pasting</Badge>
                <Badge variant="outline">Complete Manual Control</Badge>
                <Badge variant="outline">Custom Product Details</Badge>
              </div>
            </div>
          </div>

        
        </div>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          <div className="text-center p-6">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Search className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="font-semibold mb-2">Product Search</h3>
            <p className="text-sm text-muted-foreground">Search StockX database for instant product information</p>
          </div>
          
          <div className="text-center p-6">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mx-auto mb-4">
              <ImageIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="font-semibold mb-2">Image Management</h3>
            <p className="text-sm text-muted-foreground">Automatic images from StockX or paste custom image links</p>
          </div>
          
          <div className="text-center p-6">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Plus className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="font-semibold mb-2">Flexible Addition</h3>
            <p className="text-sm text-muted-foreground">Choose between automated StockX data or manual entry</p>
          </div>
        </div>
      </div>

      {/* Call to Action Section */}
      <CallToAction 
        heading="Ready to Streamline Product Addition?"
        description="Start building your inventory faster with StockX integration and flexible manual entry options."
        image="/images/add product.png"
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
