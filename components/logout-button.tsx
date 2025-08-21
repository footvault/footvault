"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const logout = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient(undefined);
      await supabase.auth.signOut();
      router.push("/login");
      // Don't reset loading state here - keep spinner until redirect completes
    } catch (error) {
      console.error("Logout error:", error);
      setIsLoading(false); // Only reset loading on error
    }
    // Removed finally block - don't reset loading on successful logout
  };

  return (
    <Button onClick={logout} disabled={isLoading}>
      {isLoading ? (
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          Signing out...
        </div>
      ) : (
        "Logout"
      )}
    </Button>
  );
}
