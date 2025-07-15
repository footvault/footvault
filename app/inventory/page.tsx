import { ShoesInventoryTable } from "@/components/shoes-inventory-table"
import { getProducts } from "@/lib/data"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar" // Add this import
import { Separator } from "@/components/ui/separator" // Add this import

export default async function HomePage() {
  const shoesData = await getProducts()

  return (
    <SidebarInset>
      {" "}
      {/* Wrap content with SidebarInset */}
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1 hidden md:flex" /> {/* Add SidebarTrigger for desktop */}
        <Separator orientation="vertical" className="mr-2 h-4 hidden md:block" /> {/* Add separator */}
        <h1 className="text-xl font-semibold">Inventory</h1>
      </header>
      <div className="max-w-7xl mx-auto px-4 py-8 w-full">
      <div className="container mx-auto py-8">
          <ShoesInventoryTable initialShoesData={shoesData} />
        </div>
      </div>
    </SidebarInset>
  )
}
