"use client"
import { CheckoutClientWrapper } from "@/components/checkout-client-wrapper"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"

interface CheckoutPageClientProps {
  allVariants: any[]
  allPreorders: any[]
  avatars: any[]
  profitTemplates: any[]
  error?: string
}

export function CheckoutPageClient({ allVariants, allPreorders, avatars, profitTemplates, error }: CheckoutPageClientProps) {
  if (error) {
    return (
      <SidebarInset className="overflow-x-hidden">
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 backdrop-blur-sm px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4 hidden md:block" />
          <h1 className="text-lg font-semibold">Checkout</h1>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-3">Error Loading Checkout</h2>
            <p className="text-muted-foreground">There was an issue fetching the necessary data. Please try again later.</p>
            <p className="text-xs text-muted-foreground mt-2">Details: {error}</p>
          </div>
        </div>
      </SidebarInset>
    )
  }

  return (
    <SidebarInset className="overflow-x-hidden">
      <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 backdrop-blur-sm px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4 hidden md:block" />
        <h1 className="text-lg font-semibold">Checkout</h1>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
        <CheckoutClientWrapper
          initialVariants={allVariants}
          initialPreorders={allPreorders}
          initialAvatars={avatars}
          initialProfitTemplates={profitTemplates.map(template => ({
            ...template,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }))}
        />
      </div>
    </SidebarInset>
  )
}
