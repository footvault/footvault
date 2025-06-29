"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/app-sidebar";

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Define routes where the sidebar should not appear
  const noSidebarRoutes = ["/"];
  const showSidebar = !noSidebarRoutes.includes(pathname);

  return (
    <>
      {showSidebar && <Sidebar />}
      {children}
    </>
  );
}
