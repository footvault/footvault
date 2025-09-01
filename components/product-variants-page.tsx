"use client"

import React, { useMemo, useState, useEffect } from "react"
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type ColumnFiltersState,
} from "@tanstack/react-table"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Search, 
  Filter, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  QrCode, 
  ArrowUpDown,
  ArrowLeft,
  Plus 
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Variant, Product } from "@/lib/types"
import Image from "next/image"
import { EditVariantModal } from "@/components/edit-variant-modal"
import { ConfirmationModal } from "@/components/confirmation-modal"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import Link from "next/link"
import { VariantsStatsCard } from "@/components/variants-stats-card"

interface ProductVariantsPageProps {
  productId: string;
}

const columnHelper = createColumnHelper<Variant>()

// Add Variants Modal Component
interface AddVariantsModalProps {
  open: boolean;
  product?: Product;
  onOpenChange: (open: boolean) => void;
  onVariantsAdded: () => void;
  sizeOptionsByCategory: Record<string, (string | number)[]>;
}

function AddVariantsModal({ 
  open, 
  product, 
  onOpenChange, 
  onVariantsAdded,
  sizeOptionsByCategory 
}: AddVariantsModalProps) {
  const [selectedSizes, setSelectedSizes] = useState<(string | number)[]>([]);
  const [quantity, setQuantity] = useState<number>(1);
  const [status, setStatus] = useState<string>("Available");
  const [location, setLocation] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sizeSearch, setSizeSearch] = useState("");
  
  // For size label (editable)
  const [sizeLabel, setSizeLabel] = useState("US");
  
  // For location management
  const [customLocations, setCustomLocations] = useState<string[]>([]);
  const [showAddLocationInput, setShowAddLocationInput] = useState(false);
  const [newLocation, setNewLocation] = useState("");
  
  const supabase = createClient();

  // Fetch custom locations
  useEffect(() => {
    if (!open) return;
    
    const fetchLocations = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data, error } = await supabase
        .from("custom_locations")
        .select("name")
        .eq("user_id", user.id);
        
      let locs = (data || []).map((row: any) => row.name);
      // Add default locations if not present
      ["Warehouse A", "Warehouse B", "Warehouse C"].forEach(defaultLoc => {
        if (!locs.includes(defaultLoc)) locs.push(defaultLoc);
      });
      setCustomLocations(locs);
    };
    
    fetchLocations();
  }, [open, supabase]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!open) {
      setSelectedSizes([]);
      setQuantity(1);
      setStatus("Available");
      setLocation("");
      setSizeSearch("");
      setSizeLabel("US");
      setShowAddLocationInput(false);
      setNewLocation("");
    }
  }, [open, product]);

  // Helper function to generate dynamic size options
  const getDynamicSizes = (sizeCategory: string, sizeLabel: string): string[] => {
    const sizes: string[] = []
    if (!sizeCategory || !sizeLabel) return []

    const generateRange = (start: number, end: number, step: number) => {
      for (let i = start; i <= end; i += step) {
        sizes.push(i.toString())
        if (step === 0.5 && i + 0.5 <= end) {
          sizes.push((i + 0.5).toString())
        }
      }
    }

    switch (sizeCategory) {
      case "Men's":
      case "Unisex":
        if (sizeLabel === "US") generateRange(3, 15, 0.5)
        else if (sizeLabel === "UK") generateRange(2.5, 14.5, 0.5)
        else if (sizeLabel === "EU") generateRange(35, 49, 0.5)
        else if (sizeLabel === "CM") generateRange(22, 33, 0.5)
        break
      case "Women's":
        if (sizeLabel === "US") generateRange(4, 12, 0.5)
        else if (sizeLabel === "UK") generateRange(2, 10, 0.5)
        else if (sizeLabel === "EU") generateRange(34, 44, 0.5)
        else if (sizeLabel === "CM") generateRange(21, 29, 0.5)
        break
      case "Youth":
        if (sizeLabel === "US" || sizeLabel === "YC") generateRange(1, 7, 0.5)
        else if (sizeLabel === "UK") generateRange(13.5, 6.5, 0.5)
        else if (sizeLabel === "EU") generateRange(31, 40, 0.5)
        else if (sizeLabel === "CM") generateRange(19, 25, 0.5)
        break
      case "Toddlers":
        if (sizeLabel === "US" || sizeLabel === "TD") generateRange(1, 10, 0.5)
        else if (sizeLabel === "UK") generateRange(0.5, 9.5, 0.5)
        else if (sizeLabel === "EU") generateRange(16, 27, 0.5)
        else if (sizeLabel === "CM") generateRange(8, 16, 0.5)
        break
    }
    
    return Array.from(new Set(sizes)).sort((a, b) => Number.parseFloat(a) - Number.parseFloat(b))
  }

  const handleAddLocation = async () => {
    if (!newLocation.trim()) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("custom_locations")
        .insert({ name: newLocation.trim(), user_id: user.id });

      if (!error) {
        setCustomLocations(prev => [...prev, newLocation.trim()]);
        setLocation(newLocation.trim());
        setNewLocation("");
        setShowAddLocationInput(false);
      }
    } catch (error) {
      console.error('Error adding location:', error);
    }
  };

  const handleSubmit = async () => {
    if (!product || selectedSizes.length === 0 || !location) return;
    
    console.log('🚀 Starting variant creation process...');
    console.log('📝 Form data:', {
      productId: product.id,
      productName: product.name,
      selectedSizes,
      quantity,
      status,
      location,
      sizeLabel
    });
    
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
   

      // Get the highest serial_number for this user to continue numbering
      console.log('🔍 Fetching highest serial number...');
      const { data: maxSerialData, error: serialError } = await supabase
        .from("variants")
        .select("serial_number")
        .eq("user_id", user.id)
        .order("serial_number", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (serialError) {
        console.error('❌ Error fetching serial number:', serialError);
      } else {
        console.log('📊 Max serial data:', maxSerialData);
      }

      let nextSerial = 1;
      if (maxSerialData && maxSerialData.serial_number) {
        const last = parseInt(maxSerialData.serial_number, 10);
        nextSerial = isNaN(last) ? 1 : last + 1;
      }
      
      console.log('🔢 Next serial number will start at:', nextSerial);

      // Create variants for each selected size
      const variantsToCreate = [];
      
      for (const size of selectedSizes) {
        // Create multiple variants based on quantity
        for (let i = 0; i < quantity; i++) {
          const variant = {
            id: crypto.randomUUID(), // Generate UUID for the id field
            product_id: product.id,
            size: size,
            status: status,
            location: location,
            serial_number: nextSerial++,
            user_id: user.id,
            date_added: new Date().toISOString().slice(0, 10), // YYYY-MM-DD
            variant_sku: `${product.sku || 'SKU'}-${size}-${nextSerial - 1}`, // Generate variant SKU
            cost_price: product.original_price || 0.00, // Set cost_price from product's original_price
            size_label: sizeLabel, // Add size_label field
          };
          variantsToCreate.push(variant);
        }
      }
      
      console.log('📦 Variants to create:', variantsToCreate);
      console.log('🎯 Total variants to create:', variantsToCreate.length);

      const { error } = await supabase
        .from('variants')
        .insert(variantsToCreate);

      if (error) {
        console.error('❌ Supabase error details:', error);
        console.error('❌ Error code:', error.code);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error details:', error.details);
        console.error('❌ Error hint:', error.hint);
        alert(`Error creating variants: ${error.message}`);
        return;
      }

      console.log('✅ Variants created successfully!');
      
      // Success
      onVariantsAdded();
      onOpenChange(false);
      
    } catch (error) {
      console.error('💥 Unexpected error:', error);
      console.error('💥 Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      alert(`Error creating variants: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
      console.log('🏁 Variant creation process completed');
    }
  };

  if (!product) return null;

  // Get dynamic sizes based on product's category and selected size label
  const productSizeCategory = product.size_category || "Men's";
  const dynamicSizes = getDynamicSizes(productSizeCategory, sizeLabel);
  const availableSizes = sizeOptionsByCategory[productSizeCategory] || [];
  const allAvailableSizes = [...new Set([...availableSizes, ...dynamicSizes])];
  
  const filteredSizes = allAvailableSizes.filter(size => 
    sizeSearch === "" || String(size).toLowerCase().includes(sizeSearch.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Variants</DialogTitle>
          <DialogDescription>
            Add new variants for {product.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Size Category (Non-editable) */}
          <div className="space-y-2">
            <Label>Size Category</Label>
            <Input 
              value={productSizeCategory} 
              disabled 
              className="bg-muted text-muted-foreground"
            />
          </div>

          {/* Size Label (Editable) */}
          <div className="space-y-2">
            <Label>Size Label</Label>
            <Select value={sizeLabel} onValueChange={setSizeLabel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="US">US</SelectItem>
                <SelectItem value="UK">UK</SelectItem>
                <SelectItem value="EU">EU</SelectItem>
                <SelectItem value="CM">CM</SelectItem>
                <SelectItem value="YC">YC</SelectItem>
                <SelectItem value="TD">TD</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Size Selection */}
          <div className="space-y-2">
            <Label>Select Sizes</Label>
            <div className="border rounded-md p-2 max-h-40 overflow-y-auto">
              <Input
                placeholder="Search sizes..."
                value={sizeSearch}
                onChange={(e) => setSizeSearch(e.target.value)}
                className="mb-2"
              />
              <div className="space-y-1">
                {filteredSizes.map((size) => (
                  <div key={size} className="flex items-center space-x-2">
                    <Checkbox
                      id={`size-${size}`}
                      checked={selectedSizes.includes(size)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedSizes(prev => [...prev, size]);
                        } else {
                          setSelectedSizes(prev => prev.filter(s => s !== size));
                        }
                      }}
                    />
                    <Label htmlFor={`size-${size}`} className="text-sm cursor-pointer">
                      {size}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            {selectedSizes.length > 0 && (
              <div className="text-sm text-muted-foreground">
                Selected: {selectedSizes.join(", ")}
              </div>
            )}
          </div>

          {/* Location Selection */}
          <div className="space-y-2">
            <Label>Location *</Label>
            
            {showAddLocationInput ? (
              <div className="flex gap-2">
                <Input
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="Enter new location"
                  className="h-9"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddLocation}
                  disabled={!newLocation.trim()}
                >
                  Add
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowAddLocationInput(false);
                    setNewLocation("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Select value={location} onValueChange={setLocation}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {customLocations.map((loc) => (
                      <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddLocationInput(true)}
                >
                  Add New
                </Button>
              </div>
            )}
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label>Quantity per Size</Label>
            <Input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full"
            />
            <div className="text-sm text-muted-foreground">
              Total variants: {selectedSizes.length * quantity}
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Available">Available</SelectItem>
                <SelectItem value="PullOut">PullOut</SelectItem>
                <SelectItem value="Reserved">Reserved</SelectItem>
                <SelectItem value="PreOrder">PreOrder</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || selectedSizes.length === 0 || !location}
          >
            {isSubmitting ? "Creating..." : `Add ${selectedSizes.length * quantity} Variants`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ProductVariantsPage({ productId }: ProductVariantsPageProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "serial_number", desc: true } // Start with largest serial number first
  ])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState("")
  const [variants, setVariants] = useState<Variant[]>([])
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [editModal, setEditModal] = useState<{ open: boolean, variant?: Variant }>({ open: false })
  const [deleteModal, setDeleteModal] = useState<{ open: boolean, variant?: Variant }>({ open: false })
  const [addVariantsModal, setAddVariantsModal] = useState<{ open: boolean, product?: Product }>({ open: false })

  // Filter states
  const [locationFilter, setLocationFilter] = useState<string>("all")
  const [sizeFilter, setSizeFilter] = useState<string[]>([]) // Multi-select for sizes
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [sizeSearch, setSizeSearch] = useState("")
  const [showFiltersModal, setShowFiltersModal] = useState(false)

  // Responsive design
  const [screenWidth, setScreenWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1400);
  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isDesktop = screenWidth >= 1380;
  const isMobile = screenWidth < 640;

  const supabase = createClient()

  const fetchData = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch product details
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .eq('user_id', user.id)
        .single()

      if (productError) {
        console.error('Error fetching product:', productError)
      } else {
        setProduct(productData)
      }

      // Fetch variants for this product
      const { data: variantsData, error: variantsError } = await supabase
        .from('variants')
        .select(`
          *,
          product:products (
            id,
            name,
            brand,
            sku,
            category,
            original_price,
            sale_price,
            status,
            image,
            size_category,
            user_id,
            isArchived
          )
        `)
        .eq('product_id', productId)
        .eq('user_id', user.id)
        .eq('isArchived', false)
        .order('serial_number', { ascending: false })

      if (variantsError) {
        console.error('Error fetching variants:', variantsError)
      } else {
        console.log('Variants loaded:', variantsData?.length, 'variants')
        setVariants(variantsData || [])
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [productId])

  // Compute unique filter options
  const locationOptions = useMemo(() => {
    const set = new Set<string>()
    variants.forEach(v => { if (v.location) set.add(v.location) })
    return ["all", ...Array.from(set)]
  }, [variants])

  const sizeOptions = useMemo(() => {
    const set = new Set<string>()
    variants.forEach(v => { if (v.size) set.add(String(v.size)) })
    const sorted = Array.from(set).sort((a, b) => {
      const na = Number(a), nb = Number(b);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return a.localeCompare(b);
    })
    return sorted
  }, [variants])

  const statusOptions = ["all", "Available", "Reserved", "PullOut", "PreOrder", "Sold"]

  // Compute size options grouped by size category for the AddVariantsModal
  const sizeOptionsByCategory = useMemo(() => {
    if (!product?.size_category) return {};
    
    const map: Record<string, Set<string>> = {};
    map[product.size_category] = new Set();
    
    variants.forEach(v => {
      if (v.size) map[product.size_category].add(String(v.size));
    });
    
    // Convert sets to sorted arrays
    const result: Record<string, string[]> = {};
    Object.entries(map).forEach(([cat, sizes]) => {
      result[cat] = Array.from(sizes).sort((a, b) => {
        const na = Number(a), nb = Number(b);
        if (!isNaN(na) && !isNaN(nb)) return na - nb;
        return a.localeCompare(b);
      });
    });
    
    return result;
  }, [variants, product])

  // Filtered variants
  const filteredVariants = useMemo(() => {
    let result = variants.filter(v => {
      const locationMatch = locationFilter === "all" || v.location === locationFilter
      const sizeMatch = sizeFilter.length === 0 || sizeFilter.includes(String(v.size))
      const statusMatch = statusFilter === "all" || v.status === statusFilter
      
      return locationMatch && sizeMatch && statusMatch
    })

    // Global search: serial number, size, location
    if (globalFilter.trim() !== "") {
      const search = globalFilter.trim().toLowerCase()
      result = result.filter(v => {
        const serial = String((v as any).serial_number ?? "").toLowerCase()
        const size = String(v.size ?? "").toLowerCase()
        const location = String(v.location ?? "").toLowerCase()
        const variantSku = String(v.variant_sku ?? "").toLowerCase()
        return serial.includes(search) || size.includes(search) || location.includes(search) || variantSku.includes(search)
      })
    }
    
    return result
  }, [variants, locationFilter, sizeFilter, statusFilter, globalFilter])

  // Calculate stats for all variants (not just filtered ones)
  const stats = useMemo(() => {
    const totalVariants = variants.length;
    const totalCostValue = variants.reduce((sum, variant) => {
      const cost = variant.cost_price || product?.original_price || 0;
      return sum + cost;
    }, 0);
    const totalSaleValue = variants.reduce((sum, variant) => {
      const price = product?.sale_price || 0;
      return sum + price;
    }, 0);
    const profit = totalSaleValue - totalCostValue;
    
    return {
      totalVariants,
      totalCostValue,
      totalSaleValue,
      profit
    };
  }, [variants, product]);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const allVisibleIds = useMemo(() => filteredVariants.map((v: any) => v.id), [filteredVariants])
  const isAllSelected = selectedIds.length > 0 && allVisibleIds.every((id: string) => selectedIds.includes(id))
  const toggleSelectAll = () => {
    if (isAllSelected) setSelectedIds([])
    else setSelectedIds(allVisibleIds)
  }
  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  // Handle PDF generation
  const handleGeneratePdf = (variant: Variant) => {
    const id = (variant as any).id
    if (!id) return
    window.open(`/api/variant-label?id=${encodeURIComponent(id)}`, "_blank")
  }

  const columns = useMemo(() => [
    // Checkbox column
    columnHelper.display({
      id: "select",
      header: () => (
        <div className="flex items-center justify-center">
          <input
            type="checkbox"
            checked={isAllSelected}
            onChange={toggleSelectAll}
            aria-label="Select all"
            className="w-4 h-4 accent-black"
          />
        </div>
      ),
      cell: (info) => {
        const variant = info.row.original as any
        return (
          <div className="flex items-center justify-center">
            <input
              type="checkbox"
              checked={selectedIds.includes(variant.id)}
              onChange={() => toggleSelectOne(variant.id)}
              aria-label="Select row"
              className="w-4 h-4 accent-black"
            />
          </div>
        )
      },
      enableSorting: false,
      enableColumnFilter: false,
    }),
    // Serial Number
    columnHelper.accessor((row: any) => row.serial_number, {
      id: "serial_number",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0 h-auto font-medium hover:bg-transparent"
        >
          Serial
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: (info) => {
        const serialNumber = info.getValue() as number | null
        return <div className="font-mono text-center">{serialNumber || '-'}</div>
      },
      enableSorting: true,
      sortingFn: (rowA, rowB) => {
        const a = Number(rowA.getValue('serial_number')) || 0
        const b = Number(rowB.getValue('serial_number')) || 0
        return a - b
      },
    }),
    // Size
    columnHelper.accessor('size', {
      id: "size",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0 h-auto font-medium hover:bg-transparent"
        >
          Size
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: (info) => {
        const size = info.getValue() as string | number
        return <div className="text-center font-medium">{size || '-'}</div>
      },
      enableSorting: true,
      sortingFn: (rowA, rowB) => {
        const a = Number(rowA.getValue('size')) || 0
        const b = Number(rowB.getValue('size')) || 0
        return a - b
      },
    }),
    // Variant SKU
    columnHelper.accessor('variant_sku', {
      id: "variant_sku",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0 h-auto font-medium hover:bg-transparent"
        >
          Variant SKU
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: (info) => {
        const variantSku = info.getValue() as string
        return <div className="font-mono text-sm">{variantSku || '-'}</div>
      },
      enableSorting: true,
      sortingFn: (rowA, rowB) => {
        const a = String(rowA.getValue('variant_sku') || '')
        const b = String(rowB.getValue('variant_sku') || '')
        return a.localeCompare(b)
      },
    }),
    // Location
    columnHelper.accessor('location', {
      id: "location",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0 h-auto font-medium hover:bg-transparent"
        >
          Location
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: (info) => {
        const location = info.getValue() as string
        return <div>{location || '-'}</div>
      },
      enableSorting: true,
      sortingFn: (rowA, rowB) => {
        const a = String(rowA.getValue('location') || '')
        const b = String(rowB.getValue('location') || '')
        return a.localeCompare(b)
      },
    }),
    // Status
    columnHelper.accessor('status', {
      id: "status",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0 h-auto font-medium hover:bg-transparent"
        >
          Status
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: (info) => {
        const status = info.getValue() as string
        let badgeVariant: any = "default"
        if (status === "Available") badgeVariant = "success"
        else if (status === "Sold") badgeVariant = "destructive"
        else if (status === "Reserved") badgeVariant = "warning"
        
        return (
          <span
            className={`
              inline-flex items-center px-3 py-1 rounded-full text-xs font-medium
              shadow-sm transition-colors duration-200
              ${
                badgeVariant === "success"
                  ? "bg-green-100 text-green-800"
                  : badgeVariant === "destructive"
                  ? "bg-red-100 text-red-800"
                  : badgeVariant === "warning"
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-gray-100 text-gray-800"
              }
            `}
          >
            {status}
          </span>
        )
      },
      enableSorting: true,
      sortingFn: (rowA, rowB) => {
        const a = String(rowA.getValue('status') || '')
        const b = String(rowB.getValue('status') || '')
        return a.localeCompare(b)
      },
    }),
    // Date Added
    columnHelper.accessor('date_added', {
      id: "date_added",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0 h-auto font-medium hover:bg-transparent"
        >
          Date Added
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: (info) => {
        const dateAdded = info.getValue() as string
        return <div className="text-sm">{dateAdded || '-'}</div>
      },
      enableSorting: true,
      sortingFn: (rowA, rowB) => {
        const a = new Date(String(rowA.getValue('date_added') || '')).getTime()
        const b = new Date(String(rowB.getValue('date_added') || '')).getTime()
        return a - b
      },
    }),
    // Actions
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: (info) => {
        const variant = info.row.original as Variant
        const isSold = variant.status === "Sold"
        return (
          <div className="flex justify-center min-w-[60px]">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={() => setEditModal({ open: true, variant })}
                  disabled={isSold}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleGeneratePdf(variant)}>
                  <QrCode className="mr-2 h-4 w-4" />
                  Generate Label
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setDeleteModal({ open: true, variant })} 
                  className="text-red-600"
                  disabled={isSold}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
                {isSold && (
                  <div className="px-2 py-1 text-xs text-muted-foreground">
                    Sold items cannot be modified
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
      enableSorting: false,
      enableColumnFilter: false,
    }),
  ], [selectedIds, isAllSelected, toggleSelectAll, toggleSelectOne])

  const table = useReactTable({
    data: filteredVariants,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    initialState: {
      pagination: { pageSize: 20 },
    },
    enableSorting: true,
    manualSorting: false,
  })

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="h-24 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
        <div className="h-96 bg-gray-200 rounded animate-pulse" />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold text-gray-900">Product not found</h2>
        <p className="text-gray-600 mt-2">The product you're looking for doesn't exist.</p>
        <Link href="/inventory" className="mt-4 inline-flex items-center gap-2 text-blue-600 hover:text-blue-800">
          <ArrowLeft className="w-4 h-4" />
          Back to Inventory
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Product Info */}
      <div className="flex items-start gap-4">
        <Link 
          href="/inventory" 
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Inventory
        </Link>
      </div>

      {/* Product Summary Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16">
              <Image
                src={product.image || "/placeholder.jpg"}
                alt={product.name}
                width={64}
                height={64}
                className="rounded-lg object-cover"
              />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl">{product.name}</CardTitle>
              <div className="text-sm text-muted-foreground space-y-1">
                <div>Brand: {product.brand}</div>
                <div>SKU: {product.sku}</div>
                <div>Category: {product.size_category}</div>
                <div>Total Variants: {variants.length}</div>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Stats Cards */}
      <div className="mb-6">
        <VariantsStatsCard
          totalVariants={stats.totalVariants}
          totalCostValue={stats.totalCostValue}
          totalSaleValue={stats.totalSaleValue}
          profit={stats.profit}
          loading={loading}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 justify-between items-center">
        <h2 className="text-2xl font-semibold">Variants</h2>
        <Button
          onClick={() => setAddVariantsModal({ open: true, product })}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add More Variants
        </Button>
      </div>

      {/* Bulk actions bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-4 bg-muted px-4 py-2 rounded mb-2">
          <span>{selectedIds.length} selected</span>
          <Button size="sm" variant="outline" onClick={async () => {
            // Bulk archive
            await supabase.from('variants').update({ isArchived: true }).in('id', selectedIds)
            setSelectedIds([])
            fetchData()
          }}>Bulk Archive</Button>
          <Button size="sm" variant="default" onClick={() => {
            // Bulk PDF: open new tab with ids as query param
            window.open(`/api/variant-label-bulk?ids=${selectedIds.join(',')}`, "_blank");
          }}>Bulk Generate PDF</Button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2 items-center flex-1">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by serial, size, location, variant SKU..."
              value={globalFilter ?? ""}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-10"
            />
            {globalFilter && (
              <button
                onClick={() => setGlobalFilter("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Size Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="shrink-0 justify-between min-w-[140px]">
                <span className="truncate">
                  {sizeFilter.length === 0 ? "All Sizes" : sizeFilter.join(", ")}
                </span>
                <svg className="ml-2 h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="none">
                  <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[220px] max-h-72 overflow-y-auto p-2">
              <Input
                placeholder="Search size..."
                value={sizeSearch}
                onChange={e => setSizeSearch(e.target.value)}
                className="mb-2 text-xs"
                autoFocus
              />
              <div className="mb-2">
                <Checkbox
                  id="all-sizes"
                  checked={sizeFilter.length === 0}
                  onCheckedChange={checked => {
                    if (checked) setSizeFilter([])
                  }}
                />
                <Label htmlFor="all-sizes" className="ml-2 text-xs cursor-pointer select-none">All Sizes</Label>
              </div>
              {sizeOptions
                .filter(size => sizeSearch === "" || size.toLowerCase().includes(sizeSearch.toLowerCase()))
                .map(size => {
                  const checked = sizeFilter.includes(size)
                  return (
                    <div key={size} className="flex items-center py-1 cursor-pointer hover:bg-muted/30 rounded">
                      <Checkbox
                        id={`size-${size}`}
                        checked={checked}
                        onCheckedChange={checked => {
                          if (checked) setSizeFilter(prev => [...prev, size])
                          else setSizeFilter(prev => prev.filter(s => s !== size))
                        }}
                      />
                      <Label htmlFor={`size-${size}`} className="ml-2 text-xs cursor-pointer select-none">{size}</Label>
                    </div>
                  )
                })}
            </PopoverContent>
          </Popover>

          {!isDesktop && (
            <Popover open={showFiltersModal} onOpenChange={setShowFiltersModal}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0">
                  <Filter className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-4" align="end">
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Filters</h3>
                  <div className="space-y-2">
                    <div className="flex flex-col space-y-1">
                      <label className="text-xs">Location</label>
                      <Select value={locationFilter} onValueChange={setLocationFilter}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="All Locations" />
                        </SelectTrigger>
                        <SelectContent>
                          {locationOptions.map(location => (
                            <SelectItem key={location} value={location}>
                              {location === "all" ? "All Locations" : location}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col space-y-1">
                      <label className="text-xs">Status</label>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map(status => (
                            <SelectItem key={status} value={status}>
                              {status === "all" ? "All Status" : status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>

        {isDesktop && (
          <div className="flex gap-2 flex-wrap">
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent>
                {locationOptions.map(location => (
                  <SelectItem key={location} value={location}>
                    {location === "all" ? "All Locations" : location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(status => (
                  <SelectItem key={status} value={status}>
                    {status === "all" ? "All Status" : status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-md border">
        <Table className="min-w-[800px] w-full">
          <TableHeader className="bg-muted sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="whitespace-nowrap">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <TableRow key={idx}>
                  {columns.map((col, colIdx) => (
                    <TableCell key={colIdx} className="px-4 py-2">
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-4 py-2 whitespace-nowrap">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center h-24">
                  No variants found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="text-sm text-muted-foreground">
          Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{" "}
          {Math.min(
            (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
            table.getFilteredRowModel().rows.length
          )}{" "}
          of {table.getFilteredRowModel().rows.length} entries
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <div className="text-sm">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Edit Modal */}
      {editModal.open && editModal.variant && (
        <EditVariantModal
          open={editModal.open}
          variant={editModal.variant}
          onClose={(updated: boolean) => {
            setEditModal({ open: false })
            if (updated) {
              fetchData() // Refresh the data if variant was updated
            }
          }}
        />
      )}

      {/* Delete Modal */}
      <ConfirmationModal
        open={deleteModal.open && !!deleteModal.variant}
        onOpenChange={(open) => setDeleteModal({ open, variant: open ? deleteModal.variant : undefined })}
        title="Delete Variant"
        description="Are you sure you want to delete this variant? This action cannot be undone."
        isConfirming={false}
        onConfirm={async () => {
          if (deleteModal.variant?.id) {
            await supabase.from('variants').update({ isArchived: true }).eq('id', deleteModal.variant.id)
          }
          setDeleteModal({ open: false })
          fetchData()
        }}
      />

      {/* Add Variants Modal */}
      {product && (
        <AddVariantsModal
          open={addVariantsModal.open && !!addVariantsModal.product}
          product={addVariantsModal.product || product}
          onOpenChange={(open) => setAddVariantsModal({ open, product: open ? addVariantsModal.product : undefined })}
          onVariantsAdded={() => {
            setAddVariantsModal({ open: false })
            fetchData() // Refresh the data
          }}
          sizeOptionsByCategory={sizeOptionsByCategory}
        />
      )}
    </div>
  )
}
