import { ArrowLeft, Zap, Download, DollarSign, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function StockXPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 dark:from-gray-950 dark:to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Link href="/#features">
          <Button variant="ghost" className="mb-8 group">
            <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to Features
          </Button>
        </Link>

        {/* Header */}
        <div className="text-center max-w-4xl mx-auto mb-16">
          <Badge className="mb-4">StockX Integration</Badge>
          <h1 className="text-4xl lg:text-5xl font-bold mb-6 bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
            Instant Product Data from StockX
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Automatically fetch product information, pricing, and images from StockX API. 
            Save hours of manual data entry with our seamless integration.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <Zap className="h-8 w-8 text-primary mb-4" />
            <h3 className="text-lg font-semibold mb-2">Instant Setup</h3>
            <p className="text-muted-foreground">Add products in seconds with automatic data population.</p>
          </div>
          
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <Download className="h-8 w-8 text-primary mb-4" />
            <h3 className="text-lg font-semibold mb-2">Product Images</h3>
            <p className="text-muted-foreground">High-quality product images downloaded automatically.</p>
          </div>
          
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <DollarSign className="h-8 w-8 text-primary mb-4" />
            <h3 className="text-lg font-semibold mb-2">Live Pricing</h3>
            <p className="text-muted-foreground">Get real-time market pricing data for informed decisions.</p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <Link href="/signup">
            <Button size="lg" className="text-lg px-8 py-4">
              Try StockX Integration
              <TrendingUp className="h-5 w-5 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
