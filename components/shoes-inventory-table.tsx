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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown, ChevronUp, MoreHorizontal, Edit, Trash2, QrCode, ArrowUpDown, ShoppingCart, ReceiptText, Filter } from "lucide-react"
import jsPDF from "jspdf"
import QRCode from "qrcode"
import { createClient } from "@/lib/supabase/client"
import { Product, Variant } from "@/lib/types"
import Image from "next/image"
import EditProductModal from "@/components/edit-product-modal"
import { ConfirmationModal } from "@/components/confirmation-modal"
import { EditVariantModal } from "@/components/edit-variant-modal"

import { Badge } from "@/components/ui/badge"



// TypeScript type for the products table columns
export type ProductTable = {
  id: number;
  name: string;
  brand: string;
  sku: string;
  category: string | null;
  original_price: number;
  sale_price: number;
  status: string;
  image: string | null;
  created_at: string | null;
  updated_at: string | null;
  size_category: string | null;
  user_id: string;
  isArchived: boolean;
};

// Helper to fetch variants for a product
async function fetchVariantsForProduct(productId: number, supabase: any): Promise<Variant[]> {
  const { data, error } = await supabase
    .from('variants')
    .select('*')
    .eq('product_id', productId)
    .eq('isArchived', false);
  if (error) {
    console.error('Error fetching variants:', error);
    return [];
  }
  return data || [];
}

const columnHelper = createColumnHelper<Product>()



export function ShoesInventoryTable() {
  // For row expansion: track expanded productId and their variants
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [rowVariants, setRowVariants] = useState<Record<number, Variant[]>>({});
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState("")
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [editModal, setEditModal] = useState<{ open: boolean, product?: Product }>({ open: false })
  const [deleteModal, setDeleteModal] = useState<{ open: boolean, product?: Product }>({ open: false })
  const [showFiltersModal, setShowFiltersModal] = useState(false);

  // Track screen width for responsive design
  const [screenWidth, setScreenWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1400);
  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isDesktop = screenWidth >= 1380;
  const isMobile = screenWidth < 640;

  // New filter state
  const [brandFilter, setBrandFilter] = useState<string>("all")
  const [sizeCategoryFilter, setSizeCategoryFilter] = useState<string>("all")


  // For size filter (multi-select)
  const [sizeFilter, setSizeFilter] = useState<string[]>([]); // array of selected sizes
  const [sizeSearch, setSizeSearch] = useState("");

  const supabase = createClient()

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', user.id)
        .eq('isArchived', false)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching products:', error)
      } else {
        setProducts(data || [])
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  // Prefetch all variants for all products on load to ensure quantity is always correct
  useEffect(() => {
    fetchProducts()
  }, [])

  // When products change, prefetch all variants for quantity
  useEffect(() => {
    async function prefetchAllVariants() {
      if (products.length === 0) return;
      const all: Record<number, Variant[]> = {};
      for (const p of products) {
        const variants = await fetchVariantsForProduct(p.id, supabase);
        all[p.id] = variants;
      }
      setRowVariants(all);
    }
    prefetchAllVariants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products]);

  // Debug: Log sorting state
  useEffect(() => {
    console.log('Current sorting state:', sorting);
  }, [sorting])


  // Compute unique filter options
  const brandOptions = useMemo(() => {
    const set = new Set<string>()
    products.forEach(p => { if (p.brand) set.add(p.brand) })
    return ["all", ...Array.from(set)]
  }, [products])

  const sizeCategoryOptions = useMemo(() => {
    const set = new Set<string>()
    products.forEach(p => { if (p.size_category) set.add(p.size_category) })
    return ["all", ...Array.from(set)]
  }, [products])

  // Compute size options grouped by size category
  const sizeOptionsByCategory = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    Object.entries(rowVariants).forEach(([productId, variants]) => {
      const product = products.find(p => p.id === Number(productId));
      if (!product || !product.size_category) return;
      if (!map[product.size_category]) map[product.size_category] = new Set();
      variants.forEach(v => {
        if (v.size) map[product.size_category].add(String(v.size));
      });
    });
    // Convert sets to sorted arrays
    const result: Record<string, string[]> = {};
    Object.entries(map).forEach(([cat, sizes]) => {
      result[cat] = Array.from(sizes).sort((a, b) => {
        const na = Number(a), nb = Number(b);
        if (!isNaN(na) && !isNaN(nb)) return na - nb;
        return String(a).localeCompare(String(b));
      });
    });
    return result;
  }, [rowVariants, products]);

  // Filtered products (all filters except status, which is handled by table column filter)
  const filteredProducts = useMemo(() => {
    let result = products.filter(p => {
      return (
        (brandFilter === "all" || p.brand === brandFilter) &&
        (sizeCategoryFilter === "all" || p.size_category === sizeCategoryFilter)
      );
    });
    // Filter by sizes if any selected
    if (sizeFilter.length > 0) {
      result = result.filter(p => {
        const variants = rowVariants[p.id] || [];
        return variants.some(v => sizeFilter.includes(String(v.size)));
      });
    }
    return result;
  }, [products, brandFilter, sizeCategoryFilter, sizeFilter, rowVariants]);

  // Bulk selection state (must be after filteredVariants)
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const allVisibleIds = useMemo(() => filteredProducts.map((p: any) => p.id), [filteredProducts]);
  const isAllSelected = selectedIds.length > 0 && allVisibleIds.every((id: number) => selectedIds.includes(id));
  const toggleSelectAll = () => {
    if (isAllSelected) setSelectedIds([]);
    else setSelectedIds(allVisibleIds);
  };
  const toggleSelectOne = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const columns = useMemo(() => [
    // Expand/Collapse Arrow (empty header)
    columnHelper.display({
      id: "expand",
      header: () => null,
      cell: (info) => null, // handled in row render
      enableSorting: false,
      enableColumnFilter: false,
    }),
    // Image
    columnHelper.display({
      id: "image",
      header: "",
      cell: (info) => {
        const product = info.row.original as Product;
        const img = product.image || "/placeholder.jpg";
        return (
          <div className="flex items-center justify-center min-w-[60px]">
            <Image src={img} alt="Product" width={40} height={40} className="rounded object-cover bg-muted" />
          </div>
        );
      },
      enableSorting: false,
      enableColumnFilter: false,
    }),
    // Name (brand below)
    columnHelper.display({
      id: "name",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="p-0 h-auto font-medium hover:bg-transparent"
          >
            Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: (info) => {
        const product = info.row.original as Product;
        return (
          <div className="min-w-[180px]">
            <div className="font-medium">{product.name || "-"}</div>
            <div className="text-xs text-muted-foreground">{product.brand || "-"}</div>
          </div>
        );
      },
      enableSorting: true,
      enableColumnFilter: true,
      sortingFn: (rowA, rowB) => {
        const a = (rowA.original as Product).name || '';
        const b = (rowB.original as Product).name || '';
        return a.localeCompare(b);
      },
    }),
    // SKU
    columnHelper.display({
      id: "sku",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="p-0 h-auto font-medium hover:bg-transparent"
          >
            SKU
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: (info) => {
        const product = info.row.original as Product;
        return <div className="whitespace-nowrap min-w-[100px]">{product.sku || '-'}</div>;
      },
      enableSorting: true,
      sortingFn: (rowA, rowB) => {
        const a = (rowA.original as Product).sku || '';
        const b = (rowB.original as Product).sku || '';
        return a.localeCompare(b);
      },
    }),
    // Quantity (number of variants) - after SKU
    columnHelper.display({
      id: "quantity",
      header: () => <span>Quantity</span>,
      cell: (info) => {
        const product = info.row.original as Product;
        const variants = rowVariants[product.id] || [];
        return <span>{variants.length}</span>;
      },
      enableSorting: false,
      enableColumnFilter: false,
    }),
    // Cost (original_price)
    columnHelper.display({
      id: "cost",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="p-0 h-auto font-medium hover:bg-transparent"
          >
            Cost
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: (info) => {
        const product = info.row.original as Product;
        const value = product.original_price;
        return <div className="min-w-[100px]">${typeof value === 'number' ? value.toFixed(2) : '-'}</div>;
      },
      enableSorting: true,
      sortingFn: (rowA, rowB) => {
        const a = (rowA.original as Product).original_price || 0;
        const b = (rowB.original as Product).original_price || 0;
        return a - b;
      },
    }),
    // Price (sale_price)
    columnHelper.display({
      id: "price",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="p-0 h-auto font-medium hover:bg-transparent"
          >
            Price
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: (info) => {
        const product = info.row.original as Product;
        const value = product.sale_price;
        return <div className="min-w-[100px]">${typeof value === 'number' ? value.toFixed(2) : '-'}</div>;
      },
      enableSorting: true,
      sortingFn: (rowA, rowB) => {
        const a = (rowA.original as Product).sale_price || 0;
        const b = (rowB.original as Product).sale_price || 0;
        return a - b;
      },
    }),
    // Status
    columnHelper.display({
      id: "status",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="p-0 h-auto font-medium hover:bg-transparent"
          >
            Status
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: (info) => {
        const product = info.row.original as Product;
        const status = product.status;
        let badgeVariant: any = "default";
        if (status === "Sold") badgeVariant = "secondary";
        else if (["PullOut", "Reserved", "PreOrder"].includes(status)) badgeVariant = "outline";
        else if (status !== "Available" && status !== "In Stock") badgeVariant = "destructive";
        return (
          <div className="min-w-[100px]">
            <Badge variant={badgeVariant}>{status}</Badge>
          </div>
        );
      },
      enableSorting: true,
      enableColumnFilter: true,
      sortingFn: (rowA, rowB) => {
        const a = (rowA.original as Product).status || '';
        const b = (rowB.original as Product).status || '';
        return a.localeCompare(b);
      },
    }),
    // Size Category
    columnHelper.display({
      id: "size_category",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="p-0 h-auto font-medium hover:bg-transparent"
          >
            Category
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: (info) => {
        const product = info.row.original as Product;
        const sizeCategory = product.size_category;
        return (
          <div className="whitespace-nowrap min-w-[100px]">
            {sizeCategory || '-'}
          </div>
        );
      },
      enableSorting: true,
      sortingFn: (rowA, rowB) => {
        const a = (rowA.original as Product).size_category || '';
        const b = (rowB.original as Product).size_category || '';
        return a.localeCompare(b);
      },
    }),
    // Actions
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: (info) => {
        const product = info.row.original as Product;
        const productId = product.id;
        return (
          <div className="flex justify-center min-w-[60px]">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditModal({ open: true, product })}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDeleteModal({ open: true, product })} className="text-red-600">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { if (productId) { window.open(`/products/${productId}/variants`, "_blank"); }}}>
                  View All Variants
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { if (productId) { window.open(`/sales?s=${productId}`, "_blank"); }}}>
                  Sales History
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { if (productId) { window.open(`/sales/new?s=${productId}`, "_blank"); }}}>
                  Sale
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
      enableSorting: false,
      enableColumnFilter: false,
    }),
  ], [selectedIds, isAllSelected, toggleSelectAll, toggleSelectOne, rowVariants])

  const table = useReactTable({
    data: filteredProducts,
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
      pagination: { pageSize: 10 },
    },
    enableSorting: true,
    manualSorting: false, // Let react-table handle sorting
  })

  return (
    <div className="space-y-4">
      {/* Top Action Buttons */}
      <div className="flex flex-wrap gap-2 justify-end mb-2">
        <Button
          variant="default"
          onClick={() => window.location.href = "/add-product"}
        >
          + Add Product
        </Button>
        {isMobile ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => window.location.href = "/sales"} className="flex items-center gap-2">
                <ReceiptText className="w-4 h-4" />
                Sales History
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.location.href = "/checkout"} className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                Checkout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <>
            <Button
              variant="outline"
              onClick={() => window.location.href = "/sales"}
              className="flex items-center gap-2"
            >
              <ReceiptText className="w-4 h-4" />
              Sales History
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.href = "/checkout"}
              className="flex items-center gap-2"
            >
              <ShoppingCart className="w-4 h-4" />
              Checkout
            </Button>
          </>
        )}
      </div>
      {/* Bulk actions bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-4 bg-muted px-4 py-2 rounded mb-2">
          <span>{selectedIds.length} selected</span>
          <Button size="sm" variant="outline" onClick={async () => {
            // Bulk archive
            await supabase.from('products').update({ isArchived: true }).in('id', selectedIds);
            setSelectedIds([]);
            fetchProducts();
          }}>Bulk Archive</Button>
        </div>
      )}
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <Input
            placeholder="Search by name, brand, SKU, or stock..."
            value={globalFilter ?? ""}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="max-w-sm"
          />
          
          {/* Size Filter - Always visible regardless of screen size */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="shrink-0 justify-between min-w-[140px]">
                <span className="truncate">
                  {sizeFilter.length === 0 ? "All Sizes" : sizeFilter.join(", ")}
                </span>
                <svg className="ml-2 h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="none"><path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[220px] max-h-72 overflow-y-auto p-0">
              <div className="px-2 py-1">
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
                      if (checked) setSizeFilter([]);
                    }}
                  />
                  <label htmlFor="all-sizes" className="ml-2 text-xs cursor-pointer select-none">All Sizes</label>
                </div>
              </div>
              {Object.entries(sizeOptionsByCategory).map(([cat, sizes]) => (
                <React.Fragment key={cat}>
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted/50 sticky top-0 z-10">{cat}</div>
                  {sizes.filter(size => sizeSearch === "" || String(size).toLowerCase().includes(sizeSearch.toLowerCase())).map(size => {
                    const checked = sizeFilter.includes(size);
                    return (
                      <div key={cat + "-" + size} className="flex items-center px-2 py-1 cursor-pointer hover:bg-muted/30 rounded">
                        <Checkbox
                          id={`size-${cat}-${size}`}
                          checked={checked}
                          onCheckedChange={checked => {
                            if (checked) setSizeFilter(prev => [...prev, size]);
                            else setSizeFilter(prev => prev.filter(s => s !== size));
                          }}
                        />
                        <label htmlFor={`size-${cat}-${size}`} className="ml-2 text-xs cursor-pointer select-none">{size}</label>
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </PopoverContent>
          </Popover>
          
          {/* Other filters in filter button on mobile/tablet */}
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
                    {/* Brand Filter */}
                    <div className="flex flex-col space-y-1">
                      <label className="text-xs">Brand</label>
                      <Select value={brandFilter} onValueChange={setBrandFilter}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="All Brands" />
                        </SelectTrigger>
                        <SelectContent>
                          {brandOptions.map(brand => (
                            <SelectItem key={brand} value={brand}>{brand === "all" ? "All Brands" : brand}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Size Category Filter */}
                    <div className="flex flex-col space-y-1">
                      <label className="text-xs">Category</label>
                      <Select value={sizeCategoryFilter} onValueChange={setSizeCategoryFilter}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent>
                          {sizeCategoryOptions.map(category => (
                            <SelectItem key={category} value={category}>
                              {category === "all" ? "All Categories" : category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Status Filter */}
                    <div className="flex flex-col space-y-1">
                      <label className="text-xs">Status</label>
                      <Select
                        value={(table.getColumn("status")?.getFilterValue() as string) ?? "all"}
                        onValueChange={(value) => table.getColumn("status")?.setFilterValue(value === "all" ? undefined : value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="Available">Available</SelectItem>
                          <SelectItem value="Sold">Sold</SelectItem>
                          <SelectItem value="PullOut">PullOut</SelectItem>
                          <SelectItem value="Reserved">Reserved</SelectItem>
                          <SelectItem value="PreOrder">PreOrder</SelectItem>
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
            {/* Brand Filter */}
            <Select value={brandFilter} onValueChange={setBrandFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Brands" />
              </SelectTrigger>
              <SelectContent>
                {brandOptions.map(brand => (
                  <SelectItem key={brand} value={brand}>{brand === "all" ? "All Brands" : brand}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Size Category Filter */}
            <Select value={sizeCategoryFilter} onValueChange={setSizeCategoryFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                {sizeCategoryOptions.map(category => (
                  <SelectItem key={category} value={category}>
                    {category === "all" ? "All Categories" : category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Status Filter (existing) */}
            <Select
              value={(table.getColumn("status")?.getFilterValue() as string) ?? "all"}
              onValueChange={(value) => table.getColumn("status")?.setFilterValue(value === "all" ? undefined : value)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="Available">Available</SelectItem>
                <SelectItem value="Sold">Sold</SelectItem>
                <SelectItem value="PullOut">PullOut</SelectItem>
                <SelectItem value="Reserved">Reserved</SelectItem>
                <SelectItem value="PreOrder">PreOrder</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Table with horizontal scroll */}
      <div className="overflow-x-auto rounded-md border">
        <Table className="min-w-[1000px] w-full">
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
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center h-24">
                  Loading...
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => {
                const product = row.original as Product;
                const isExpanded = expandedRow === product.id;
                return (
                  <React.Fragment key={row.id}>
                    <TableRow
                      className={isExpanded ? "bg-muted/40" : ""}
                      onClick={async () => {
                        if (expandedRow === product.id) {
                          setExpandedRow(null);
                        } else {
                          setExpandedRow(product.id);
                        }
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      {/* Expand/Collapse Arrow */}
                      <TableCell className="px-4 py-2 whitespace-nowrap w-8 text-center">
                        <span className="inline-flex items-center">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </span>
                      </TableCell>
                      {row.getVisibleCells().slice(1).map((cell, idx) => (
                        <TableCell key={cell.id} className="px-4 py-2 whitespace-nowrap">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                    {isExpanded && (
                      <TableRow>
                        <TableCell colSpan={columns.length} className="bg-muted/20 px-8 py-4">
                          <div className="flex flex-wrap gap-2 items-center">
                            <span className="font-semibold text-sm">Available Sizes:</span>
                            {(rowVariants[product.id] || []).length === 0 ? (
                              <span className="text-muted-foreground text-xs">No variants</span>
                            ) : (
                              // Show unique sizes only
                              Array.from(new Set(rowVariants[product.id].map(v => v.size)))
                                .sort((a, b) => {
                                  // Try to sort numerically if possible
                                  const na = Number(a), nb = Number(b);
                                  if (!isNaN(na) && !isNaN(nb)) return na - nb;
                                  return String(a).localeCompare(String(b));
                                })
                                .map(size => (
                                  <Button
                                    key={size}
                                    size="sm"
                                    variant="outline"
                                    className="text-xs px-3 py-1"
                                    onClick={e => {
                                      e.stopPropagation();
                                      window.open(`/products/${product.id}/variants/size/${size}`, "_blank");
                                    }}
                                  >
                                    {size}
                                  </Button>
                                ))
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center h-24">
                  No data found.
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
      {/* Edit Modal (replace with your Product edit modal if available) */}
      {/* <EditProductModal
        open={editModal.open}
        product={editModal.product}
        onClose={(updated) => {
          setEditModal({ open: false })
          if (updated) {
            fetchProducts(); // Refresh the table data
            setSorting([]); // Reset sort
          }
        }}
      /> */}

      {/* Delete Modal */}
      <ConfirmationModal
        open={deleteModal.open && !!deleteModal.product}
        onOpenChange={(open) => setDeleteModal({ open, product: open ? deleteModal.product : undefined })}
        title="Delete Product"
        description="Are you sure you want to delete this product? This action cannot be undone."
        isConfirming={false}
        onConfirm={async () => {
          if (deleteModal.product?.id) {
            await supabase.from('products').delete().eq('id', deleteModal.product.id);
          }
          setDeleteModal({ open: false });
          await fetchProducts();
          setSorting([]); // Reset sort
        }}
      />

    </div>
  )
}
