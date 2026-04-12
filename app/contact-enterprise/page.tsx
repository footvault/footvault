import Link from 'next/link';
import { AlertTriangle, Mail, ArrowLeft } from 'lucide-react';

export default function ContactEnterprisePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] text-white px-5 py-16 relative">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] rounded-full bg-emerald-500/[0.03] blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-lg w-full rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 sm:p-10 text-center backdrop-blur-sm">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-7 h-7 text-amber-400" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-4">
          Enterprise Limit Reached
        </h1>
        <p className="text-neutral-400 mb-8 leading-relaxed">
          You&apos;ve reached the maximum of 10,000 variants/products for standard accounts.
          Contact us to discuss an enterprise plan tailored for your business.
        </p>

        <a
          href="mailto:footvault.dev@gmail.com"
          className="inline-flex items-center justify-center gap-2 w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-xl transition-all duration-200 mb-3"
        >
          <Mail className="w-4 h-4" />
          Contact Sales
        </a>

        <Link
          href="/inventory"
          className="inline-flex items-center justify-center gap-2 w-full py-3.5 border border-white/[0.1] text-white hover:bg-white/[0.05] rounded-xl text-sm font-medium transition-all duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Inventory
        </Link>

        <p className="text-neutral-500 text-xs mt-6">
          Need immediate help? Email{' '}
          <a href="mailto:footvault.dev@gmail.com" className="text-emerald-400 hover:underline">
            footvault.dev@gmail.com
          </a>
        </p>
      </div>
    </div>
  );
}
    </div>
  );
}
