import { ArrowLeft, QrCode, Scan, Smartphone, Package2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function QRCodesPage() {
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
          <Badge className="mb-4">QR Scanner & Generation</Badge>
          <h1 className="text-4xl lg:text-5xl font-bold mb-6 bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
            Streamline Your Workflow with QR Codes
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Generate QR codes for easy product identification and use your camera to scan and manage 
            inventory instantly. Perfect for warehouse management and quick lookups.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <QrCode className="h-8 w-8 text-primary mb-4" />
            <h3 className="text-lg font-semibold mb-2">QR Generation</h3>
            <p className="text-muted-foreground">Auto-generate unique QR codes for every product variant.</p>
          </div>
          
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <Scan className="h-8 w-8 text-primary mb-4" />
            <h3 className="text-lg font-semibold mb-2">Camera Scanning</h3>
            <p className="text-muted-foreground">Use your phone camera to scan and lookup products instantly.</p>
          </div>
          
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <Smartphone className="h-8 w-8 text-primary mb-4" />
            <h3 className="text-lg font-semibold mb-2">Mobile First</h3>
            <p className="text-muted-foreground">Optimized for mobile devices for on-the-go inventory management.</p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <Link href="/signup">
            <Button size="lg" className="text-lg px-8 py-4">
              Start Using QR Codes
              <Package2 className="h-5 w-5 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
