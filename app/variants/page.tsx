
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar" // Add this import
import { Separator } from "@/components/ui/separator" // Add this import
import { ShoesVariantsTable } from "@/components/shoes-variants-table"
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function HomePage() {
  // Check authentication
  const cookieStore = await cookies();
  const supabase = await createClient(cookieStore);
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect unauthenticated users to home page
  if (!user) {
    redirect("/");
  }


  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1 bg-white md:bg-transparent" />
        <Separator orientation="vertical" className="mr-2 h-4 hidden md:block" />
        <h1 className="text-xl font-semibold">Variants</h1>
      </header>
      <div className="w-full px-2 py-8">
        <div className="container mx-auto py-8 w-full">
          <ShoesVariantsTable />
        </div>
      </div>
    </SidebarInset>
  )
}
