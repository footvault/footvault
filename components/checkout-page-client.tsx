"use client"
import { CheckoutClientWrapper } from "@/components/checkout-client-wrapper"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"

interface CheckoutPageClientProps {
  allVariants: any[]
  avatars: any[]
  profitTemplates: any[]
  error?: string
}

export function CheckoutPageClient({ allVariants, avatars, profitTemplates, error }: CheckoutPageClientProps) {
  if (error) {
    return (
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1 hidden md:flex" />
          <Separator orientation="vertical" className="mr-2 h-4 hidden md:block" />
          <h1 className="text-xl font-semibold">Checkout</h1>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="container mx-auto py-8 text-center text-red-500">
            <h1 className="text-3xl font-bold mb-4">Error Loading Checkout Page</h1>
            <p>There was an issue fetching the necessary data. Please try again later.</p>
            <p className="text-sm text-gray-600">Details: {error}</p>
          </div>
        </div>
      </SidebarInset>
    )
  }

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1 hidden md:flex" />
        <Separator orientation="vertical" className="mr-2 h-4 hidden md:block" />
        <h1 className="text-xl font-semibold">Checkout</h1>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4">
        <CheckoutClientWrapper
          initialVariants={allVariants}
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
