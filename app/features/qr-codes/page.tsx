import { ArrowLeft, QrCode, Scan, Smartphone, Package2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import CallToAction from '@/components/CallToAction';
import Footer from '@/components/Footer';
import { AuthButton } from "@/components/auth-button";
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sneaker QR Stickers & Scanning - FootVault Reseller Tools',
  description: 'Generate printable QR stickers for each sneaker variant and scan them for instant stock lookups. Perfect for sneaker resellers, physical inventory management and warehouse organization.',
  keywords: 'sneaker QR codes, sneaker QR stickers, footwear inventory scanning, sneaker stock lookup, reseller warehouse management, sneaker variant tracking, footwear QR scanner',
  openGraph: {
    title: 'Sneaker QR Stickers & Scanning - FootVault Reseller Tools',
    description: 'Generate printable QR stickers for each sneaker variant and scan them for instant stock lookups. Perfect for sneaker resellers, physical inventory management and warehouse organization.',
    type: 'website',
  },
};

export default function QRCodesPage() {
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
          <Button variant="ghost" className="mb-8 group">
            <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to Features
          </Button>
        </Link>

        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <Badge variant="secondary" className="mb-6">QR Code Management</Badge>
          <h1 className="text-5xl font-bold mb-6 tracking-tight">
            QR Stickers & Quick Scanning
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Generate printable QR stickers for each variant and scan them for instant stock lookups. Perfect for physical inventory management and warehouse organization.
          </p>
        </div>

        {/* Hero Image */}
        <div className="mb-24">
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-2xl p-8 border">
            {/* Main QR Dashboard Image - 1200x600px */}
            <div className="bg-white dark:bg-gray-900 rounded-xl aspect-[2/1] flex items-center justify-center border shadow-sm">
              <div className="text-center">
                <QrCode className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">QR Code Dashboard</p>
                <p className="text-sm text-gray-400">1200x600px</p>
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="space-y-24 mb-24">
          
          {/* Feature 1 - Sticker Generation */}
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-4">Generate Variant Stickers</h2>
              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                Create printable QR stickers for each shoe variant. Each sticker contains the variant's unique information for easy identification and quick inventory lookup.
              </p>
              <div className="flex flex-wrap gap-3">
                <Badge variant="outline">Variant-Specific</Badge>
                <Badge variant="outline">Printable Format</Badge>
                <Badge variant="outline">Unique Codes</Badge>
              </div>
            </div>
            {/* Sticker Generation Image - 600x400px */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl aspect-[3/2] flex items-center justify-center border">
              <div className="text-center">
                <QrCode className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500 font-medium">Sticker Generation</p>
                <p className="text-sm text-gray-400">600x400px</p>
              </div>
            </div>
          </div>

          {/* Feature 2 - Bulk Generation */}
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Bulk Generation Image - 600x400px */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl aspect-[3/2] flex items-center justify-center border lg:order-first order-last">
              <div className="text-center">
                <Package2 className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500 font-medium">Bulk Sticker Generation</p>
                <p className="text-sm text-gray-400">600x400px</p>
              </div>
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-4">Bulk Sticker Creation</h2>
              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                Generate multiple QR stickers at once for efficient printing. Perfect for preparing large inventory batches or organizing your entire collection.
              </p>
              <div className="flex flex-wrap gap-3">
                <Badge variant="outline">Batch Processing</Badge>
                <Badge variant="outline">Efficient Printing</Badge>
                <Badge variant="outline">Mass Organization</Badge>
              </div>
            </div>
          </div>

          {/* Feature 3 - Quick Scanning */}
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-4">Instant Stock Lookup</h2>
              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                Scan any QR sticker with your phone or camera to instantly access stock information, variant details, and inventory status. Perfect for warehouse management.
              </p>
              <div className="flex flex-wrap gap-3">
                <Badge variant="outline">Camera Scanning</Badge>
                <Badge variant="outline">Instant Lookup</Badge>
                <Badge variant="outline">Mobile Friendly</Badge>
              </div>
            </div>
            {/* QR Scanning Image - 600x400px */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl aspect-[3/2] flex items-center justify-center border">
              <div className="text-center">
                <Scan className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500 font-medium">QR Scanner Interface</p>
                <p className="text-sm text-gray-400">600x400px</p>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          <div className="text-center p-6">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mx-auto mb-4">
              <QrCode className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="font-semibold mb-2">Physical Labels</h3>
            <p className="text-sm text-muted-foreground">Printable stickers for physical shoe boxes</p>
          </div>
          
          <div className="text-center p-6">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Smartphone className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="font-semibold mb-2">Mobile Scanning</h3>
            <p className="text-sm text-muted-foreground">Scan with any smartphone camera</p>
          </div>
          
          <div className="text-center p-6">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Package2 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="font-semibold mb-2">Warehouse Ready</h3>
            <p className="text-sm text-muted-foreground">Perfect for inventory organization</p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link href="/login">
            <Button size="lg" className="px-8 py-3">
              Start Using QR Codes
            </Button>
          </Link>
        </div>
      </div>

      {/* Call to Action Section */}
      <CallToAction 
        heading="Ready to Streamline Your Operations?"
        description="Generate QR codes and scan inventory instantly with our advanced QR code management system."
        image="/images/search product.png"
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
