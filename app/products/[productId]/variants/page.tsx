import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { ProductVariantsPage } from "@/components/product-variants-page"

export default async function ProductVariantsRoute({ params }: { params: { productId: string } }) {
  return (
    <SidebarInset>
      <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 backdrop-blur-sm px-4">
        <SidebarTrigger className="-ml-1 hidden md:flex" />
        <Separator orientation="vertical" className="mr-2 h-4 hidden md:block" />
        <h1 className="text-lg font-semibold">Product Variants</h1>
      </header>
      <div className="px-4 py-6 w-full">
        <ProductVariantsPage productId={params.productId} />
      </div>
    </SidebarInset>
  )
}
