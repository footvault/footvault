"use client"

import React, { useMemo, useState, useEffect } from "react"
import Link from "next/link"
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
import { Skeleton } from "@/components/ui/skeleton"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown, ChevronUp, MoreHorizontal, Edit, Trash2, QrCode, ArrowUpDown, ShoppingCart, ReceiptText, Filter, Search, Plus, Sliders, Grid } from "lucide-react"
import jsPDF from "jspdf"
import QRCode from "qrcode"
import { createClient } from "@/lib/supabase/client"
import { Product, Variant } from "@/lib/types"
import Image from "next/image"
import EditProductModal from "@/components/edit-product-modal"
import { ConfirmationModal } from "@/components/confirmation-modal"
import { EditVariantModal } from "@/components/edit-variant-modal"
import { formatCurrency, getCurrencySymbol } from "@/lib/utils/currency"
import { useCurrency } from "@/context/CurrencyContext"
import { Badge } from "@/components/ui/badge"

import { InventoryStatsCard } from "@/components/inventory-stats-card";



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
  // Consignor fields
  consignor_id?: number;
  is_consignment?: boolean;
  consignment_agreement_date?: string;
  consignment_end_date?: string;
  consignment_duration_months?: number;
  minimum_price?: number;
  consignor_notes?: string;
  consignor?: {
    id: number;
    name: string;
    commission_rate: number;
  };
};

// Helper to fetch variants for a product
async function fetchVariantsForProduct(productId: number, supabase: any): Promise<Variant[]> {
  const { data, error } = await supabase
    .from('variants')
    .select('*')
    .eq('product_id', productId);
  
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
  const [loadingVariants, setLoadingVariants] = useState(false)
  const [editModal, setEditModal] = useState<{ open: boolean, product?: Product }>({ open: false })
  const [deleteModal, setDeleteModal] = useState<{ open: boolean, product?: Product }>({ open: false })
  const [addVariantsModal, setAddVariantsModal] = useState<{ open: boolean, product?: Product }>({ open: false })
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  
  const { currency } = useCurrency(); // Get the user's selected currency
  const currencySymbol = getCurrencySymbol(currency);

  // Calculate stats for InventoryStatsCard just before return
  const totalShoes = products.length;
  const totalVariants = Object.values(rowVariants).reduce((sum, variants) => 
    sum + variants.filter(v => v.status === 'Available').length, 0
  );
   const [totalValue, setTotalValue] = useState<number>(0)

  useEffect(() => {
    const fetchTotalValue = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        console.warn('No session token available')
        return
      }

      const res = await fetch('/api/inventory-value', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      const json = await res.json()
      console.debug('[DEBUG] /api/inventory-value response:', json)

      if (typeof json.totalCost === 'number') {
        setTotalValue(json.totalCost)
      } else {
        setTotalValue(0)
      }
    }

    fetchTotalValue()
  }, [products, rowVariants])

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
  const [priceMin, setPriceMin] = useState<number>(0)
  const [priceMax, setPriceMax] = useState<number>(0)
  const [stockFilter, setStockFilter] = useState<string>("all")

  // For size filter (multi-select)
  const [sizeFilter, setSizeFilter] = useState<string[]>([]); // array of selected sizes
  const [sizeSearch, setSizeSearch] = useState("");

  const supabase = createClient(undefined)

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', user.id)
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
      setLoadingVariants(true);
      const all: Record<number, Variant[]> = {};
      for (const p of products) {
        const variants = await fetchVariantsForProduct(p.id, supabase);
        all[p.id] = variants;
      }
      setRowVariants(all);
      setLoadingVariants(false);
    }
    prefetchAllVariants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products]);

  // Debug: Log sorting state
  useEffect(() => {
   
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

  // Calculate max price from products for price filter
  const maxPrice = useMemo(() => {
    const prices = products.map(p => p.sale_price || 0).filter(price => price > 0)
   
    if (prices.length === 0) return 1000
    const calculatedMax = Math.ceil(Math.max(...prices) / 10) * 10

    return calculatedMax // Round up to nearest 10
  }, [products])

  // Set initial max price when products change
  useEffect(() => {
    if (maxPrice > 0 && (priceMax === 0 || priceMax < maxPrice)) {
    
      setPriceMax(maxPrice)
    }
  }, [maxPrice, priceMax])

  // Dynamic price range options based on actual shoe prices
  const priceRangeOptions = useMemo(() => {
    const prices = products.map(p => p.sale_price || 0).filter(price => price > 0)
    if (prices.length === 0) return [{ value: "all", label: "All Prices" }]
    
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    
    // Create smart, rounded ranges based on actual price distribution
    const ranges = [{ value: "all", label: "All Prices" }]
    
    // Helper function to round to nice numbers
    const roundToNice = (num: number): number => {
      if (num < 25) return Math.ceil(num / 5) * 5        // Round to nearest 5
      if (num < 100) return Math.ceil(num / 10) * 10     // Round to nearest 10
      if (num < 500) return Math.ceil(num / 25) * 25     // Round to nearest 25
      if (num < 1000) return Math.ceil(num / 50) * 50    // Round to nearest 50
      return Math.ceil(num / 100) * 100                  // Round to nearest 100
    }
    
    // Create meaningful price brackets
    if (maxPrice > minPrice + 20) {
      const range = maxPrice - minPrice
      
      if (range <= 100) {
        // Small range: create 3-4 buckets with $10-25 increments
        const step = range <= 50 ? 15 : 25
        const start = roundToNice(minPrice)
        
        for (let i = 0; i < 3; i++) {
          const rangeStart = start + (step * i)
          const rangeEnd = start + (step * (i + 1))
          
          if (rangeStart < maxPrice) {
            ranges.push({
              value: `${rangeStart}-${rangeEnd}`,
              label: `${currencySymbol}${rangeStart} - ${currencySymbol}${rangeEnd}`
            })
          }
        }
        
        if (start + (step * 3) < maxPrice + 10) {
          ranges.push({
            value: `over-${start + (step * 3)}`,
            label: `Over ${currencySymbol}${start + (step * 3)}`
          })
        }
        
      } else if (range <= 300) {
        // Medium range: create ranges with $50-75 increments
        const commonRanges = [
          { start: 0, end: 50, label: "Under $50" },
          { start: 50, end: 100, label: "$50 - $100" },
          { start: 100, end: 150, label: "$100 - $150" },
          { start: 150, end: 200, label: "$150 - $200" },
          { start: 200, end: 300, label: "$200 - $300" },
          { start: 300, end: 500, label: "$300 - $500" }
        ]
        
        for (const range of commonRanges) {
          // Only include ranges that have products
          if (range.end >= minPrice && range.start <= maxPrice) {
            if (range.start === 0) {
              ranges.push({
                value: `under-${range.end}`,
                label: range.label.replace("$", currencySymbol)
              })
            } else {
              ranges.push({
                value: `${range.start}-${range.end}`,
                label: range.label.replace(/\$/g, currencySymbol)
              })
            }
          }
        }
        
        if (maxPrice > 500) {
          ranges.push({
            value: "over-500",
            label: `Over ${currencySymbol}500`
          })
        }
        
      } else {
        // Large range: create ranges with $100-200 increments
        const commonRanges = [
          { start: 0, end: 100, label: "Under $100" },
          { start: 100, end: 250, label: "$100 - $250" },
          { start: 250, end: 500, label: "$250 - $500" },
          { start: 500, end: 750, label: "$500 - $750" },
          { start: 750, end: 1000, label: "$750 - $1000" }
        ]
        
        for (const range of commonRanges) {
          if (range.end >= minPrice && range.start <= maxPrice) {
            if (range.start === 0) {
              ranges.push({
                value: `under-${range.end}`,
                label: range.label.replace("$", currencySymbol)
              })
            } else {
              ranges.push({
                value: `${range.start}-${range.end}`,
                label: range.label.replace(/\$/g, currencySymbol)
              })
            }
          }
        }
        
        if (maxPrice > 1000) {
          ranges.push({
            value: "over-1000",
            label: `Over ${currencySymbol}1000`
          })
        }
      }
    } else {
      // Very small range or few products: simple above/below median
      const median = Math.floor((minPrice + maxPrice) / 2)
      const roundedMedian = roundToNice(median)
      
      ranges.push(
        { value: `under-${roundedMedian}`, label: `Under ${currencySymbol}${roundedMedian}` },
        { value: `over-${roundedMedian}`, label: `${currencySymbol}${roundedMedian} and above` }
      )
    }
    
    return ranges
  }, [products, currencySymbol])

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
      // Global filter for name, brand, SKU
      const searchMatch = !globalFilter || 
        p.name?.toLowerCase().includes(globalFilter.toLowerCase()) ||
        p.brand?.toLowerCase().includes(globalFilter.toLowerCase()) ||
        p.sku?.toLowerCase().includes(globalFilter.toLowerCase());
      
      // Price range filter
      const priceMatch = (() => {
        const price = p.sale_price || 0;
        const min = priceMin || 0;
        const max = priceMax || maxPrice;
        return price >= min && price <= max;
      })();

      // Stock filter
      const stockMatch = (() => {
        if (stockFilter === "all") return true;
        const variants = rowVariants[p.id] || [];
        const availableVariants = variants.filter(v => v.status === 'Available');
        const quantity = availableVariants.length;
        switch (stockFilter) {
          case "in-stock": return quantity > 0;
          case "out-of-stock": return quantity === 0;
          case "low-stock": return quantity > 0 && quantity <= 5;
          case "high-stock": return quantity > 10;
          default: return true;
        }
      })();
      
      return (
        searchMatch &&
        priceMatch &&
        stockMatch &&
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
  }, [products, brandFilter, sizeCategoryFilter, priceMin, priceMax, maxPrice, stockFilter, sizeFilter, rowVariants, globalFilter]);

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
    columnHelper.accessor('name', {
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
    }),
    // SKU
    columnHelper.accessor('sku', {
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
    }),
    // Quantity (number of variants) - after SKU
    columnHelper.display({
      id: "quantity",
      header: () => <span>Quantity</span>,
      cell: (info) => {
        const product = info.row.original as Product;
        if (loadingVariants) {
          return <Skeleton className="h-4 w-8" />;
        }
        const variants = rowVariants[product.id] || [];
        const availableVariants = variants.filter(v => v.status === 'Available');
        return <span>{availableVariants.length}</span>;
      },
      enableSorting: false,
      enableColumnFilter: false,
    }),
    // Cost (original_price)
    columnHelper.accessor('original_price', {
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
        return <div className="min-w-[100px]">{currencySymbol}{typeof value === 'number' ? value.toFixed(2) : '-'}</div>;
      },
      enableSorting: true,
    }),
    // Price (sale_price)
    columnHelper.accessor('sale_price', {
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
        return <div className="min-w-[100px]">{currencySymbol}{typeof value === 'number' ? value.toFixed(2) : '-'}</div>;
      },
      enableSorting: true,
    }),
    // Status
    columnHelper.accessor('status', {
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
        if (loadingVariants) {
          return (
            <div className="min-w-[100px]">
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          );
        }
        const variants = rowVariants[product.id] || [];
        const availableVariants = variants.filter(v => v.status === 'Available');
        const quantity = availableVariants.length;
        let status = product.status;
        let badgeVariant: any = "default";
        if (quantity > 0) {
          status = "In Stock";
          badgeVariant = "success";
        } else {
          status = "Out of Stock";
          badgeVariant = "destructive";
        }
        return (
          <div className="min-w-[100px] space-y-1">
            <span
  className={`
    inline-flex items-center px-3 py-1 rounded-full text-xs font-medium
    shadow-sm transition-colors duration-200
    ${
      badgeVariant === "success"
        ? "bg-green-100 text-green-800"
        : badgeVariant === "destructive"
        ? "bg-red-100 text-red-800"
        : "bg-gray-100 text-gray-800"
    }
  `}
>
  {status}
</span>
          </div>
        );
      },
      enableSorting: true,
      enableColumnFilter: true,
    }),
    // Size Category
    columnHelper.accessor('size_category', {
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
                   <DropdownMenuItem onClick={() => setAddVariantsModal({ open: true, product })}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Variants
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { if (productId) { window.open(`/products/${productId}/variants`, "_blank"); }}}>
                    <Grid className="mr-2 h-4 w-4" />
                  View All Variants
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setEditModal({ open: true, product })}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
             
                <DropdownMenuItem onClick={() => setDeleteModal({ open: true, product })} className="text-red-600">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
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
  });

  return (
    <div className="space-y-4">
      {/* Inventory Stats Card */}
      <InventoryStatsCard totalShoes={totalShoes} totalVariants={totalVariants} totalValue={totalValue} loading={loading} />
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
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2 items-center flex-1">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 transition-colors duration-200" />
            <Input
              placeholder="Search by name, brand, SKU..."
              value={globalFilter ?? ""}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-10 transition-all duration-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            {globalFilter && (
              <button
                onClick={() => setGlobalFilter("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
              >
                ✕
              </button>
            )}
          </div>
          {/* Size Filter - Always visible regardless of screen size, but for desktop move before brand filter */}
          {!isDesktop && (
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
          )}
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
                    {/* Price Range Filter */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full justify-between text-xs h-8">
                          <span className="flex items-center gap-2">
                            <Sliders className="h-3 w-3" />
                            Price Range
                          </span>
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-56 p-3">
                        <div className="space-y-3">
                          <label className="text-xs font-medium">Set Price Range</label>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label htmlFor="price-min-1" className="text-xs">Min</label>
                              <Input
                                id="price-min-1"
                                type="number"
                                placeholder="0"
                                value={priceMin || ''}
                                onChange={(e) => setPriceMin(e.target.value ? Number(e.target.value) : 0)}
                                className="h-8 text-xs"
                              />
                            </div>
                            <div>
                              <label htmlFor="price-max-1" className="text-xs">Max</label>
                              <Input
                                id="price-max-1"
                                type="number"
                                placeholder={maxPrice.toString()}
                                value={priceMax || ''}
                                onChange={(e) => setPriceMax(e.target.value ? Number(e.target.value) : maxPrice)}
                                className="h-8 text-xs"
                              />
                            </div>
                          </div>
                          {(priceMin > 0 || (priceMax > 0 && priceMax < maxPrice)) && (
                            <div className="text-xs text-gray-500">
                              Range: {currencySymbol}{priceMin || 0} - {currencySymbol}{priceMax || maxPrice}
                            </div>
                          )}
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    {/* Stock Filter */}
                    <div className="flex flex-col space-y-1">
                      <label className="text-xs">Stock</label>
                      <Select value={stockFilter} onValueChange={setStockFilter}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="All Stock" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Stock</SelectItem>
                          <SelectItem value="in-stock">In Stock</SelectItem>
                          <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                          <SelectItem value="low-stock">Low Stock (≤5)</SelectItem>
                          <SelectItem value="high-stock">High Stock (&gt;10)</SelectItem>
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
            {/* Size Filter - move before Brand Filter for desktop */}
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
            {/* Price Range Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-[200px] justify-between">
                  <span className="flex items-center gap-2">
                    <Sliders className="h-4 w-4" />
                    Price Range
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64 p-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Sliders className="h-4 w-4" />
                    <span className="text-sm font-medium">Set Price Range</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="price-min-2" className="text-xs">Min</label>
                      <Input
                        id="price-min-2"
                        type="number"
                        placeholder="0"
                        value={priceMin || ''}
                        onChange={(e) => setPriceMin(e.target.value ? Number(e.target.value) : 0)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <label htmlFor="price-max-2" className="text-xs">Max</label>
                      <Input
                        id="price-max-2"
                        type="number"
                        placeholder={maxPrice.toString()}
                        value={priceMax || ''}
                        onChange={(e) => setPriceMax(e.target.value ? Number(e.target.value) : maxPrice)}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                  {(priceMin > 0 || (priceMax > 0 && priceMax < maxPrice)) && (
                    <div className="text-xs text-gray-500 border-t pt-2">
                      Active Range: {currencySymbol}{priceMin || 0} - {currencySymbol}{priceMax || maxPrice}
                    </div>
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            {/* Stock Filter */}
            <Select value={stockFilter} onValueChange={setStockFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Stock" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stock</SelectItem>
                <SelectItem value="in-stock">In Stock</SelectItem>
                <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                <SelectItem value="low-stock">Low Stock (≤5)</SelectItem>
                <SelectItem value="high-stock">High Stock (&gt;10)</SelectItem>
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
              // Skeleton loader for table rows
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
                            {(rowVariants[product.id] || []).filter(v => v.status === 'Available').length === 0 ? (
                              <span className="text-muted-foreground text-xs">No available variants</span>
                            ) : (
                              // Group available variants by size and count quantities
                              (() => {
                                const availableVariants = rowVariants[product.id].filter(v => v.status === 'Available');
                                const sizeQuantities = availableVariants.reduce((acc, variant) => {
                                  acc[variant.size] = (acc[variant.size] || 0) + 1;
                                  return acc;
                                }, {} as Record<string, number>);
                                
                                return Object.entries(sizeQuantities)
                                  .sort(([a], [b]) => {
                                    // Try to sort numerically if possible
                                    const na = Number(a), nb = Number(b);
                                    if (!isNaN(na) && !isNaN(nb)) return na - nb;
                                    return String(a).localeCompare(String(b));
                                  })
                                  .map(([size, quantity]) => (
                                    <Button
                                      key={size}
                                      size="sm"
                                      variant="outline"
                                      className="text-xs px-3 py-1.5 h-auto"
                                      onClick={e => {
                                        e.stopPropagation();
                                        window.open(`/products/${product.id}/variants/size/${size}`, "_blank");
                                      }}
                                    >
                                      <span className="font-medium">{size}</span>
                                      <span className="text-xs text-muted-foreground ml-1.5 font-normal">({quantity})</span>
                                    </Button>
                                  ));
                              })()
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
                <TableCell colSpan={columns.length} className="text-center h-32">
                  <div className="flex flex-col items-center justify-center space-y-4 py-8">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                      <Plus className="w-8 h-8 text-gray-400" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-gray-900">No shoes in your inventory yet</h3>
                      <p className="text-sm text-gray-500 max-w-sm">
                        Start building your sneaker collection by adding your first pair of shoes to track inventory, sales, and profits.
                      </p>
                    </div>
                    <Link href="/add-product">
                      <Button className="mt-2">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Your First Shoes
                      </Button>
                    </Link>
                  </div>
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
      {editModal.open && editModal.product && (
        <EditProductModal
          open={editModal.open}
          product={editModal.product}
          onOpenChange={(open) => setEditModal({ open, product: open ? editModal.product : undefined })}
          onProductUpdated={async () => {
            await fetchProducts();
            setSorting([]); // Reset sort
          }}
        />
      )}

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

      {/* Add Variants Modal */}
      <AddVariantsModal
        open={addVariantsModal.open && !!addVariantsModal.product}
        product={addVariantsModal.product}
        onOpenChange={(open) => setAddVariantsModal({ open, product: open ? addVariantsModal.product : undefined })}
        onVariantsAdded={async () => {
          await fetchProducts();
          setSorting([]); // Reset sort
        }}
        sizeOptionsByCategory={sizeOptionsByCategory}
      />

    </div>
  )
}

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
  
  const supabase = createClient(undefined);

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

  // Helper function to generate dynamic size options (from ManualAddProduct.tsx)
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
      case "T-Shirts":
        if (sizeLabel === "Clothing") {
          sizes.push("XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL")
        }
        break
      case "Figurines":
        if (sizeLabel === "Standard") {
          sizes.push("1/6 Scale", "1/12 Scale", "1/18 Scale", "1/24 Scale", "1/32 Scale", "1/64 Scale")
        } else if (sizeLabel === "Series") {
          sizes.push("Series 1", "Series 2", "Series 3", "Series 4", "Series 5", "Series 6", "Series 7", "Series 8", "Series 9", "Series 10")
        }
        break
      case "Collectibles":
        if (sizeLabel === "Standard") {
          sizes.push("Small", "Medium", "Large", "XL", "Jumbo")
        } else if (sizeLabel === "Series") {
          sizes.push("Common", "Uncommon", "Rare", "Ultra Rare", "Secret Rare", "Chase", "Grail")
        }
        break
      case "Pop Marts":
        if (sizeLabel === "Standard") {
          sizes.push("Regular", "Mini", "Large", "Mega")
        } else if (sizeLabel === "Series") {
          sizes.push("Series 1", "Series 2", "Series 3", "Series 4", "Series 5", "Series 6", "Series 7", "Series 8", "Series 9", "Series 10")
        } else if (sizeLabel === "Limited") {
          sizes.push("Regular", "Chase", "Secret", "Hidden", "Special Edition", "Convention Exclusive")
        }
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
                <SelectItem value="Clothing">Clothing</SelectItem>
                <SelectItem value="Standard">Standard</SelectItem>
                <SelectItem value="Series">Series</SelectItem>
                <SelectItem value="Limited">Limited</SelectItem>
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
