"use client"

import type * as React from "react"
import Link from "next/link"
import { Home, Plus, ShoppingCart, BarChart, CreditCard, Settings } from "lucide-react"

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

const mainNavigation = [
  {
    title: "Inventory",
    url: "/inventory",
    icon: Home,
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

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <div className="p-2 text-lg font-semibold">Shoe Inventory</div>
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
