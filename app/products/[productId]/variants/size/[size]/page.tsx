
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import ProductVariantsBySizePage from "@/components/product-variant-by-size-page"

export default async function VariantSizePage({ params }: { params: { productId: string; size: string } }) {
  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1 hidden md:flex" />
        <Separator orientation="vertical" className="mr-2 h-4 hidden md:block" />
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">Variants by Size</h1>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
            Size {params.size}
          </span>
        </div>
      </header>
      <div className="px-4 py-6 w-full">
        <ProductVariantsBySizePage 
          params={Promise.resolve({ 
            productId: params.productId, 
            size: params.size 
          })} 
        />
      </div>
    </SidebarInset>
  )
}
