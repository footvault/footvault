"use client"

import type * as React from "react"
import Link from "next/link"
import Image from "next/image"
import {
  Package,
  Layers,
  PlusCircle,
  ShoppingCart,
  ReceiptText,
  Users,
  CalendarClock,
  Handshake,
  Archive,
  HelpCircle,
  CreditCard,
  Settings,
  MessageSquare,
  ExternalLink,
} from "lucide-react"
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
  useSidebar,
} from "@/components/ui/sidebar"
import { usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useTutorial } from "@/context/TutorialContext"

const mainNavigation = [
  { title: "Inventory", url: "/inventory", icon: Package },
  { title: "Variants", url: "/variants", icon: Layers },
  { title: "Add Product", url: "/add-product", icon: PlusCircle },
  { title: "Checkout", url: "/checkout", icon: ShoppingCart },
  { title: "Sales", url: "/sales", icon: ReceiptText },
  { title: "Customers", url: "/customers", icon: Users },
  { title: "Pre-orders", url: "/preorders", icon: CalendarClock },
  { title: "Consignors", url: "/consignors", icon: Handshake },
]

const secondaryNavigation = [
  { title: "Help & Tutorials", url: "#", icon: HelpCircle, isHelp: true },
  { title: "Subscription", url: "/subscription", icon: CreditCard },
  { title: "Settings", url: "/settings", icon: Settings },
  { title: "Feedback", url: "https://tally.so/r/mZ7NBo", icon: MessageSquare, external: true },
  { title: "Discord", url: "https://discord.com/invite/Rh4xmpDBEZ", icon: MessageSquare, external: true, discord: true },
]

export function AppSidebar({ children, ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const [hasArchive, setHasArchive] = useState(false)
  const { isMobile, setOpenMobile } = useSidebar()
  const { openTutorial, openWelcomeTutorial } = useTutorial()

  const handleLinkClick = () => {
    if (isMobile) setOpenMobile(false)
  }

  const handleHelpClick = () => {
    const currentPage = pathname.split('/')[1] || 'welcome'
    const pageMap: Record<string, string> = {
      'inventory': 'inventory',
      'variants': 'variants',
      'add-product': 'add-product',
      'checkout': 'checkout',
      'sales': 'sales',
      'customers': 'customers',
      'preorders': 'preorders',
      'consignors': 'consignors',
      'settings': 'settings'
    }
    const tutorialPage = pageMap[currentPage]
    if (tutorialPage) openTutorial(tutorialPage)
    else openWelcomeTutorial()
    handleLinkClick()
  }

  useEffect(() => {
    async function checkArchive() {
      try {
        const supabase = createClient(undefined)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Fast existence check — just need to know if any archived items exist
        const [{ count: archivedProducts }, { count: archivedVariants }] = await Promise.all([
          supabase
            .from('products')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('isArchived', true)
            .limit(1),
          supabase
            .from('variants')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('isArchived', true)
            .limit(1),
        ])
        setHasArchive((archivedProducts ?? 0) > 0 || (archivedVariants ?? 0) > 0)
      } catch {
        setHasArchive(false)
      }
    }
    checkArchive()
  }, [])

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <Link
          href="/"
          onClick={handleLinkClick}
          className="flex items-center gap-2.5 px-3 py-3 group"
        >
          <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 transition-colors duration-200 group-hover:bg-emerald-500/20">
            <Image
              src="/images/FootVault-logo-white-only.png"
              alt="FootVault"
              width={22}
              height={22}
              className="transition-transform duration-200 group-hover:scale-105"
            />
          </div>
          <span className="text-base font-semibold tracking-tight">FootVault</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] uppercase tracking-wider text-muted-foreground/60 font-medium px-3">
            Main
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavigation.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    className="transition-all duration-150"
                  >
                    <Link href={item.url} onClick={handleLinkClick}>
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {hasArchive && (
                <SidebarMenuItem key="Archive">
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === "/archive"}
                    className="transition-all duration-150"
                  >
                    <Link href="/archive" onClick={handleLinkClick}>
                      <Archive className="h-4 w-4 shrink-0" />
                      <span>Archive</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="opacity-50" />

        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] uppercase tracking-wider text-muted-foreground/60 font-medium px-3">
            Account
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {secondaryNavigation.map((item) => (
                <SidebarMenuItem key={item.title}>
                  {item.isHelp ? (
                    <SidebarMenuButton
                      onClick={handleHelpClick}
                      className="transition-all duration-150"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  ) : (
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.url}
                      className="transition-all duration-150"
                    >
                      {item.external ? (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={handleLinkClick}
                          className="flex items-center justify-between"
                        >
                          <span className="flex items-center gap-2">
                            {(item as any).discord ? (
                              <svg
                                className="h-4 w-4 shrink-0"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                aria-hidden="true"
                              >
                                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                              </svg>
                            ) : (
                              <item.icon className="h-4 w-4 shrink-0" />
                            )}
                            <span>{item.title}</span>
                          </span>
                          <ExternalLink className="h-3 w-3 text-muted-foreground/40" />
                        </a>
                      ) : (
                        <Link href={item.url} onClick={handleLinkClick}>
                          <item.icon className="h-4 w-4 shrink-0" />
                          <span>{item.title}</span>
                        </Link>
                      )}
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/50">
        {children}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

export default AppSidebar
