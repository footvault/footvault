import { LoginForm } from "../../components/login-form";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { ErrorBoundary, LoginErrorFallback } from "../../components/ErrorBoundary";

export default function Page() {
  return (
    <ErrorBoundary fallback={LoginErrorFallback}>
      <div className="min-h-screen w-full flex bg-[#0a0a0a]">
        {/* Left — Auth Form */}
        <div className="relative w-full lg:w-1/2 flex flex-col min-h-screen">
          {/* Back button */}
          <div className="absolute top-6 left-6 z-20">
            <Link
              href="/"
              className="flex items-center gap-2 px-3.5 py-2 text-sm text-neutral-400 hover:text-white border border-white/[0.06] hover:border-white/[0.12] bg-white/[0.02] rounded-lg transition-all duration-200"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>
          </div>

          {/* Form area */}
          <LoginForm />
        </div>

        {/* Right — Visual Panel (hidden on mobile) */}
        <div className="hidden lg:flex w-1/2 relative overflow-hidden">
          {/* Background video */}
          <video
            className="absolute inset-0 w-full h-full object-cover brightness-110"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            poster="/revamp-img/hero-tablet.png"
          >
            
            <source src="/revamp-img/footvaultloginvidinright.mp4" type="video/mp4" />
          
          </video>

          {/* Overlays */}
          <div className="absolute inset-0 bg-black/10" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-[#0a0a0a]/30" />

          {/* Content overlay */}
          <div className="relative z-10 flex flex-col justify-end p-12 pb-16 w-full">
            <div className="max-w-md">
              <div className="flex items-center gap-3 mb-6">
                <Image
                  src="/images/FootVault-logo-white-only.png"
                  alt="FootVault"
                  width={40}
                  height={40}
                />
                <span className="text-white font-bold text-xl">FootVault</span>
              </div>
              <h2 className="text-3xl font-bold text-white mb-3 leading-tight">
                Your sneaker business,<br />
                <span className="text-emerald-400">finally organized.</span>
              </h2>
              <p className="text-neutral-300 text-base leading-relaxed">
                Track every pair, manage sales, and know your real profit. Built specifically for sneaker resellers.
              </p>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
