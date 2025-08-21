import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { SpinnerContainer } from "@/components/ui/spinner"

export default function LoginLoading() {
  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1 hidden md:flex" />
        <Separator orientation="vertical" className="mr-2 h-4 hidden md:block" />
        <h1 className="text-xl font-semibold">Login</h1>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4">
        <SpinnerContainer>
          Loading login data...
        </SpinnerContainer>
      </div>
    </SidebarInset>
  )
}
