import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { ProductVariantsPage } from "@/components/product-variants-page"

export default async function ProductVariantsRoute({ params }: { params: { productId: string } }) {
  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1 hidden md:flex" />
        <Separator orientation="vertical" className="mr-2 h-4 hidden md:block" />
        <h1 className="text-xl font-semibold">Product Variants</h1>
      </header>
      <div className="max-w-7xl mx-auto px-4 py-8 w-full">
        <div className="container mx-auto py-8">
          <ProductVariantsPage productId={params.productId} />
        </div>
      </div>
    </SidebarInset>
  )
}
