"use client"

import Link from "next/link"
import { User } from "@supabase/supabase-js"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useState } from "react"

interface AuthFormProps {
  user: User | null;
}

export function AuthForm({ user }: AuthFormProps) {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const router = useRouter();

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      const supabase = createClient(undefined);
      await supabase.auth.signOut();
      router.push("/login");
      // Don't reset loading state here - keep spinner until redirect completes
    } catch (error) {
      console.error("Sign out error:", error);
      setIsSigningOut(false); // Only reset loading on error
    }
    // Removed finally block - don't reset loading on successful sign out
  };

  return (
    <div className="p-2">
      {user ? (
        <Button 
          onClick={handleSignOut} 
          variant="ghost" 
          className="w-full justify-start"
          disabled={isSigningOut}
        >
          {isSigningOut ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              Signing out...
            </div>
          ) : (
            "Sign Out"
          )}
        </Button>
      ) : (
        <div className="flex flex-col gap-2">
          <Button asChild variant="ghost" className="w-full justify-start">
            <Link href="/login">Login</Link>
          </Button>
          
        </div>
      )}
    </div>
  )
}
