import { ArrowLeft, Package, BarChart3, Search, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function InventoryPage() {
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
          <Badge className="mb-4">Smart Inventory Management</Badge>
          <h1 className="text-4xl lg:text-5xl font-bold mb-6 bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
            Never Lose Track of Your Sneakers Again
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Comprehensive inventory tracking with size variants, serial numbers, and real-time stock updates. 
            Manage your valuable sneaker collection with enterprise-grade precision.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <Package className="h-8 w-8 text-primary mb-4" />
            <h3 className="text-lg font-semibold mb-2">Size Variants</h3>
            <p className="text-muted-foreground">Track every size variant with individual stock levels and pricing.</p>
          </div>
          
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <BarChart3 className="h-8 w-8 text-primary mb-4" />
            <h3 className="text-lg font-semibold mb-2">Serial Numbers</h3>
            <p className="text-muted-foreground">Unique identification for each product with barcode generation.</p>
          </div>
          
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <Search className="h-8 w-8 text-primary mb-4" />
            <h3 className="text-lg font-semibold mb-2">Quick Search</h3>
            <p className="text-muted-foreground">Find products instantly with powerful search and filtering.</p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <Link href="/signup">
            <Button size="lg" className="text-lg px-8 py-4">
              Start Managing Your Inventory
              <RefreshCw className="h-5 w-5 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
