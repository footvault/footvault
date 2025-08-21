import { Spinner } from "@/components/ui/spinner"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"

export default function InventoryLoading() {
  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1 bg-white md:bg-transparent" />
        <Separator orientation="vertical" className="mr-2 h-4 hidden md:block" />
        <h1 className="text-xl font-semibold">Inventory</h1>
      </header>
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600">Loading inventory...</p>
        </div>
      </div>
    </SidebarInset>
  )
}