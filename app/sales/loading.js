import { Spinner } from "@/components/ui/spinner"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"

export default function SalesLoading() {
  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1 bg-white md:bg-transparent" />
        <Separator orientation="vertical" className="mr-2 h-4 hidden md:block" />
        <h1 className="text-xl font-semibold">Sales</h1>
      </header>
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="flex flex-col items-center space-y-4 text-center">
          <Spinner size="lg" className="animate-pulse" />
          <div className="space-y-2">
            <p className="text-lg font-medium text-foreground">Loading sales...</p>
            <p className="text-sm text-muted-foreground">Please wait while we fetch your sales data</p>
          </div>
        </div>
      </div>
    </SidebarInset>
  )
}