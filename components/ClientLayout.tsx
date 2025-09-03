"use client";

import { usePathname } from "next/navigation";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AuthForm } from "@/components/auth-form";
import { Toaster } from "@/components/ui/toaster";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

interface ClientLayoutProps {
  children: React.ReactNode;
  user: User | null;
}

export default function ClientLayout({ children, user }: ClientLayoutProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  // Define routes where the sidebar should not appear
  const noSidebarRoutes = ["/", "/login", "/features/inventory", "/features/profit", "/features/qr-scanner", "/features/sales", "/features/stockx", "/features/checkout", "/terms", "/privacy", "/contact", "/auth/callback", "/consignors/portal"];
  const showSidebar = !noSidebarRoutes.includes(pathname);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch by showing a loading state until mounted
  if (!mounted) {
    return (
      <div className="min-h-screen">
        {children}
        <Toaster />
      </div>
    );
  }

  if (!showSidebar) {
    return (
      <div className="min-h-screen">
        {children}
        <Toaster />
      </div>
    );
  }

  // Extra safety wrapper for sidebar rendering
  try {
    return (
      <SidebarProvider defaultOpen={true}>
        <AppSidebar>
          <AuthForm user={user} />
        </AppSidebar>
        <main className="flex-1">
          {children}
        </main>
        <Toaster />
      </SidebarProvider>
    );
  } catch (error) {
    console.error("Sidebar rendering error:", error);
    // Fallback to no-sidebar layout if sidebar fails
    return (
      <div className="min-h-screen">
        {children}
        <Toaster />
      </div>
    );
  }
}