"use client";

import { cn } from "@/lib/utils";
import { useState, useRef } from "react";
import { FcGoogle } from "react-icons/fc";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import Image from "next/image";

gsap.registerPlugin(useGSAP);

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const ctx = gsap.context(() => {
      gsap.from('.login-logo', { opacity: 0, y: -15, duration: 0.6, delay: 0.1, ease: 'power3.out' });
      gsap.from('.login-title', { opacity: 0, y: 20, duration: 0.7, delay: 0.2, ease: 'power3.out' });
      gsap.from('.login-subtitle', { opacity: 0, y: 15, duration: 0.6, delay: 0.35, ease: 'power3.out' });
      gsap.from('.login-card', { opacity: 0, y: 30, scale: 0.97, duration: 0.8, delay: 0.45, ease: 'power3.out' });
      gsap.from('.login-footer', { opacity: 0, duration: 0.6, delay: 0.7, ease: 'power3.out' });
    }, formRef);
    return () => ctx.revert();
  }, { scope: formRef });

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      window.location.assign('/auth/sign-in?provider=google&next=%2Finventory');
    } catch (err) {
      console.error('Google OAuth redirect error:', err);
      setError('An unexpected error occurred during sign-in');
      setIsLoading(false);
    }
  };

  return (
    <div ref={formRef} className={cn("flex flex-1 items-center justify-center p-6", className)} {...props}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="login-logo flex items-center gap-2.5 mb-10 lg:hidden">
          <Image src="/images/FootVault-logo-white-only.png" alt="FootVault" width={32} height={32} />
          <span className="text-white font-bold text-lg">FootVault</span>
        </div>

        {/* Heading */}
        <div className="mb-8">
          <h1 className="login-title text-3xl font-bold text-white mb-2 tracking-tight">
            Welcome back
          </h1>
          <p className="login-subtitle text-neutral-400">
            Sign in to manage your sneaker inventory
          </p>
        </div>

        {/* Auth Card */}
        <div className="login-card space-y-5">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <button
            type="button"
            className="w-full flex items-center justify-center gap-3 h-12 bg-white hover:bg-neutral-100 text-neutral-900 font-medium rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleGoogleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin" />
                <span>Signing in...</span>
              </div>
            ) : (
              <>
                <FcGoogle size={20} />
                Continue with Google
              </>
            )}
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-neutral-500 text-xs uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          <a
            href="https://tally.so/r/31el0l"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center py-3 border border-white/[0.08] hover:border-white/[0.16] text-neutral-300 hover:text-white rounded-xl text-sm font-medium transition-all duration-200"
          >
            Contact us for access
          </a>
        </div>

        {/* Footer */}
        <p className="login-footer text-xs text-neutral-500 mt-8 text-center">
          By signing in, you agree to our{' '}
          <a href="/terms" className="text-neutral-400 hover:text-white transition-colors">Terms</a>{' '}
          and{' '}
          <a href="/privacy" className="text-neutral-400 hover:text-white transition-colors">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}