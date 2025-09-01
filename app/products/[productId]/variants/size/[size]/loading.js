import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"

export default function ProductsSizeLoading() {
  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1 hidden md:flex" />
        <Separator orientation="vertical" className="mr-2 h-4 hidden md:block" />
        <h1 className="text-xl font-semibold">Products Size</h1>
      </header>
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="flex flex-col items-center space-y-4 text-center">
          <Spinner size="lg" className="animate-pulse" />
          <div className="space-y-2">
            <p className="text-lg font-medium text-foreground">Loading product sizes...</p>
            <p className="text-sm text-muted-foreground">Please wait while we fetch the size data</p>
          </div>
        </div>
      </div>
    </SidebarInset>
  )
}
