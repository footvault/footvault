"use client"

import type * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { Home, Plus, ShoppingCart, BarChart, CreditCard, Settings, Archive, Boxes, MessageSquare, Users, UserCheck, Package, HelpCircle } from "lucide-react"
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
import { getArchivedProducts } from "@/lib/data"
import { getArchivedVariantsWithProduct } from "@/lib/archived-variants"
import { useTutorial } from "@/context/TutorialContext"

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
  {
    title: "Customers",
    url: "/customers",
    icon: UserCheck,
    protected: true,
  },
  {
    title: "Pre-orders",
    url: "/preorders",
    icon: Package,
    protected: true,
  },
  {
    title: "Consignors",
    url: "/consignors",
    icon: Users,
    protected: true,
  },

]

const secondaryNavigation = [
  {
    title: "Help & Tutorials",
    url: "#",
    icon: HelpCircle,
    protected: true,
    isHelp: true,
  },
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
  {
    title: "Feedback",
    url: "https://tally.so/r/mZ7NBo",
    icon: MessageSquare,
    protected: true,
    external: true,
  },
]

// Removed authNavigation from here as it will be handled by children prop in SidebarFooter

export function AppSidebar({ children, ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const [hasArchive, setHasArchive] = useState(false)
  const { isMobile, setOpenMobile } = useSidebar()
  const { openTutorial, openWelcomeTutorial } = useTutorial()

  // Function to handle link clicks and close sidebar on mobile
  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }

  // Function to handle help button click
  const handleHelpClick = () => {
    // Get current page from pathname and open appropriate tutorial
    const currentPage = pathname.split('/')[1] || 'welcome'
    
    // Map some paths to tutorial names
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
    
    if (tutorialPage) {
      openTutorial(tutorialPage)
    } else {
      // Default to welcome tutorial if no specific page tutorial
      openWelcomeTutorial()
    }
    
    handleLinkClick() // Close mobile sidebar
  }

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
          <Link href="/" onClick={handleLinkClick}>FootVault</Link>
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
                    <Link href={item.url} onClick={handleLinkClick}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {hasArchive && (
                <SidebarMenuItem key="Archive">
                  <SidebarMenuButton asChild isActive={pathname === "/archive"}>
                    <Link href="/archive" onClick={handleLinkClick}>
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
                  {item.isHelp ? (
                    <SidebarMenuButton onClick={handleHelpClick}>
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  ) : (
                    <SidebarMenuButton 
                      asChild 
                      isActive={pathname === item.url}
                    >
                      {item.external ? (
                        <a href={item.url} target="_blank" rel="noopener noreferrer" onClick={handleLinkClick}>
                          <item.icon />
                          <span>{item.title}</span>
                        </a>
                      ) : (
                        <Link href={item.url} onClick={handleLinkClick}>
                          <item.icon />
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
      <SidebarFooter>
        {children} {/* Render children passed from layout.tsx */}
        
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

export default AppSidebar
