"use client"

import type * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { Home, Plus, ShoppingCart, BarChart, CreditCard, Settings, Archive, Boxes } from "lucide-react"
import { useEffect, useState } from "react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  SidebarFooter,
} from "@/components/ui/sidebar"
import { usePathname } from "next/navigation"
import { getArchivedProducts } from "@/lib/data"
import { getArchivedVariantsWithProduct } from "@/lib/archived-variants"

const mainNavigation = [
  {
    title: "Inventory",
    url: "/inventory",
    icon: Home,
    protected: true,
  },
    {
    title: "Variants",
    url: "/variants",
    icon: Boxes,
    protected: true,
  },
  {
    title: "Add Product",
    url: "/add-product",
    icon: Plus,
    protected: true,
  },
  {
    title: "Checkout",
    url: "/checkout",
    icon: ShoppingCart,
    protected: true,
  },
  {
    title: "Sales",
    url: "/sales",
    icon: BarChart,
    protected: true,
  },

]

const secondaryNavigation = [
  {
    title: "Subscription",
    url: "/subscription",
    icon: CreditCard,
    protected: true,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
    protected: true,
  },
]

// Removed authNavigation from here as it will be handled by children prop in SidebarFooter

export function AppSidebar({ children, ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const [hasArchive, setHasArchive] = useState(false)

  useEffect(() => {
    async function checkArchive() {
      try {
        const [archivedProducts, archivedVariantGroups] = await Promise.all([
          getArchivedProducts(),
          getArchivedVariantsWithProduct(),
        ])
        // Show archive if there is at least one archived product or at least one archived variant
        const hasAny =
          (archivedProducts && archivedProducts.length > 0) ||
          (archivedVariantGroups && archivedVariantGroups.some(group => group.variants && group.variants.length > 0))
        setHasArchive(hasAny)
      } catch {
        setHasArchive(false)
      }
    }
    checkArchive()
  }, [])

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <div className="p-2 text-lg font-semibold flex items-center gap-2">
           <Image src={"/images/FootVault-logo-white-only.png"} alt="FootVault" width={32} height={32} />
          <Link href="/">FootVault</Link>
        </div>
          
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavigation.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {hasArchive && (
                <SidebarMenuItem key="Archive">
                  <SidebarMenuButton asChild isActive={pathname === "/archive"}>
                    <Link href="/archive">
                      <Archive />
                      <span>Archive</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {secondaryNavigation.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        {children} {/* Render children passed from layout.tsx */}
        <div className="p-2 text-sm text-gray-500">v0.1.0</div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

export default AppSidebar
