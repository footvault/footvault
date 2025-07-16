"use client"

import { useState, useTransition, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, Loader2, Plus, CircleCheck } from "lucide-react"
import Image from "next/image"
import { fetchKicksDevProduct } from "@/lib/fetchKicksDevProduct";
import { KicksDevSearchItem } from "@/app/actions"
import { AddProductForm } from "@/components/add-product-form"
import { ManualAddProduct } from "./ManualAddProduct"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar" // Add this import
import { Separator } from "@/components/ui/separator" // Add this import
import { searchKicksDev } from "@/lib/searchKickDevs"
import { createClient } from "@/lib/supabase/client"

// Create the Supabase client
const supabase = createClient();

// Debug log to verify the import
console.log("fetchKicksDevProduct:", fetchKicksDevProduct);


export default function AddProductPage() {
  interface KicksDevProductData {
    id: string
    title: string // Added property to match the usage
    brand: string
    sku: string
    category: string
    secondary_category: string // Added property
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
  }

  const [searchTerm, setSearchTerm] = useState("")
  const [searchResults, setSearchResults] = useState<Array<KicksDevSearchItem>>([])
  const [isSearching, startSearchTransition] = useTransition()
  const [selectedProductForModal, setSelectedProductForModal] = useState<KicksDevProductData | null>(null)
  const [existingProductDetails, setExistingProductDetails] = useState<any | null>(null)
  const [showAddProductModal, setShowAddProductModal] = useState(false)
  const [showManualAdd, setShowManualAdd] = useState(false)
  const [inventorySkus, setInventorySkus] = useState<string[]>([])
  // Fetch all SKUs in inventory for this user
  useEffect(() => {
    const fetchInventorySkus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data, error } = await supabase
        .from('products')
        .select('sku')
        .eq('user_id', session.user.id);
      if (data) {
        setInventorySkus(data.map((p: any) => p.sku));
      }
    };
    fetchInventorySkus();
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
      const result = await searchKicksDev(searchTerm)
      console.log("Search result:", result) // Debug log
      if (result.success && result.data) {
        console.log("Search data:", result.data) // Debug log
        if (result.data.length === 0) {
          toast({
            title: "No Results",
            description: "No products found for your search term.",
          })
        } else {
          setSearchResults(result.data)
        }
      } else {
        console.error("Search error:", result.error) // Debug log
        toast({
          title: "Search Failed",
          description: result.error || "An error occurred during search.",
          variant: "destructive",
        })
        setSearchResults([])
      }
    })
  }

  const handleAddProductClick = (kicksDevProductId: string, kicksDevProductSku: string) => {
    startSearchTransition(async () => {
      try {
        // First, fetch product details from KicksDev
        const kicksDevResult = await fetchKicksDevProduct(kicksDevProductId);
        if (!kicksDevResult?.success || !kicksDevResult?.data) {
          toast({
            title: "Failed to Load Product Details",
            description: kicksDevResult?.error || "An error occurred while fetching product details.",
            variant: "destructive",
          });
          return;
        }

        // Set the selected product data
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
        });

        // Get the session for authentication
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          throw new Error("Authentication required");
        }

        // Then, check if the product exists in your database
        const response = await fetch('/api/check-serial-number', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            serialNumber: kicksDevProductSku
          }),
        });

       
        
        const result = await response.json();
        console.log("API Response:", result); // Debug log

        // If product exists, set the details
        if (result?.success && !result.isUnique) {
          setExistingProductDetails(result.data);
          toast({
            title: "Product Already Exists",
            description: "This product is already in your inventory.",
          });
        } else {
          // Product doesn't exist - this is not an error case
          setExistingProductDetails(null);
          console.log("Product not found in database - ready for creation");
        }

        // Show the modal after setting all the data
        setShowAddProductModal(true);

      } catch (error: any) {
        console.error("Error in handleAddProductClick:", error);
        toast({
          title: "Error",
          description: error.message || "An unexpected error occurred",
          variant: "destructive",
        });
      }
    });
  }

  const handleProductAdded = () => {
    setSearchTerm("");
    setSearchResults([]);
    setSelectedProductForModal(null);
    setExistingProductDetails(null);
    // Refresh inventory SKUs after adding
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data, error } = await supabase
        .from('products')
        .select('sku')
        .eq('user_id', session.user.id);
      if (data) {
        setInventorySkus(data.map((p: any) => p.sku));
      }
    })();
  }

  return (
    <SidebarInset>
      {" "}
      {/* Wrap content with SidebarInset */}
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1 hidden md:flex" /> {/* Add SidebarTrigger for desktop */}
        <Separator orientation="vertical" className="mr-2 h-4 hidden md:block" /> {/* Add separator */}
        <h1 className="text-xl font-semibold">Add Product</h1>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="container mx-auto py-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold">Add New Product</h1>
            <Link href="/inventory">
              <Button variant="outline">Back to Inventory</Button>
            </Link>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Search for a Product</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Enter product name or keyword (e.g., 'Nike Dunk Low Panda')"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSearch()
                    }
                  }}
                  className="pl-10"
                  disabled={isSearching}
                />
              </div>
              <Button onClick={handleSearch} disabled={isSearching}>
                {isSearching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Search
              </Button>
              <Button variant="outline" onClick={() => setShowManualAdd(true)}>
                <Plus className="mr-2 h-4 w-4" />Add Manual
              </Button>
            </CardContent>
          </Card>

          {searchResults.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {searchResults.map((product) => {
                // Check if this product is already in inventory (by SKU)
                const alreadyInInventory = inventorySkus.includes(product.sku);
                return (
                  <Card key={product.id} className="flex flex-col relative">
                    {/* Checkmark icon if already in inventory */}
                    {alreadyInInventory && (
                    <div className="absolute top-2 right-2 z-10 bg-green-600 rounded-full p-1 shadow-md flex items-center justify-center">
  <CircleCheck className="h-5 w-5 text-white" />
</div>
                    )}
                    <CardContent className="p-4 flex-grow">
                      <Image
                        src={product.image || "/placeholder.svg?height=150&width=150"}
                        alt={product.title}
                        width={150}
                        height={150}
                        className="rounded-md object-cover mx-auto mb-4"
                      />
                      <h3 className="font-semibold text-lg mb-1 line-clamp-2">{product.title}</h3>
                      <p className="text-sm text-gray-600 mb-1">{product.brand}</p>
                      <p className="text-xs text-gray-500 font-mono">{product.sku}</p>
                      <p className="text-xs text-gray-500">{product.category}</p>
                    </CardContent>
                    <div className="p-4 border-t">
                      <Button
                        className="w-full"
                        onClick={() => handleAddProductClick(product.id, product.sku)}
                        disabled={isSearching}
                      >
                        <Plus className="h-4 w-4 mr-2" /> Add Product
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {searchResults.length === 0 && !isSearching && searchTerm.length > 0 && (
            <div className="text-center py-12 text-gray-500">
              <Search className="h-12 w-12 mx-auto mb-4" />
              <p>No results found for "{searchTerm}". Try a different search term.</p>
            </div>
          )}

          {searchResults.length === 0 && !isSearching && searchTerm.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Search className="h-12 w-12 mx-auto mb-4" />
              <p>Search for a product to add to your inventory.</p>
            </div>
          )}

          <AddProductForm
            open={showAddProductModal}
            onOpenChange={setShowAddProductModal}
            productDataFromApi={selectedProductForModal}
            existingProductDetails={existingProductDetails}
            onProductAdded={handleProductAdded}
          />
          {/* Manual Add Product/Variant Section */}
          <Dialog open={showManualAdd} onOpenChange={setShowManualAdd}>
            <DialogContent>
              <ManualAddProduct
                onProductAdded={handleProductAdded}
                onClose={() => setShowManualAdd(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </SidebarInset>
  )
}
