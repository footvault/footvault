import PricingPage from "./pricing-page" 
import UserDashboardCards from "./user-dashboard-cards" 
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
export default function Page() {
  return (
   <SidebarInset>
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1 bg-white md:bg-transparent" />
        <Separator orientation="vertical" className="mr-2 h-4 hidden md:block" />
        <h1 className="text-lg font-semibold">Subscription</h1>
      </header>
      <div className="flex flex-1 flex-col px-4 py-4 sm:px-6">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
          <UserDashboardCards />
          <PricingPage />
        </div>
      </div>
    </SidebarInset>
  )
}
