"use client"

import { useState, useTransition, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Search, Loader2, Plus, CircleCheck, Package, Clock, ArrowRight, Sparkles } from "lucide-react"
import Image from "next/image"
import { fetchKicksDevProduct } from "@/lib/fetchKicksDevProduct";
import { AddProductForm } from "@/components/add-product-form"
import { ManualAddProduct } from "./ManualAddProduct"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { searchKicksDev } from "@/lib/searchKickDevs"
import { createClient } from "@/lib/supabase/client"
import { Spinner } from "@/components/ui/spinner"
import { useRouter } from "next/navigation"

const supabase = createClient(undefined);

interface RecentProduct {
  id: number
  name: string
  brand: string
  sku: string
  image: string | null
  size_category: string
  created_at: string
  variant_count: number
}

export default function AddProductPage() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/");
      }
    };
    checkAuth();
  }, [router]);

  interface KicksDevProductData {
    id: string
    title: string
    brand: string
    sku: string
    category: string
    secondary_category: string
    image: string
    min_price: number
    avg_price: number
    max_price: number
    traits: Array<{ trait: string; value: string }>
    variants: Array<{
      id: string
      size: string
      size_type: string
      lowest_ask: number
    }>
    sizeCategory: string
  }

  const [searchTerm, setSearchTerm] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, startSearchTransition] = useTransition()
  const [selectedProductForModal, setSelectedProductForModal] = useState<KicksDevProductData | null>(null)
  const [existingProductDetails, setExistingProductDetails] = useState<any | null>(null)
  const [showAddProductModal, setShowAddProductModal] = useState(false)
  const [showManualAdd, setShowManualAdd] = useState(false)
  const [inventorySkus, setInventorySkus] = useState<string[]>([])
  const [inferredSizeCategory, setInferredSizeCategory] = useState<string | undefined>(undefined);
  const [loadingProductId, setLoadingProductId] = useState<string | null>(null)
  const [recentProducts, setRecentProducts] = useState<RecentProduct[]>([])
  const [loadingRecent, setLoadingRecent] = useState(true)
  const [hasPerformedSearch, setHasPerformedSearch] = useState(false)

  // Fetch recently added products
  const fetchRecentProducts = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: products, error } = await supabase
        .from('products')
        .select('id, name, brand, sku, image, size_category, created_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(8);

      if (error) {
        console.error("Failed to fetch recent products:", error);
        return;
      }

      if (products && products.length > 0) {
        // Get variant counts for each product
        const productIds = products.map(p => p.id);
        const { data: variants } = await supabase
          .from('variants')
          .select('product_id')
          .in('product_id', productIds)
          .eq('isArchived', false);

        const variantCounts: Record<number, number> = {};
        variants?.forEach(v => {
          variantCounts[v.product_id] = (variantCounts[v.product_id] || 0) + 1;
        });

        setRecentProducts(products.map(p => ({
          ...p,
          variant_count: variantCounts[p.id] || 0
        })));
      }
    } catch (error) {
      console.error("Failed to fetch recent products:", error);
    } finally {
      setLoadingRecent(false);
    }
  };

  useEffect(() => {
    const fetchInventorySkus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase
        .from('products')
        .select('sku')
        .eq('user_id', session.user.id);
      if (data) {
        setInventorySkus(data.map((p: any) => p.sku));
      }
    };
    fetchInventorySkus();
    fetchRecentProducts();
  }, []);

  const handleSearch = () => {
    if (!searchTerm.trim()) {
      toast({
        title: "Search Empty",
        description: "Please enter a search term.",
        variant: "destructive",
      })
      return
    }

    startSearchTransition(async () => {
      setHasPerformedSearch(true)
      const result = await searchKicksDev(searchTerm)
      if (result.success && result.data) {
        if (result.data.length === 0) {
          toast({
            title: "No Results",
            description: "No products found for your search term.",
          })
        } else {
          setSearchResults(result.data)
        }
      } else {
        toast({
          title: "Search Failed",
          description: result.error?.includes('fetch') || result.error?.includes('network') || result.error?.includes('connection')
            ? "No internet connection or API is temporarily unavailable. You can still add products manually below!"
            : result.error || "API service is temporarily unavailable. You can still add products manually below!",
          variant: "destructive",
        })
        setSearchResults([])
      }
    })
  }

  const handleAddProductClick = (kicksDevProductId: string, kicksDevProductSku: string) => {
    setLoadingProductId(kicksDevProductId)
    startSearchTransition(async () => {
      try {
        const kicksDevResult = await fetchKicksDevProduct(kicksDevProductId);
        if (!kicksDevResult?.success || !kicksDevResult?.data) {
          toast({
            title: "Failed to Load Product Details",
            description: (kicksDevResult?.error?.includes('fetch') || kicksDevResult?.error?.includes('network') || kicksDevResult?.error?.includes('connection'))
              ? "No internet connection or API is temporarily unavailable. You can still add this product manually below!"
              : kicksDevResult?.error || "API service is temporarily unavailable. You can still add this product manually below!",
            variant: "destructive",
          });
          return;
        }

        const title = kicksDevResult.data.title?.toLowerCase().trim() || "";
        const sku = kicksDevResult.data.sku?.toLowerCase().trim() || "";
        let detectedSizeCategory = "Men's";
        if (/\bwmns\b|\bwomen'?s?\b|\(women'?s?/i.test(title)) {
          detectedSizeCategory = "Women's";
        } else if (/\btd\b|\(td/i.test(title) || sku.includes("td")) {
          detectedSizeCategory = "Toddlers";
        } else if (/\bgs\b|\(gs|youth/i.test(title) || sku.includes("gs") || sku.includes("youth")) {
          detectedSizeCategory = "Youth";
        }

        setInferredSizeCategory(detectedSizeCategory);
        setSelectedProductForModal({
          id: kicksDevResult.data.id,
          title: kicksDevResult.data.title || "",
          brand: kicksDevResult.data.brand || "",
          sku: kicksDevResult.data.sku || "",
          category: kicksDevResult.data.category || "",
          secondary_category: kicksDevResult.data.secondary_category || "",
          image: kicksDevResult.data.image || "",
          min_price: kicksDevResult.data.min_price || 0,
          avg_price: kicksDevResult.data.avg_price || 0,
          max_price: kicksDevResult.data.max_price || 0,
          traits: kicksDevResult.data.traits || [],
          variants: kicksDevResult.data.variants || [],
          sizeCategory: detectedSizeCategory,
        });

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
          throw new Error("Authentication required");
        }

        const response = await fetch('/api/check-serial-number', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ serialNumber: kicksDevProductSku }),
        });

        const result = await response.json();

        if (result?.success && !result.isUnique) {
          setExistingProductDetails(result.data);
          toast({
            title: "Product Already Exists",
            description: "This product is already in your inventory.",
          });
        } else {
          setExistingProductDetails(null);
        }

        setShowAddProductModal(true);
      } catch (error: any) {
        console.error("Error in handleAddProductClick:", error);
        toast({
          title: "Error",
          description: error.message || "An unexpected error occurred",
          variant: "destructive",
        });
      } finally {
        setLoadingProductId(null);
      }
    });
  }

  const handleProductAdded = () => {
    setSearchTerm("");
    setSearchResults([]);
    setSelectedProductForModal(null);
    setExistingProductDetails(null);
    setHasPerformedSearch(false);
    // Refresh inventory SKUs and recent products after adding
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase
        .from('products')
        .select('sku')
        .eq('user_id', session.user.id);
      if (data) {
        setInventorySkus(data.map((p: any) => p.sku));
      }
    })();
    fetchRecentProducts();
  }

  const handleRecentProductClick = (product: RecentProduct) => {
    setSelectedProductForModal(null);
    setExistingProductDetails({
      id: product.id,
      name: product.name,
      brand: product.brand,
      sku: product.sku,
      image: product.image,
      size_category: product.size_category,
    });
    setInferredSizeCategory(product.size_category || "Men's");
    setShowAddProductModal(true);
  }

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const hasSearched = searchResults.length > 0 || (searchTerm.length > 0 && !isSearching);

  return (
    <SidebarInset>
      <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 backdrop-blur-sm px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4 hidden md:block" />
        <h1 className="text-lg font-semibold tracking-tight">Add Product</h1>
      </header>

      <div className="p-4 sm:p-6 animate-in fade-in duration-300">
        {/* Search Section - Always visible at top */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">Add <span className="text-emerald-500">New</span> Product</h2>
            <p className="text-muted-foreground text-sm">Search our database or add manually — it&apos;s quick and easy.</p>
          </div>

          {/* Search Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, SKU, or keyword..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch()
                }}
                className="pl-10 h-11 text-sm"
                disabled={isSearching}
              />
            </div>
            <Button onClick={handleSearch} disabled={isSearching} className="h-11 px-6 bg-emerald-600 hover:bg-emerald-700 text-white">
              {isSearching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              Search
            </Button>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <Button variant="outline" size="sm" onClick={() => setShowManualAdd(true)} className="text-xs h-8 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Manually
            </Button>
            <Link href="/inventory">
              <Button variant="ghost" size="sm" className="text-xs h-8 text-muted-foreground">
                <ArrowRight className="mr-1.5 h-3.5 w-3.5" />
                View Inventory
              </Button>
            </Link>
          </div>
        </div>

        {/* Search Results */}
        {isSearching && searchResults.length === 0 && (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center">
              <Spinner size="lg" />
              <p className="mt-3 text-sm text-muted-foreground">Searching products...</p>
            </div>
          </div>
        )}

        {searchResults.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={() => { setSearchResults([]); setSearchTerm(""); setHasPerformedSearch(false); }}
              >
                Clear results
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {searchResults.map((product, index) => {
                const alreadyInInventory = inventorySkus.includes(product.sku);
                return (
                  <Card
                    key={product.id}
                    className="group relative overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-md hover:border-emerald-500/30 animate-in fade-in slide-in-from-bottom-3 fill-mode-both"
                    style={{ animationDelay: `${index * 50}ms`, animationDuration: '400ms' }}
                    onClick={() => handleAddProductClick(product.id, product.sku)}
                  >
                    {alreadyInInventory && (
                      <div className="absolute top-2 right-2 z-10 bg-emerald-500 rounded-full p-0.5 shadow-sm">
                        <CircleCheck className="h-4 w-4 text-white" />
                      </div>
                    )}
                    <CardContent className="p-3 relative">
                      {loadingProductId === product.id && (
                        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-20 rounded-md">
                          <Spinner size="lg" />
                        </div>
                      )}
                      <div className="aspect-square relative mb-3 rounded-lg overflow-hidden bg-muted/50">
                        <Image
                          src={product.image || "/placeholder.svg?height=150&width=150"}
                          alt={product.title}
                          fill
                          className="object-contain p-2 group-hover:scale-105 transition-transform duration-200"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                          <div className="flex items-center gap-1.5 text-white text-xs font-medium bg-emerald-500/80 backdrop-blur-sm px-3 py-1.5 rounded-full">
                            <Plus className="h-3.5 w-3.5" />
                            Add
                          </div>
                        </div>
                      </div>
                      <h3 className="font-medium text-xs leading-tight mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                        {product.title}
                      </h3>
                      <p className="text-[11px] text-muted-foreground">{product.brand}</p>
                      <p className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">{product.sku}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* No results message */}
        {!isSearching && hasPerformedSearch && searchResults.length === 0 && (
          <div className="text-center py-12 mb-8">
            <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-1">No results for &quot;{searchTerm}&quot;</p>
            <p className="text-xs text-muted-foreground/70 mb-4">Try a different search term or add it manually</p>
            <Button
              size="sm"
              onClick={() => setShowManualAdd(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Manually
            </Button>
          </div>
        )}

        {/* Empty state with quick start cards - only show when no search */}
        {!hasSearched && !isSearching && (
          <div className="max-w-4xl mx-auto mb-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Card
                className="group cursor-pointer transition-all duration-200 hover:shadow-md hover:border-emerald-500/30 border-dashed"
                onClick={() => setShowManualAdd(true)}
              >
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/20 transition-colors">
                    <Plus className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="font-medium text-sm mb-0.5">Add Manual Product</h3>
                    <p className="text-xs text-muted-foreground">Enter product details yourself — for custom or unlisted items</p>
                  </div>
                </CardContent>
              </Card>
              <Card
                className="group cursor-pointer transition-all duration-200 hover:shadow-md hover:border-emerald-500/30 border-dashed"
                onClick={() => {
                  const input = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
                  input?.focus();
                }}
              >
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/20 transition-colors">
                    <Sparkles className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-sm mb-0.5">Search Database</h3>
                    <p className="text-xs text-muted-foreground">Auto-fill product info from our sneaker database</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Recently Added Products */}
        {recentProducts.length > 0 && (
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-4 w-4 text-emerald-500" />
              <h3 className="text-sm font-medium text-muted-foreground">Recently Added</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {recentProducts.map((product, index) => (
                <Card
                  key={product.id}
                  className="group overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-md hover:border-emerald-500/30 animate-in fade-in slide-in-from-bottom-3 fill-mode-both"
                  style={{ animationDelay: `${index * 60}ms`, animationDuration: '400ms' }}
                  onClick={() => handleRecentProductClick(product)}
                >
                  <CardContent className="p-3">
                    <div className="aspect-square relative mb-2.5 rounded-lg overflow-hidden bg-muted/50">
                      {product.image ? (
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          className="object-contain p-2 group-hover:scale-105 transition-transform duration-200"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-8 w-8 text-muted-foreground/40" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                        <div className="flex items-center gap-1.5 text-white text-xs font-medium bg-emerald-500/80 backdrop-blur-sm px-3 py-1.5 rounded-full">
                          <Plus className="h-3.5 w-3.5" />
                          Add Variant
                        </div>
                      </div>
                    </div>
                    <h3 className="font-medium text-xs leading-tight mb-1 line-clamp-2">{product.name}</h3>
                    <div className="flex items-center justify-between mt-1.5">
                      <p className="text-[11px] text-muted-foreground">{product.brand}</p>
                      <span className="text-[10px] text-muted-foreground/60">{formatTimeAgo(product.created_at)}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-[10px] text-muted-foreground/70 font-mono">{product.sku}</p>

                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Loading state for recent products */}
        {loadingRecent && !hasSearched && (
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-muted-foreground">Recently Added</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <CardContent className="p-3">
                    <div className="aspect-square rounded-lg bg-muted animate-pulse mb-2.5" />
                    <div className="h-3 bg-muted animate-pulse rounded w-3/4 mb-1.5" />
                    <div className="h-2.5 bg-muted animate-pulse rounded w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Modals */}
        <AddProductForm
          open={showAddProductModal}
          onOpenChange={setShowAddProductModal}
          productDataFromApi={selectedProductForModal}
          existingProductDetails={existingProductDetails}
          onProductAdded={handleProductAdded}
          inferredSizeCategory={inferredSizeCategory}
        />
        <ManualAddProduct
          open={showManualAdd}
          onOpenChange={setShowManualAdd}
          onProductAdded={handleProductAdded}
        />
      </div>
    </SidebarInset>
  )
}
