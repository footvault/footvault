import PricingPage from "./pricing-page" 
import UserDashboardCards from "./user-dashboard-cards" 
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar" // Add this import
import { Separator } from "@/components/ui/separator" // Add this import
export default function Page() {
  return (
   <SidebarInset>
      {" "}
      {/* Wrap content with SidebarInset */}
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1 bg-white md:bg-transparent" /> {/* Show on mobile with white bg */}
        <Separator orientation="vertical" className="mr-2 h-4 hidden md:block" /> {/* Add separator */}
        <h1 className="text-xl font-semibold">Subscription</h1>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="container mx-auto py-8">
          <UserDashboardCards />
          <PricingPage />
        </div>
      </div>
    </SidebarInset>
  )
}
