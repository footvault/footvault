
"use client"
import React, { useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  Edit,
  Trash2,
  MoreHorizontal,
  QrCode,
  Printer,
  Plus,
  Download,
  Upload,
  Eye,
  Package,
  CheckSquare,
  Square,
  Save,
  Loader2,
  TrendingUp,
  X,
  Star,
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import Image from "next/image"
import { useMemo, useState, useEffect, useCallback, useTransition } from "react"
import { getTotalStock, getVariantsBySize, getAvailableVariants } from "@/lib/utils/variant-helpers"
import { SizeModal } from "@/components/size-modal"
import { QRCodeModal } from "@/components/qr-code-modal"
import { PrintPreview } from "@/components/print-preview"
import { StatsCards } from "@/components/stats-cards"

      <div className="md:hidden space-y-4 p-4">
        {paginatedShoes.map((shoe) => (
          <div key={shoe.id} className="border rounded-lg p-4 bg-white shadow-sm">
            {/* ...full product card JSX as in the desktop table, adapted for mobile... */}
            {/* (see previous code for the full structure, including actions, details, and variants) */}
            {/* You can copy the JSX from the desktop table row and expanded row, but styled for mobile */}
            {/* ...existing code for mobile product card... */}
          </div>
        ))}

        {/* Pagination Controls for products (after the list) */}
        {filteredShoes.length > 50 && (
          <div className="flex flex-wrap justify-center items-center gap-2 my-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setProductPage((p) => Math.max(1, p - 1))}
              disabled={productPage === 1}
              aria-label="Previous page"
            >
              Previous
            </Button>
            <span className="text-sm">
              Page {productPage} of {totalProductPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setProductPage((p) => Math.min(totalProductPages, p + 1))}
              disabled={productPage === totalProductPages}
              aria-label="Next page"
            >
              Next
            </Button>
          </div>
        )}
      </div>
      const { success, data, error } = await fetchCustomLocations()
  
      if (success && data) {
        setCustomLocations(data)
      } else {
        console.error("Failed to fetch custom locations:", error)
      }
    }
  
    fetchLocations()
  }, [])

  // Dynamic filter options from shoesData
  const brandOptions = useMemo(() => {
    const brands = Array.from(new Set(shoesData.map((shoe) => shoe.brand).filter(Boolean)));
    return ["all", ...brands];
  }, [shoesData]);
  const categoryOptions = useMemo(() => {
    const categories = Array.from(new Set(shoesData.map((shoe) => shoe.category).filter(Boolean)));
    return ["all", ...categories];
  }, [shoesData]);
  const statusOptions = useMemo(() => {
    const statuses = Array.from(new Set(shoesData.map((shoe) => shoe.status).filter(Boolean)));
    return ["all", ...statuses];
  }, [shoesData]);

  // Calculate total inventory value for available or in display variants
  const totalInventoryValue = useMemo(() => {
    let total = 0;
    for (const shoe of shoesData) {
      if (Array.isArray(shoe.variants)) {
        for (const variant of shoe.variants) {
          if (variant.status === "Available" || variant.status === "In Display") {
            // Prefer costPrice if present, else originalPrice, else 0
            total += Number(variant.costPrice ?? shoe.originalPrice ?? 0);
          }
        }
      }
    }
    return total;
  }, [shoesData]);

  // Enhanced filter and search logic
  const filteredShoes = useMemo(() => {
    const filtered = shoesData.filter((shoe) => {
      // Search in product fields
      const matchesProductSearch =
        shoe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shoe.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shoe.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shoe.category?.toLowerCase().includes(searchTerm.toLowerCase());

      // Search in variant fields
      const matchesVariantSearch = shoe.variants.some((variant: any) =>
        (variant.serialNumber && variant.serialNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (variant.variantSku && variant.variantSku.toLowerCase().includes(searchTerm.toLowerCase()))
      );

      const matchesSearch = matchesProductSearch || matchesVariantSearch;
      const matchesStatus = statusFilter === "all" || shoe.status === statusFilter;
      const matchesBrand = brandFilter === "all" || shoe.brand === brandFilter;
      const matchesCategory = categoryFilter === "all" || shoe.category === categoryFilter;
      const matchesPrice = shoe.salePrice >= priceRange[0] && shoe.salePrice <= priceRange[1];

      return matchesSearch && matchesStatus && matchesBrand && matchesCategory && matchesPrice;
    });

    // Sort logic
    filtered.sort((a, b) => {
      let aValue: any = a[sortBy as keyof typeof a];
      let bValue: any = b[sortBy as keyof typeof b];
      if (sortBy === "stock") {
        aValue = getTotalStock(a.variants);
        bValue = getTotalStock(b.variants);
      }
      if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    return filtered;
  }, [searchTerm, statusFilter, brandFilter, categoryFilter, priceRange, sortBy, sortOrder, shoesData]);

  // Auto-expand rows for products with matching variants when searching
  useEffect(() => {
    if (searchTerm.trim() === "") return;
    const expandedIds: number[] = [];
    filteredShoes.forEach((shoe) => {
      // If any variant matches the search, expand this row
      const hasMatchingVariant = shoe.variants.some((variant: any) =>
        (variant.serialNumber && variant.serialNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (variant.variantSku && variant.variantSku.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      if (hasMatchingVariant) {
        expandedIds.push(shoe.id);
      }
    });
    setExpandedRows(expandedIds);
  }, [searchTerm, filteredShoes]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(filteredShoes.map((shoe) => shoe.id))
    } else {
      setSelectedItems([])
    }
  }

  const handleSelectVariant = (variantId: string, checked: boolean) => {
    if (checked) {
      setSelectedVariants([...selectedVariants, variantId])
    } else {
      setSelectedVariants(selectedVariants.filter((item) => item !== variantId))
    }
  }

  const handleSelectItem = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedItems([...selectedItems, id])
    } else {
      setSelectedItems(selectedItems.filter((item) => item !== id))
    }
  }

  const handleSelectAllVariantsForSize = (variants: any[], checked: boolean) => {
    const variantIds = variants.map((v) => v.id)
    if (checked) {
      setSelectedVariants([...selectedVariants, ...variantIds.filter((id) => !selectedVariants.includes(id))])
    } else {
      setSelectedVariants(selectedVariants.filter((id) => !variantIds.includes(id)))
    }
  }

  const toggleRowExpansion = (id: number) => {
    if (expandedRows.includes(id)) {
      setExpandedRows(expandedRows.filter((rowId) => rowId !== id))
    } else {
      setExpandedRows([...expandedRows, id])
    }
  }

  const handleDeleteConfirmation = (type: "product" | "variant", id?: number | string) => {
  if (type === "product" && id) {
    const foundShoe = filteredShoes.find((shoe) => shoe.id === Number(id)) // or use allShoes
    setSelectedShoe(foundShoe || null)
  }

  setItemToDelete({ type, id })
  setShowDeleteConfirmationModal(true)
}

  const handleBulkDeleteConfirmation = (type: "bulk-products" | "bulk-variants") => {
    if (type === "bulk-products" && selectedItems.length > 0) {
      setItemToDelete({ type, ids: selectedItems.map(String) }) // Convert numbers to strings for consistency
      setShowDeleteConfirmationModal(true)
    } else if (type === "bulk-variants" && selectedVariants.length > 0) {
      setItemToDelete({ type, ids: selectedVariants })
      setShowDeleteConfirmationModal(true)
    }
  }

// Client-side functions to call your API
const deleteProduct = async (productId: number) => {
  try {
    const response = await fetch('/api/delete-product', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ productId })
    });

    const result = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: result.error || 'Failed to delete product'
      };
    }

    return {
      success: true,
      message: result.message
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Network error occurred'
    };
  }
};

const deleteVariants = async (variantIds: string[]) => {
  try {
    const response = await fetch('/api/delete-variants', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ variantIds })
    });

    const result = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        error: result.error || 'Failed to delete variants'
      };
    }

    return {
      success: true,
      message: result.message
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Network error occurred'
    };
  }
};

// Updated executeDelete function with proper error handling
const executeDelete = async () => {
  if (!itemToDelete) return;

  setIsDeleting(() => {}); // Start transition (no-op function)

  let success = false;
  let errorMessage = "";

  try {
    if (itemToDelete.type === "product" && itemToDelete.id) {
      const result = await deleteProduct(itemToDelete.id as number);
      success = result.success;
      errorMessage = result.error || "";
    } else if (itemToDelete.type === "variant" && itemToDelete.id) {
      const result = await deleteVariants([itemToDelete.id as string]);
      success = result.success;
      errorMessage = result.error || "";
    } else if (itemToDelete.type === "bulk-products" && itemToDelete.ids) {
      // Handle bulk product deletion
      let allSuccessful = true;
      let errors: string[] = [];
      
      for (const id of itemToDelete.ids) {
        const result = await deleteProduct(Number(id));
        if (!result.success) {
          allSuccessful = false;
          errors.push(`Product ${id}: ${result.error}`);
        }
      }
      
      success = allSuccessful;
      errorMessage = errors.length > 0 ? errors.join('; ') : "";
    } else if (itemToDelete.type === "bulk-variants" && itemToDelete.ids) {
      const result = await deleteVariants(itemToDelete.ids);
      success = result.success;
      errorMessage = result.error || "";
    }

    if (success) {
      console.log("Deletion successful!");
      toast({
        title: "Deletion Successful",
        description: "Selected item(s) have been deleted.",
      });
      await refreshData(); // Refresh data after deletion
      setSelectedItems([]);
      setSelectedVariants([]);
    } else {
      console.error("Deletion failed:", errorMessage);
      toast({
        title: "Deletion Failed",
        description: errorMessage || "An unknown error occurred during deletion.",
        variant: "destructive",
      });
    }
  } catch (e: any) {
    console.error("Error during deletion:", e);
    toast({
      title: "Deletion Error",
      description: `An unexpected error occurred: ${e.message}`,
      variant: "destructive",
    });
  } finally {
    setIsDeleting(() => {}); // End transition (no-op function)
    setShowDeleteConfirmationModal(false);
    setItemToDelete(null);
  }
};

  const handleBulkAction = async (action: string) => {
    setIsLoading(true)

    try {
      switch (action) {
        case "delete":
          handleBulkDeleteConfirmation(selectedVariants.length > 0 ? "bulk-variants" : "bulk-products")
          break
        case "duplicate":
          // Implement bulk duplicate for products
          console.log(`Bulk duplicate for products:`, selectedItems)
          break
        case "export":
          const csvContent = generateCSV(filteredShoes)
          downloadCSV(csvContent, "selected-inventory.csv")
          break
        case "print-qr":
          setShowPrintPreview(true)
          break
        case "print-variant-qr":
          setShowPrintPreview(true)
          break
        case "update-status":
          // Implement bulk status update for variants
          console.log(`Bulk status update for variants:`, selectedVariants)
          break
        case "move-location":
          setShowMoveLocationModal(true);
          // Do NOT clear selectedItems/selectedVariants here
          break;
        case "mark-sold":
          // Implement bulk mark as sold for variants
          console.log(`Bulk mark as sold for variants:`, selectedVariants)
          break
        case "mark-reserved":
          // Implement bulk mark as reserved for variants
          console.log(`Bulk mark as reserved for variants:`, selectedVariants)
          break
      }
    } finally {
      setIsLoading(false)
      if (
        action !== "print-qr" &&
        action !== "print-variant-qr" &&
        action !== "export" &&
        action !== "move-location" // <-- Don't clear selection for move-location here
      ) {
        setSelectedItems([])
        setSelectedVariants([])
        refreshData() // Refresh data after bulk action
      }
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      "In Stock": "bg-green-100 text-green-800 border-green-200 hover:bg-green-200 hover:text-green-900",
      "Low Stock": "bg-yellow-100 text-yellow-800 border-yellow-200  hover:bg-yellow-200 hover:text-yellow-900",
      "Out of Stock": "bg-red-100 text-red-800 border-red-200 hover:bg-red-200 hover:text-red-900",
      Discontinued: "bg-gray-100 text-gray-800 border-gray-200",
    }

    return <Badge className={`${variants[status] || "bg-gray-100 text-gray-800 border-gray-200"}`}>{status}</Badge>
  }

  const getVariantStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      Available: "bg-green-100 text-green-800 border-green-200 hover:bg-green-200 hover:text-green-900",
      "In Display": "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200 hover:text-blue-900",
      Used: "bg-gray-100 text-gray-800 border-gray-200",
      Sold: "bg-purple-100 text-purple-800 border-purple-200 ", // Added Sold status
    }

    return (
      <Badge className={`${variants[status] || "bg-gray-100 text-gray-800 border-gray-200"} text-xs`}>{status}</Badge>
    )
  }

  // Updated generateCSV to include variant data and cost_price
  const generateCSV = (data: any[]) => {
    const headers = [
      "Product Name",
      "Product Brand",
      "Product SKU",
      "Product Category",
      "Original Price",
      "Sale Price",
      "Product Status",
      "Product Image URL",
      "Size Category",
      "Variant ID",
      "Size",
      "Size Label",
      "Location",
      "Variant Status",
      "Date Added",
      "Condition",
      "Serial Number",
      "Variant SKU",
      "Cost Price", // Added Cost Price
    ]

    const rows: string[][] = []

    data.forEach((shoe) => {
      if (shoe.variants && shoe.variants.length > 0) {
        shoe.variants.forEach((variant: any) => {
          rows.push([
            shoe.name,
            shoe.brand,
            shoe.sku,
            shoe.category || "",
            shoe.originalPrice,
            shoe.salePrice,
            shoe.status,
            shoe.image || "",
            shoe.sizeCategory || "",
            variant.id,
            variant.size,
            variant.sizeLabel || "",
            variant.location || "",
            variant.status || "",
            variant.dateAdded || "",
            variant.condition || "",
            variant.serialNumber || "",
            variant.variantSku || "",
            variant.costPrice || 0, // Include costPrice
          ])
        })
      } else {
        // Include products without variants, though they might not be fully managed
        rows.push([
          shoe.name,
          shoe.brand,
          shoe.sku,
          shoe.category || "",
          shoe.originalPrice,
          shoe.salePrice,
          shoe.status,
          shoe.image || "",
          shoe.sizeCategory || "",
          "", // No variant ID
          "", // No size
          "", // No size label
          "", // No location
          "", // No variant status
          "", // No date added
          "", // No condition
          "", // No serial number
          "", // No variant SKU
          "", // No cost price
        ])
      }
    })

    return [
      headers.map((h) => `"${h}"`).join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n")
  }

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(column)
      setSortOrder("asc")
    }
  }

  const toggleSizeCollapse = (shoeId: number, size: string) => {
    const key = `${shoeId}-${size}`
    if (collapsedSizes.includes(key)) {
      setCollapsedSizes(collapsedSizes.filter((k) => k !== key))
    } else {
      setCollapsedSizes([...collapsedSizes, key])
    }
  }

  const handleEditVariant = (variantId: string, variantData: any) => {
    setEditingVariant(variantId)
    // Use nullish coalescing to ensure costPrice is always a number, falling back to productOriginalPrice or 0
    const initialCostPrice = variantData.costPrice ?? variantData.productOriginalPrice ?? 0
    setEditValues({ ...variantData, costPrice: initialCostPrice })
  }

  const handleAddCustomLocation = async () => {
    if (!newCustomLocationName.trim()) {
      toast({
        title: "Location Name Empty",
        description: "Please enter a name for the new location.",
        variant: "destructive",
      })
      return
    }
    startAddLocationTransition(async () => {
      const { success, error } = await addCustomLocation(newCustomLocationName.trim())
      if (success) {
        toast({
          title: "Location Added",
          description: `"${newCustomLocationName}" has been added to custom locations.`,
        })
        setCustomLocations((prev) => [...prev, newCustomLocationName.trim()].sort())
        setEditValues((prev: any) => ({ ...prev, location: newCustomLocationName.trim() })) // Set the newly added location as selected
        setNewCustomLocationName("")
        setShowCustomLocationInput(false)
      } else {
        toast({
          title: "Failed to Add Location",
          description: error || "An error occurred while adding the location.",
          variant: "destructive",
        })
      }
    })
  }

  const handleSaveVariant = async () => {
    try {
      setIsLoading(true);
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to continue",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch('/api/update-variant', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          variantId: editValues.id,
          status: editValues.status,
          location: editValues.location,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update variant');
      }

      if (result.success) {
        toast({
          title: "Success",
          description: "Variant updated successfully",
        });
        await refreshData(); // Re-fetch data to reflect changes
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update variant",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error updating variant:", error);
      toast({
        title: "Error",
        description: error.message || "An error occurred while updating the variant",
        variant: "destructive",
      });
    } finally {
      setEditingVariant(null);
      setEditValues({});
      setIsLoading(false);
    }
  }

  const handleCancelEdit = () => {
    setEditingVariant(null)
    setEditValues({})
  }


  return (
    <div className="space-y-6">
      <StatsCards data={shoesData} totalInventoryValue={totalInventoryValue} />

      <Card>
         <CardHeader className="p-4 md:p-6">
        {/* Title and Main Actions */}
        <div className="flex flex-col space-y-4">
          {/* Header Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <CardTitle className="text-lg md:text-2xl font-bold truncate">
                <span className="hidden sm:inline">Individual Shoe Inventory Management</span>
                <span className="sm:hidden">Inventory</span>
              </CardTitle>
              <Button
  variant="outline"
  size="icon"
  className="shrink-0"
  title="Scan QR to Search"
  onClick={handleScannerOpen}
>
  <QrCode className="h-4 w-4" />
</Button>
            </div>

            {/* Mobile Menu Button */}
            <div className="flex items-center gap-2">
              <div className="md:hidden">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="px-2"
                >
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Desktop Actions */}
              <div className="hidden md:flex gap-2">
                {/* {userPlan?.toLowerCase() != "free" ? (
  <Button variant="outline" size="sm" onClick={() => setShowImportModal(true)}>
    <Upload className="h-4 w-4 mr-2" />
    Import
  </Button>
) : (
  <>
    <Button variant="outline" size="sm" onClick={() => setShowPremiumModal(true)}>
      <Star className="h-4 w-4 mr-2 text-yellow-500" />
      Import
    </Button>
    <PremiumFeatureModal
      open={showPremiumModal}
      onOpenChange={setShowPremiumModal}
      featureName="Import Inventory"
    />
  </>
)} */}
                {userPlan?.toLowerCase() != "free" ? (
  <Button
    variant="outline"
    size="sm"
    onClick={() => {
       const csvContent = generateCSV(shoesData); //
      downloadCSV(csvContent, "inventory-export.csv");
    }}
  >
    <Download className="h-4 w-4 mr-2" />
    Export
  </Button>
) : (
  <>
    <Button variant="outline" size="sm" onClick={() => setShowPremiumModal(true)}>
      <Star className="h-4 w-4 mr-2 text-yellow-500" />
      Export
    </Button>
    <PremiumFeatureModal
      open={showPremiumModal}
      onOpenChange={setShowPremiumModal}
      featureName="Export Inventory"
    />
  </>
)}
                <Link href="/add-product">
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Product
                  </Button>
                </Link>
                <Link href="/checkout">
                  <Button size="sm" >
                    <Plus className="h-4 w-4 mr-2" />
                    New Sale
                  </Button>
                </Link>
                <Link href="/sales">
                  <Button size="sm" variant="outline">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Sales History
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Mobile Action Buttons */}
          <div className="grid grid-cols-2 gap-2 md:hidden">
            <Link href="/add-product">
              <Button size="sm" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </Link>
            <Link href="/checkout">
              <Button size="sm" variant="secondary" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                New Sale
              </Button>
            </Link>
          </div>

          {/* Additional Mobile Actions */}
          <div className="grid grid-cols-2 gap-2 md:hidden">
           {userPlan?.toLowerCase() != "free" ? (
  <>
    
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        const csvContent = generateCSV([]);
        downloadCSV(csvContent, "inventory-export.csv");
      }}
    >
      <Download className="h-4 w-4 mr-1" />
      Export
    </Button>
  </>
) : (
  <>
    <Button variant="outline" size="sm" onClick={() => setShowPremiumModal(true)}>
      <Star className="h-4 w-4 mr-1 text-yellow-500" />
      Import
    </Button>
    <Button variant="outline" size="sm" onClick={() => setShowPremiumModal(true)}>
      <Star className="h-4 w-4 mr-1 text-yellow-500" />
      Export 
    </Button>
    <PremiumFeatureModal
      open={showPremiumModal}
      onOpenChange={setShowPremiumModal}
      featureName="Premium Feature"
    />
  </>
)}
            <Link href="/sales">
              <Button size="sm" variant="outline" className="w-full">
                <TrendingUp className="h-4 w-4 mr-1" />
                Sales
              </Button>
            </Link>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name, brand, SKU, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Desktop Filters */}
          <div className="hidden md:flex gap-2 flex-wrap">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status === "all" ? "All Status" : status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={brandFilter} onValueChange={setBrandFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Brand" />
              </SelectTrigger>
              <SelectContent>
                {brandOptions.map((brand) => (
                  <SelectItem key={brand} value={brand}>
                    {brand === "all" ? "All Brands" : brand}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat === "all" ? "All Categories" : cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-40">
                  {formatCurrency(priceRange[0], currency)} - {formatCurrency(priceRange[1], currency)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-4 pt-4">
                  <Label>Price Range</Label>
                  <Slider
                    value={priceRange}
                    onValueChange={setPriceRange}
                    max={maxSalePrice}
                    min={0}
                    step={5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>{formatCurrency(priceRange[0], currency)}</span>
                    <span> {formatCurrency(priceRange[1], currency)}</span>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Mobile Filters Dropdown */}
          {showFilters && (
            <div className="md:hidden space-y-3 border-t pt-4">
              <div className="flex items-center justify-between">
                <Label className="font-medium">Filters</Label>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowFilters(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-1 gap-3">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status === "all" ? "All Status" : status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={brandFilter} onValueChange={setBrandFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Brand" />
                  </SelectTrigger>
                  <SelectContent>
                    {brandOptions.map((brand) => (
                      <SelectItem key={brand} value={brand}>
                        {brand === "all" ? "All Brands" : brand}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat === "all" ? "All Categories" : cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="space-y-2">
                  <Label>Price Range: ${priceRange[0]} - ${priceRange[1]}</Label>
                  <Slider
                    value={priceRange}
                    onValueChange={setPriceRange}
                    max={maxSalePrice}
                    min={0}
                    step={5}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </CardHeader>

        <CardContent>
          {(selectedItems.length > 0 || selectedVariants.length > 0) && (
            <BulkActionsBar
              selectedCount={selectedItems.length}
              selectedVariantCount={selectedVariants.length}
              onAction={handleBulkAction}
              isLoading={isLoading}
            />
          )}

          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-12 w-12 rounded" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-24" />
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table className="hidden md:table min-w-full">
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={selectedItems.length === filteredShoes.length && filteredShoes.length > 0}
                onCheckedChange={handleSelectAll}
              />
            </TableHead>
            <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => handleSort("name")}>
              Product {sortBy === "name" && (sortOrder === "asc" ? "↑" : "↓")}
            </TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => handleSort("originalPrice")}>
              Original Price {sortBy === "originalPrice" && (sortOrder === "asc" ? "↑" : "↓")}
            </TableHead>
            <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => handleSort("salePrice")}>
              Sale Price {sortBy === "salePrice" && (sortOrder === "asc" ? "↑" : "↓")}
            </TableHead>
            <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => handleSort("stock")}>
              Available Units {sortBy === "stock" && (sortOrder === "asc" ? "↑" : "↓")}
            </TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedShoes.map((shoe) => (
            <React.Fragment key={shoe.id}>
              <TableRow key={shoe.id} className="hover:bg-gray-50">
                <TableCell>
                  <Checkbox
                    checked={selectedItems.includes(shoe.id)}
                    onCheckedChange={(checked) => handleSelectItem(shoe.id, checked as boolean)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleRowExpansion(shoe.id)}
                      className="p-0 h-auto"
                    >
                      {expandedRows.includes(shoe.id) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                    <Image
                      src={shoe.image || "/placeholder.svg?height=60&width=60"}
                      alt={shoe.name}
                      width={60}
                      height={60}
                      className="rounded-md object-cover border border-gray-200"
                    />
                    <div>
                      <div className="font-medium">{shoe.name}</div>
                      <div className="text-sm text-gray-500">{shoe.brand}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-sm">{shoe.sku}</TableCell>
                <TableCell>
                  <Badge variant="outline">{shoe.category || "N/A"}</Badge>
                </TableCell>
                <TableCell className="font-medium">{formatCurrency(shoe.originalPrice, currency)}</TableCell>
                <TableCell className="font-medium text-green-600">
                  {formatCurrency(shoe.salePrice, currency)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className={getTotalStock(shoe.variants) === 0 ? "text-red-600" : ""}>
                      {getTotalStock(shoe.variants)} units
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedShoe(shoe)
                        setShowSizeModal(true)
                      }}
                      className="h-6 w-6 p-0"
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell>{getStatusBadge(shoe.status)}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setProductToEdit(shoe);
                          setShowEditProductModal(true);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Product
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedShoe(shoe);
                          setShowSizeModal(true);
                        }}
                      >
                        <Package className="h-4 w-4 mr-2" />
                        Add Variants
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedShoe(shoe)
                          setShowSizeModal(true)
                        }}
                      >
                        <Package className="h-4 w-4 mr-2" />
                        Manage Variants
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedShoe(shoe)
                          setShowQRModal(true)
                        }}
                      >
                        <QrCode className="h-4 w-4 mr-2" />
                        Generate QR Code
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => handleDeleteConfirmation("product", shoe.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>

              {expandedRows.includes(shoe.id) && (
                <TableRow>
                  <TableCell colSpan={9}>
                    <div className="py-4 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-center mb-4 px-4">
                        <h4 className="font-medium">Individual Shoe Variants</h4>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const availableVariants = getAvailableVariants(shoe.variants)
                              handleSelectAllVariantsForSize(
                                availableVariants,
                                !availableVariants.every((v) => selectedVariants.includes(v.id)),
                              )
                            }}
                          >
                            {getAvailableVariants(shoe.variants).every((v) => selectedVariants.includes(v.id)) ? (
                              <>
                                <CheckSquare className="h-4 w-4 mr-2" />
                                Deselect All
                              </>
                            ) : (
                              <>
                                <Square className="h-4 w-4 mr-2" />
                                Select All Available
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedShoe(shoe)
                              setShowSizeModal(true)
                            }}
                          >
                            <Package className="h-4 w-4 mr-2" />
                            Manage Variants
                          </Button>
                        </div>
                      </div>

                      {Object.entries(getVariantsBySize(shoe.variants)).map(([size, variants]) => {
                        const sizeKey = `${shoe.id}-${size}`
                        const isCollapsed = collapsedSizes.includes(sizeKey)
                        const availableCount = variants.filter((v) => v.status === "Available").length

                        return (
                          <div key={size} className="mb-4 border rounded-lg mx-4">
                            <div
                              className="flex items-center justify-between p-4 bg-gray-100 cursor-pointer hover:bg-gray-200 transition-colors"
                              onClick={() => toggleSizeCollapse(shoe.id, size)}
                            >
                              <div className="flex items-center gap-3">
                                {isCollapsed ? (
                                  <ChevronRight className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                                <h5 className="font-medium text-lg">
                                  Size {size} ({availableCount} Available, {variants.length} Total)
                                </h5>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    const availableInSize = variants.filter((v) => v.status === "Available")
                                    handleSelectAllVariantsForSize(
                                      availableInSize,
                                      !availableInSize.every((v) => selectedVariants.includes(v.id)),
                                    )
                                  }}
                                >
                                  {variants
                                    .filter((v) => v.status === "Available")
                                    .every((v) => selectedVariants.includes(v.id)) ? (
                                    <>
                                      <CheckSquare className="h-3 w-3 mr-1" />
                                      Deselect
                                    </>
                                  ) : (
                                    <>
                                      <Square className="h-3 w-3 mr-1" />
                                      Select All
                                    </>
                                  )}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    const sizeVariants = variants.filter((v) => v.status === "Available")
                                    setSelectedVariants([
                                      ...selectedVariants,
                                      ...sizeVariants
                                        .map((v) => v.id)
                                        .filter((id) => !selectedVariants.includes(id)),
                                    ])
                                    setShowPrintPreview(true)
                                  }}
                                >
                                  <QrCode className="h-3 w-3 mr-1" />
                                  Print Size QR
                                </Button>
                              </div>
                            </div>

                            {!isCollapsed && (
                              <div className="p-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                  {variants.map((variant) => (
                                    <div
                                      key={variant.id}
                                      className={`border rounded-lg p-3 transition-all ${
                                        selectedVariants.includes(variant.id)
                                          ? "border-blue-500 bg-blue-50"
                                          : variant.status === "Available"
                                            ? "bg-white hover:shadow-md border-gray-200"
                                            : "bg-gray-50 border-gray-200"
                                      }`}
                                    >
                                      <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                          <Checkbox
                                            checked={selectedVariants.includes(variant.id)}
                                            onCheckedChange={(checked) =>
                                               // @ts-ignore
                                              handleSelectVariant(variant.id, checked)
                                            }
                                          />
                                          <div>
                                            <div className="font-medium text-sm">
                                              #{variant.id.split("-").pop()}
                                            </div>
                                            <div className="text-xs text-gray-500 font-mono">
                                              {variant.variantSku}
                                            </div>
                                          </div>
                                        </div>
                                        <div className="flex gap-1">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-5 w-5 p-0"
                                            onClick={() => {
                                              setSelectedShoe({ ...shoe, selectedVariant: variant })
                                              setShowQRModal(true)
                                            }}
                                          >
                                            <QrCode className="h-3 w-3" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-5 w-5 p-0"
                                            onClick={() => handleEditVariant(variant.id, variant)}
                                          >
                                            <Edit className="h-3 w-3" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-5 w-5 p-0 text-red-500 hover:bg-red-50"
                                            onClick={() => handleDeleteConfirmation("variant", variant.id)}
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </div>

                                      {editingVariant === variant.id ? (
                                        <div className="space-y-3">
                                          <div>
                                            <Label htmlFor="status" className="text-xs">
                                              Status
                                            </Label>
                                            <select
                                              id="status"
                                              value={editValues.status || variant.status}
                                              onChange={(e) =>
                                                setEditValues({ ...editValues, status: e.target.value })
                                              }
                                              className="w-full text-xs border rounded px-2 py-1"
                                            >
                                              <option value="Available">Available</option>
                                              <option value="In Display">In Display</option>
                                              <option value="Used">Used</option>
                                              <option value="Sold">Sold</option>
                                            </select>
                                          </div>
                                          <div>
                                            <Label htmlFor="location" className="text-xs">
                                              Location
                                            </Label>
                                            <Select
                                              value={editValues.location || variant.location}
                                              onValueChange={(value) => {
                                                if (value === "add-custom-location") {
                                                  setShowCustomLocationInput(true)
                                                  setEditValues((prev: any) => ({ ...prev, location: undefined }))
                                                } else {
                                                  setShowCustomLocationInput(false)
                                                  setEditValues((prev: any) => ({ ...prev, location: value }))
                                                }
                                              }}
                                              disabled={isLoading || isAddingLocation}
                                            >
                                              <SelectTrigger id="location" className="w-full text-xs">
                                                <SelectValue placeholder="Select location or add new" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="Warehouse A">Warehouse A</SelectItem>
                                                <SelectItem value="Warehouse B">Warehouse B</SelectItem>
                                                {customLocations.map((loc) => (
                                                  <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                                                ))}
                                                <SelectItem value="add-custom-location">
                                                  Add Custom Location...
                                                </SelectItem>
                                              </SelectContent>
                                            </Select>
                                            {showCustomLocationInput && editingVariant === variant.id && (
                                              <div className="flex gap-2 mt-2">
                                                <Input
                                                  id="newCustomLocationName"
                                                  placeholder="Enter new location name"
                                                  value={newCustomLocationName}
                                                  onChange={(e) => setNewCustomLocationName(e.target.value)}
                                                  className="text-xs flex-1"
                                                  disabled={isAddingLocation}
                                                />
                                                <Button
                                                  type="button"
                                                  onClick={handleAddCustomLocation}
                                                  size="sm"
                                                  className="h-8"
                                                  disabled={isAddingLocation}
                                                >
                                                  {isAddingLocation ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                  ) : (
                                                    <Plus className="h-4 w-4" />
                                                  )}
                                                </Button>
                                              </div>
                                            )}
                                          </div>
                                          <div>
                                            <Label htmlFor="costPrice" className="text-xs">
                                              Cost Price ({currencySymbol})
                                            </Label>
                                            <Input
                                              id="costPrice"
                                              type="number"
                                              step="0.01"
                                              value={editValues.costPrice}
                                              onChange={(e) =>
                                                setEditValues({
                                                  ...editValues,
                                                  costPrice: Number(e.target.value),
                                                })
                                              }
                                              className="text-xs"
                                            />
                                          </div>
                                          <div className="flex gap-1">
                                            <Button size="sm" onClick={handleSaveVariant} className="text-xs h-6">
                                              <Save className="h-3 w-3 mr-1" />
                                              Save
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={handleCancelEdit}
                                              className="text-xs h-6"
                                            >
                                              Cancel
                                            </Button>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="space-y-1">
                                          <div className="flex justify-between items-center">
                                            <span className="text-xs text-gray-600">Status:</span>
                                            {getVariantStatusBadge(variant.status)}
                                          </div>
                                          <div className="flex justify-between items-center">
                                            <span className="text-xs text-gray-600">Location:</span>
                                            <span className="text-xs font-medium">{variant.location}</span>
                                          </div>
                                          <div className="flex justify-between items-center">
                                            <span className="text-xs text-gray-600">Serial:</span>
                                            <span className="text-xs font-mono">{variant.serialNumber}</span>
                                          </div>
                                          <div className="flex justify-between items-center">
                                            <span className="text-xs text-gray-600">Cost:</span>
                                            <span className="text-xs font-medium">
                                              {currencySymbol}
                                              {(variant.costPrice ?? variant.productOriginalPrice ?? 0).toFixed(2)}
                                            </span>
                                          </div>
                                          <div className="flex justify-between items-center">
                                            <span className="text-xs text-gray-600">Added:</span>
                                            <span className="text-xs">{variant.dateAdded}</span>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>

      <div className="md:hidden space-y-4 p-4">
      {paginatedShoes.map((shoe) => (
      {/* Pagination Controls for products */}
      {filteredShoes.length > 50 && (
        <div className="flex flex-wrap justify-center items-center gap-2 my-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setProductPage((p) => Math.max(1, p - 1))}
            disabled={productPage === 1}
            aria-label="Previous page"
          >
            Previous
          </Button>
          <span className="text-sm">
            Page {productPage} of {totalProductPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setProductPage((p) => Math.min(totalProductPages, p + 1))}
            disabled={productPage === totalProductPages}
            aria-label="Next page"
          >
            Next
          </Button>
        </div>
      )}
  <div key={shoe.id} className="border rounded-lg p-4 bg-white shadow-sm"> {/* Card Start */}
    <div className="flex items-center justify-between mb-2"> {/* Header Start */}
      <div className="flex items-center gap-2"> {/* Checkbox/Image/Name Start */}
        <Checkbox
          checked={selectedItems.includes(shoe.id)}
          onCheckedChange={(checked) => handleSelectItem(shoe.id, checked as boolean)}
        />
        <Image
          src={shoe.image || "/placeholder.svg?height=60&width=60"}
          alt={shoe.name}
          width={60}
          height={60}
          className="rounded-md object-cover border border-gray-200"
        />
        <div> {/* Name/Brand Start */}
          <div className="font-medium">{shoe.name}</div>
          <div className="text-sm text-gray-500">{shoe.brand}</div>
        </div> {/* Name/Brand End */}
      </div> {/* Checkbox/Image/Name End */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => toggleRowExpansion(shoe.id)}
        className="p-0 h-auto"
      >
        {expandedRows.includes(shoe.id) ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </Button>
    </div> {/* Header End */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm"> {/* Details Grid Start */}
      <div> {/* SKU Start */}
        <span className="text-gray-500">SKU:</span>
        <span className="font-mono ml-1">{shoe.sku}</span>
      </div> {/* SKU End */}
      <div> {/* Category Start */}
        <span className="text-gray-500">Category:</span>
        <Badge variant="outline" className="ml-1">{shoe.category || "N/A"}</Badge>
      </div> {/* Category End */}
      <div> {/* Original Price Start */}
        <span className="text-gray-500">Original:</span>
        <span className="ml-1">{formatCurrency(shoe.originalPrice, currency)}</span>
      </div> {/* Original Price End */}
      <div> {/* Sale Price Start */}
        <span className="text-gray-500">Sale:</span>
        <span className="ml-1 text-green-600">{formatCurrency(shoe.salePrice, currency)}</span>
      </div> {/* Sale Price End */}
      <div> {/* Stock Start */}
        <span className="text-gray-500">Stock:</span>
        <span className={`ml-1 ${getTotalStock(shoe.variants) === 0 ? "text-red-600" : ""}`}>
          {getTotalStock(shoe.variants)} units
        </span>
      </div> {/* Stock End */}
      <div> {/* Status Start */}
        <span className="text-gray-500">Status:</span>
        <span className="ml-1">{getStatusBadge(shoe.status)}</span>
      </div> {/* Status End */}
    </div> {/* Details Grid End */}
    <div className="flex justify-end gap-2 mt-2"> {/* Actions Start */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setSelectedShoe(shoe);
          setShowSizeModal(true);
        }}
      >
        <Eye className="h-3 w-3 mr-1" />
        View Sizes
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => {
              setProductToEdit(shoe);
              setShowEditProductModal(true);
            }}
          >
            <Edit className="h-4 w-4 mr-2" />
            Add Variants
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setSelectedShoe(shoe);
              setShowSizeModal(true);
            }}
          >
            <Package className="h-4 w-4 mr-2" />
            Manage Variants
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              setSelectedShoe(shoe);
              setShowQRModal(true);
            }}
          >
            <QrCode className="h-4 w-4 mr-2" />
            Generate QR Code
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-red-600"
            onClick={() => handleDeleteConfirmation("product", shoe.id)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div> {/* Actions End */}
   {expandedRows.includes(shoe.id) && (
  <div className="mt-4 border-t pt-4"> {/* Variants Section Start */}
    <div className="flex justify-between items-center mb-2"> {/* Variants Header Start */}
      <h5 className="font-medium">Variants</h5>
      <div className="flex gap-2"> {/* Header Actions Start */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const availableVariants = getAvailableVariants(shoe.variants);
            handleSelectAllVariantsForSize(
              availableVariants,
              !availableVariants.every((v) => selectedVariants.includes(v.id))
            );
          }}
        >
          {getAvailableVariants(shoe.variants).every((v) => selectedVariants.includes(v.id)) ? (
            <>
              <CheckSquare className="h-3 w-3 mr-1" />
              Deselect
            </>
          ) : (
            <>
              <Square className="h-3 w-3 mr-1" />
              Select All
            </>
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSelectedShoe(shoe);
            setShowSizeModal(true);
          }}
        >
          <Package className="h-3 w-3 mr-1" />
          Manage
        </Button>
      </div> {/* Header Actions End */}
    </div> {/* Variants Header End */}
    {Object.entries(getVariantsBySize(shoe.variants)).map(([size, variants]) => {
      const sizeKey = `${shoe.id}-${size}`;
      const isCollapsed = collapsedSizes.includes(sizeKey);
      const availableCount = variants.filter((v: any) => v.status === "Available").length;

      return (
        <div key={size} className="mb-3 border rounded-lg"> {/* Size Group Start */}
          <div
            className="flex items-center justify-between p-3 bg-gray-100 cursor-pointer hover:bg-gray-200"
            onClick={() => toggleSizeCollapse(shoe.id, size)}
          > {/* Size Header Start */}
            <div className="flex items-center gap-2"> {/* Size Info Start */}
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              <h5 className="font-medium">
                Size {size} ({availableCount}/{variants.length})
              </h5>
            </div> {/* Size Info End */}
            <div className="flex gap-2"> {/* Size Actions Start */}
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  const availableInSize = variants.filter((v: any) => v.status === "Available");
                  handleSelectAllVariantsForSize(
                    availableInSize,
                    !availableInSize.every((v: any) => selectedVariants.includes(v.id))
                  );
                }}
              >
                {variants
                  .filter((v: any) => v.status === "Available")
                  .every((v: any) => selectedVariants.includes(v.id)) ? (
                  <CheckSquare className="h-3 w-3" />
                ) : (
                  <Square className="h-3 w-3" />
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  const sizeVariants = variants.filter((v: any) => v.status === "Available");
                  setSelectedVariants([
                    ...selectedVariants,
                    ...sizeVariants
                      .map((v: any) => v.id)
                      .filter((id) => !selectedVariants.includes(id))
                  ]);
                  setShowPrintPreview(true);
                }}
              >
                <QrCode className="h-3 w-3" />
              </Button>
            </div> {/* Size Actions End */}
          </div> {/* Size Header End */}
          {!isCollapsed && (
            <div className="p-3 space-y-2"> {/* Variants List Start */}
              {variants.map((variant: any) => (
                <div
                  key={variant.id}
                  className={`border rounded p-2 ${
                    selectedVariants.includes(variant.id) ? "border-blue-500 bg-blue-50" : "bg-white"
                  }`}
                > {/* Variant Item Start */}
                  <div className="flex justify-between items-center"> {/* Variant Header Start */}
                    <div className="flex items-center gap-2"> {/* Variant Info Start */}
                      <Checkbox
                        checked={selectedVariants.includes(variant.id)}
                        onCheckedChange={(checked) =>
                          handleSelectVariant(variant.id, checked as boolean)
                        }
                      />
                      <div> {/* Variant Details Start */}
                        <div className="text-sm font-medium">#{variant.id.split("-").pop()}</div>
                        <div className="text-xs text-gray-500">{variant.variantSku || "N/A"}</div>
                      </div> {/* Variant Details End */}
                    </div> {/* Variant Info End */}
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0"
                        onClick={() => {
                          setSelectedShoe({ ...shoe, selectedVariant: variant });
                          setShowQRModal(true);
                        }}
                      >
                        <QrCode className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0"
                        onClick={() => handleEditVariant(variant.id, variant)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 text-red-600 hover:bg-red-50"
                        onClick={() => handleDeleteConfirmation("variant", variant.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div> 
                  {editingVariant === variant.id ? (
                    <div className="mt-2 space-y-2"> 
                      <div>
                        <Label htmlFor={`status-${variant.id}`} className="text-xs">Status</Label>
                        <select
                          id={`status-${variant.id}`}
                          value={editValues.status || variant.status}
                          onChange={(e) => setEditValues({ ...editValues, status: e.target.value })}
                          className="w-full text-xs border rounded px-2 py-1"
                        >
                          <option value="Available">Available</option>
                          <option value="In Display">In Display</option>
                          <option value="Used">Used</option>
                          <option value="Sold">Sold</option>
                        </select>
                      </div> 
                      <div> 
                        <Label htmlFor={`location-${variant.id}`} className="text-xs">Location</Label>
                        <Select
                          value={editValues.location || variant.location}
                          onValueChange={(value) => {
                            if (value === "add-custom-location") {
                              setShowCustomLocationInput(true);
                              setEditValues((prev: any) => ({ ...prev, location: undefined }));
                            } else {
                              setShowCustomLocationInput(false);
                              setEditValues((prev: any) => ({ ...prev, location: value }));
                            }
                          }}
                          disabled={isLoading || isAddingLocation}
                        >
                          <SelectTrigger id={`location-${variant.id}`} className="w-full text-xs">
                            <SelectValue placeholder="Select location" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Warehouse A">Warehouse A</SelectItem>
                            <SelectItem value="Warehouse B">Warehouse B</SelectItem>
                            {customLocations.map((loc) => (
                              <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                            ))}
                            <SelectItem value="add-custom-location">Add Custom Location...</SelectItem>
                          </SelectContent>
                        </Select>
                        {showCustomLocationInput && editingVariant === variant.id && (
                          <div className="flex gap-2 mt-2"> 
                            <Input
                              id="newCustomLocationName"
                              placeholder="Enter new location name"
                              value={newCustomLocationName}
                              onChange={(e) => setNewCustomLocationName(e.target.value)}
                              className="text-xs flex-1"
                              disabled={isLoading || isAddingLocation}
                            />
                            <Button
                              type="button"
                              onClick={handleAddCustomLocation}
                              size="sm"
                              className="h-8"
                              disabled={isLoading || isAddingLocation}
                            >
                              {isAddingLocation ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Plus className="h-4 w-4" />
                              )}
                            </Button>
                          </div> 
                        )}
                      </div>
                      <div> 
                        <Label htmlFor={`costPrice-${variant.id}`} className="text-xs">
                          Cost Price ({currencySymbol})
                        </Label>
                        <Input
                          id={`costPrice-${variant.id}`}
                          type="number"
                          step="0.01"
                          value={editValues.costPrice ?? (variant.costPrice || 0)}
                          onChange={(e) =>
                            setEditValues({
                              ...editValues,
                              costPrice: Number(e.target.value),
                            })
                          }
                          className="text-xs"
                        />
                      </div> 
                      <div className="flex gap-1"> 
                        <Button size="sm" onClick={handleSaveVariant} className="text-xs h-6">
                          <Save className="h-3 w-3 mr-1" />
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelEdit}
                          className="text-xs h-6"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div> 
                  ) : (
                    <div className="mt-2 space-y-1 text-xs"> 
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        {getVariantStatusBadge(variant.status)}
                      </div> 
                      <div className="flex justify-between"> 
                        <span className="text-gray-600">Location:</span>
                        <span className="font-medium">{variant.location || "N/A"}</span>
                      </div> 
                      <div className="flex justify-between"> 
                        <span className="text-gray-600">Serial:</span>
                        <span className="font-mono">{variant.serialNumber || "N/A"}</span>
                      </div> 
                      <div className="flex justify-between">
                        <span className="text-gray-600">Cost:</span>
                        <span className="font-medium">
                          {currencySymbol}
                          {(variant.costPrice ?? variant.productOriginalPrice ?? 0).toFixed(2)}
                        </span>
                      </div> 
                      <div className="flex justify-between"> 
                        <span className="text-gray-600">Added:</span>
                        <span>{variant.dateAdded || "N/A"}</span>
                      </div>
                    </div> 
                  )}
                </div> 
              ))}
            </div> 
          )}
        </div> 
      );
    })}
  </div> 
)}
  </div> 
))}
      </div>

      {/* Pagination Controls for products (after both desktop and mobile lists) */}
      {filteredShoes.length > 50 && (
        <div className="flex flex-wrap justify-center items-center gap-2 my-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setProductPage((p) => Math.max(1, p - 1))}
            disabled={productPage === 1}
            aria-label="Previous page"
          >
            Previous
          </Button>
          <span className="text-sm">
            Page {productPage} of {totalProductPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setProductPage((p) => Math.min(totalProductPages, p + 1))}
            disabled={productPage === totalProductPages}
            aria-label="Next page"
          >
            Next
          </Button>
        </div>
      )}
  
      </div>
          )}

          {filteredShoes.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
              <p className="text-gray-500">Try adjusting your search or filter criteria</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <SizeModal shoe={selectedShoe} open={showSizeModal} onOpenChange={setShowSizeModal} refreshData={refreshData} />

      <QRCodeModal shoe={selectedShoe} open={showQRModal} onOpenChange={setShowQRModal} />

      <PrintPreview
        selectedItems={selectedItems}
        selectedVariants={selectedVariants}
        shoes={shoesData}
        open={showPrintPreview}
        onOpenChange={setShowPrintPreview}
      />
      <ConfirmationModal
        open={showDeleteConfirmationModal}
        onOpenChange={setShowDeleteConfirmationModal}
        title={
          itemToDelete
            ? itemToDelete.type === "product"
              ? `Archive Product: ${selectedShoe?.name}?`
              : itemToDelete.type === "variant"
                ? `Archive Individual Shoe: #${String(itemToDelete.id)?.split("-").pop() ?? "Unknown Variant"}?`
                : itemToDelete.type === "bulk-products"
                  ? `Archive ${itemToDelete.ids?.length ?? 0} Selected Products?`
                  : `Archive ${itemToDelete.ids?.length ?? 0} Selected Individual Shoes?`
            : "Confirm Deletion" // Default title if itemToDelete is null
        }
        description={
          itemToDelete
            ? itemToDelete.type === "product"
              ? "This action will archive the product and all its associated variants."
              : itemToDelete.type === "variant"
                ? "This will archive this individual shoe variant."
                : itemToDelete.type === "bulk-products"
                  ? "This will archive all selected products and their associated variants."
                  : "This will  archive all selected individual shoe variants."
            : "Are you sure you want to delete the selected item(s)?" // Default description
        }
        onConfirm={executeDelete}
        isConfirming={isDeleting}
      />
      <ImportModal open={showImportModal} onOpenChange={setShowImportModal} refreshData={refreshData} />
      {showEditProductModal && productToEdit && (
        <EditProductModal
          open={showEditProductModal}
          onOpenChange={setShowEditProductModal}
          product={productToEdit}
          onProductUpdated={async () => {
            setShowEditProductModal(false);
            setProductToEdit(null);
            await refreshData();
          }}
        />
      )}


       {/* QR Scanner Modal */}
     {showQRScanner && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
    <div className="bg-white rounded-lg p-6 shadow-lg relative w-full max-w-md mx-4">
      <button
        className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-2xl leading-none"
        onClick={handleCloseScanner}
      >
        ×
      </button>
      
      <h2 className="text-lg font-bold mb-4">Scan QR Code</h2>
      
      {/* Scanner Container */}
      <div
        id="qr-reader"
        className="w-full rounded mb-4 overflow-hidden bg-gray-100"
        style={{ minHeight: '300px' }}
      />
      
      {/* Debug Info */}
      <div className="text-xs text-gray-600 mb-2 space-y-1">
        <div>Scanning: {isScanning ? "✅ Yes" : "❌ No"}</div>
      
    
        <div>Data: {data ? `"${data.substring(0, 30)}..."` : "None"}</div>
      </div>
      
      
      
      {qrError && (
        <p className="text-red-500 text-sm mb-2 text-center">
          ❌ Error accessing camera
        </p>
      )}
      
      {data && (
        <p className="text-green-600 text-sm mb-2 text-center">
          ✅ Scanned: {data.substring(0, 30)}...
        </p>
      )}
      
      <Button onClick={handleCloseScanner} className="w-full">
        Close Scanner
      </Button>
    </div>
  </div>
)}
    
    </div>
  )
}
