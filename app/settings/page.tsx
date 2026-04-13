import { getUserProfile } from "./actions"
import { SettingsForm } from "../../components/settings-form"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"

export default async function SettingsPage() {
  const cookieStore = await cookies();
  const supabase = await createClient(cookieStore);
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const userProfile = await getUserProfile()

  return (
    <SidebarInset>
      <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 backdrop-blur-sm px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4 hidden md:block" />
        <h1 className="text-lg font-semibold tracking-tight">Settings</h1>
      </header>
      <div className="p-4 sm:p-6 animate-in fade-in duration-300">
        <SettingsForm user={userProfile} />
      </div>
    </SidebarInset>
  )
}
