"use client";

import { usePathname } from "next/navigation";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AuthForm } from "@/components/auth-form";
import type { User } from "@supabase/supabase-js";

interface ClientLayoutProps {
  children: React.ReactNode;
  user: User | null;
}

export default function ClientLayout({ children, user }: ClientLayoutProps) {
  const pathname = usePathname();

  // Define routes where the sidebar should not appear
  const noSidebarRoutes = ["/", "/login"];
  const showSidebar = !noSidebarRoutes.includes(pathname);

  if (!showSidebar) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar>
        <AuthForm user={user} />
      </AppSidebar>
      <main className="flex-1">
        <SidebarTrigger className="fixed left-4 top-4 z-50 md:hidden" />
        {children}
      </main>
    </SidebarProvider>
  );
}
