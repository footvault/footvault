"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FcGoogle } from "react-icons/fc";

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient(undefined);
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      router.push("/inventory");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const supabase = createClient(undefined);
    setIsLoading(true);
    setError(null);
    
    console.log('=== GOOGLE LOGIN DEBUG ===')
    console.log('Starting Google OAuth flow...')
    console.log('Current URL:', window.location.href)
    
    try {
      // Get the correct base URL for redirects - works for both dev and prod
      const getBaseUrl = () => {
        if (typeof window !== 'undefined') {
          const origin = window.location.origin;
          console.log('Detected origin:', origin);
          
          // For development
          if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
            return origin; // http://localhost:3000
          }
          
          // For production - ensure we have the correct production URL
          if (origin.includes('footvault.dev')) {
            return origin; // https://www.footvault.dev or https://footvault.dev
          }
          
          // Fallback to detected origin
          return origin;
        }
        
        // Server-side fallback (shouldn't be used in client component)
        return process.env.NODE_ENV === 'production' 
          ? 'https://www.footvault.dev' 
          : 'http://localhost:3000';
      };

      const baseUrl = getBaseUrl()
      const redirectUrl = `${baseUrl}/auth/callback?next=${encodeURIComponent('/inventory')}`
      
      console.log('Environment details:', {
        nodeEnv: process.env.NODE_ENV,
        windowOrigin: window.location.origin,
        baseUrl,
        redirectUrl
      })

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            prompt: 'select_account'
          }
        },
      });

      console.log('OAuth request result:', {
        hasData: !!data,
        hasError: !!error,
        errorMessage: error?.message,
        data: data
      })

      if (error) {
        console.error('❌ Google OAuth error:', error);
        setError(`Google sign-in failed: ${error.message}`);
        setIsLoading(false); // Only reset loading on error
        console.log('=== END GOOGLE LOGIN DEBUG (ERROR) ===')
      } else {
        console.log('✅ OAuth redirect initiated successfully');
        console.log('Will redirect to:', redirectUrl);
        console.log('=== END GOOGLE LOGIN DEBUG (SUCCESS - REDIRECTING) ===')
        // Don't reset loading state - keep spinner until redirect happens
      }
    } catch (err) {
      console.error('❌ Unexpected error during OAuth:', err);
      setError('An unexpected error occurred during sign-in');
      setIsLoading(false); // Only reset loading on error
      console.log('=== END GOOGLE LOGIN DEBUG (CATCH ERROR) ===')
    }
    // Removed finally block - don't reset loading on successful OAuth
  };

  return (
    <div className={cn("flex min-h-screen items-center justify-center p-6", className)} {...props}>
      <div className="w-full max-w-md">
        {/* Brand Section */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
            FootVault
          </h1>
          <p className="text-lg text-white/80">
            Your Premium Sneaker Inventory
          </p>
        </div>

        {/* Login Card with Glassmorphism */}
        <Card className="backdrop-blur-xl bg-white/10 border-white/20 shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-white">
              Welcome Back
            </CardTitle>
            <CardDescription className="text-white/70">
              Continue with Google to access your sneaker vault
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {error && (
                <div className="p-3 bg-red-500/20 border border-red-400/50 rounded-md backdrop-blur-sm">
                  <p className="text-sm text-red-100">{error}</p>
                </div>
              )}
              
              <Button
                type="button"
                className="w-full h-12 bg-white hover:bg-gray-100 text-gray-900 font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                onClick={handleGoogleLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    Signing in...
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <FcGoogle size={20} />
                    Continue with Google
                  </div>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-white/60">
            Powered by FootVault • Secure Authentication
          </p>
        </div>
      </div>
    </div>
  );
}