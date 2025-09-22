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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { ChevronDown, ChevronUp, MoreHorizontal, Edit, Trash2, QrCode, ArrowUpDown, Lock, Plus } from "lucide-react"
import jsPDF from "jspdf"
import QRCode from "qrcode"
import { createClient } from "@/lib/supabase/client"
import { Variant, Product } from "@/lib/types"
import Image from "next/image"
import EditProductModal from "@/components/edit-product-modal"
import { ConfirmationModal } from "@/components/confirmation-modal"
import { EditVariantModal } from "@/components/edit-variant-modal"
import { VariantsStatsCard } from "@/components/variants-stats-card"
import PremiumFeatureModal from "@/components/PremiumFeatureModal"

import { formatCurrency, getCurrencySymbol } from "@/lib/utils/currency"
import { useCurrency } from "@/context/CurrencyContext"

import { Badge } from "@/components/ui/badge"
import InventorySearchWithQR from "@/components/inventory-search-with-qr";

const columnHelper = createColumnHelper<Variant>()


export function ShoesVariantsTable() {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "serial_number", desc: true } // Start with largest serial number first
  ])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState("")
  const [variants, setVariants] = useState<Variant[]>([])
  const [loading, setLoading] = useState(true)
  const [editModal, setEditModal] = useState<{ open: boolean, variant?: Variant }>({ open: false })
  const [deleteModal, setDeleteModal] = useState<{ open: boolean, variant?: Variant }>({ open: false })
  const [bulkDeleteModal, setBulkDeleteModal] = useState<{ open: boolean, count: number }>({ open: false, count: 0 })
  const [userPlan, setUserPlan] = useState<string>('free')
  const [showPremiumModal, setShowPremiumModal] = useState(false)
   const { currency } = useCurrency(); // Get the user's selected currency
  const currencySymbol = getCurrencySymbol(currency);
  // Stats state
  const [statsData, setStatsData] = useState({
    totalVariants: 0,
    totalCostValue: 0,
    totalSaleValue: 0,
    profit: 0,
  })
  const [statsLoading, setStatsLoading] = useState(true)

 // Fetch stats from API with caching
 const [lastStatsCache, setLastStatsCache] = useState<number>(0)
 const fetchVariantStats = async () => {
   // Only fetch if it's been more than 30 seconds since last fetch
   const now = Date.now();
   if (now - lastStatsCache < 30000) return;
   
   setStatsLoading(true);
   console.time('fetchVariantStats');
   try {
     const { data: { user } } = await supabase.auth.getUser();
     if (!user) throw new Error("No user");
     const res = await fetch("/api/variant-summary", {
       method: "POST",
       headers: { "Content-Type": "application/json" },
       body: JSON.stringify({ user_id: user.id })
     });
     if (!res.ok) throw new Error("Failed to fetch stats");
     const stats = await res.json();
     setStatsData({
       totalVariants: stats.total_variants ?? 0,
       totalCostValue: stats.total_cost ?? 0,
       totalSaleValue: stats.total_sale ?? 0,
       profit: stats.profit ?? 0
     });
     setLastStatsCache(now);
   } catch (e) {
     setStatsData({ totalVariants: 0, totalCostValue: 0, totalSaleValue: 0, profit: 0 });
   } finally {
     setStatsLoading(false);
     console.timeEnd('fetchVariantStats');
   }
 };
  // Calculate stats locally from available variants only
  const calculateLocalStats = useMemo(() => {
    const availableVariants = variants.filter(v => v.status === 'Available');
    
    const totalVariants = availableVariants.length;
    const totalCostValue = availableVariants.reduce((sum, v) => sum + (v.cost_price || 0), 0);
    const totalSaleValue = availableVariants.reduce((sum, v) => {
      const salePrice = (v as any).product?.sale_price || 0;
      return sum + salePrice;
    }, 0);
    const profit = totalSaleValue - totalCostValue;

    return {
      totalVariants,
      totalCostValue,
      totalSaleValue,
      profit
    };
  }, [variants]);

  // Debug logging for stats data changes
  useEffect(() => {
    console.log('Local stats calculated:', calculateLocalStats);
  }, [calculateLocalStats]);


  // New filter state
  const [locationFilter, setLocationFilter] = useState<string>("all")
  const [sizeFilter, setSizeFilter] = useState<string[]>([]) // Changed to array for multi-select
  const [brandFilter, setBrandFilter] = useState<string>("all")
  const [sizeCategoryFilter, setSizeCategoryFilter] = useState<string>("all")

  // PDF generation handler

  // Open Next.js API route for PDF in new tab
  const handleGeneratePdf = (variant: Variant) => {
    const id = (variant as any).id;
    if (!id) return;
    window.open(`/api/variant-label?id=${encodeURIComponent(id)}`, "_blank");
  }

  // Handle bulk PDF generation with plan checking
  const handleBulkPdfGeneration = () => {
    if (userPlan === 'free') {
      setShowPremiumModal(true);
      return;
    }
    // Bulk PDF: open new tab with ids as query param
    window.open(`/api/variant-label-bulk?ids=${selectedIds.join(',')}`, "_blank");
  }

  // For searchable size dropdown
  const [sizeSearch, setSizeSearch] = useState("")

  const supabase = createClient(undefined)

  // Fetch user plan
  const fetchUserPlan = async () => {
    try {
      const res = await fetch('/api/user-plan')
      const data = await res.json()
      if (data.success) {
        setUserPlan(data.plan.toLowerCase())
      }
    } catch (error) {
      console.error('Failed to fetch user plan:', error)
      setUserPlan('free')
    }
  }

  const fetchVariants = async () => {
    try {
      setLoading(true)
      console.time('fetchVariants')
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
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
          ),
          consignor:consignors (
            id,
            name
          )
        `)
        .eq('user_id', user.id)
        .eq('isArchived', false)
        .neq('status', 'Sold')
        .order('serial_number', { ascending: false }) // Sort by serial number descending

      console.timeEnd('fetchVariants')
      if (error) {
        console.error('Error fetching variants:', error)
      } else {
        console.log('Variants loaded:', data?.length, 'variants');
        setVariants(data || [])
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }


  useEffect(() => {
    console.log('Component mounted, calling fetchVariants and fetchStats');
    fetchVariants()
    fetchVariantStats();
    fetchUserPlan();
  }, [])

  // Debug: Log sorting state
  useEffect(() => {
    console.log('Current sorting state:', sorting);
  }, [sorting])

  // Compute unique filter options
  const locationOptions = useMemo(() => {
    const set = new Set<string>()
    variants.forEach(v => { if (v.location) set.add(v.location) })
    return ["all", ...Array.from(set)]
  }, [variants])
  const sizeOptions = useMemo(() => {
    const set = new Set<string>()
    variants.forEach(v => { if (v.size) set.add(v.size) })
    return ["all", ...Array.from(set)]
  }, [variants])

  // Filtered size options based on search
  const filteredSizeOptions = useMemo(() => {
    if (!sizeSearch) return sizeOptions;
    return sizeOptions.filter(size =>
      size === "all" || size.toLowerCase().includes(sizeSearch.toLowerCase())
    );
  }, [sizeOptions, sizeSearch])
  // Try to use v.product_brand if present, else v.product?.brand for legacy/fetched data
  const brandOptions = useMemo(() => {
    const set = new Set<string>()
    variants.forEach(v => {
      if ((v as any).product_brand) set.add((v as any).product_brand)
      else if ((v as any).product?.brand) set.add((v as any).product.brand)
    })
    return ["all", ...Array.from(set)]
  }, [variants])

  const sizeCategoryOptions = useMemo(() => {
    const set = new Set<string>()
    variants.forEach(v => {
      if ((v as any).product?.size_category) set.add((v as any).product.size_category)
    })
    return ["all", ...Array.from(set)]
  }, [variants])

  // Compute size options grouped by size category
  const sizeOptionsByCategory = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    variants.forEach(v => {
      const sizeCategory = (v as any).product?.size_category;
      if (!sizeCategory) return;
      if (!map[sizeCategory]) map[sizeCategory] = new Set();
      if (v.size) map[sizeCategory].add(String(v.size));
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
  }, [variants]);

  // Filtered variants (all filters except status, which is handled by table column filter)
  const filteredVariants = useMemo(() => {
    let result = variants.filter(v => {
      const brand = (v as any).product_brand || (v as any).product?.brand;
      const sizeCategory = (v as any).product?.size_category;
      return (
        (locationFilter === "all" || v.location === locationFilter) &&
        (sizeFilter.length === 0 || sizeFilter.includes(v.size || "")) &&
        (brandFilter === "all" || brand === brandFilter) &&
        (sizeCategoryFilter === "all" || sizeCategory === sizeCategoryFilter)
      );
    });
    // Global search: serial number, name, sku, brand
    if (globalFilter.trim() !== "") {
      const search = globalFilter.trim().toLowerCase();
      result = result.filter(v => {
        const serial = String((v as any).serial_number ?? "").toLowerCase();
        const name = ((v as any).product?.name ?? "").toLowerCase();
        const sku = ((v as any).product?.sku ?? "").toLowerCase();
        const brand = ((v as any).product?.brand ?? "").toLowerCase();
        
        return serial.includes(search) || name.includes(search) || sku.includes(search) || brand.includes(search);
      });
    }
    return result;
  }, [variants, locationFilter, sizeFilter, brandFilter, sizeCategoryFilter, globalFilter]);

  // Bulk selection state (must be after filteredVariants)
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const allVisibleIds = useMemo(() => filteredVariants.map((v: any) => v.id), [filteredVariants]);
  const isAllSelected = selectedIds.length > 0 && allVisibleIds.every((id: string) => selectedIds.includes(id));
  const toggleSelectAll = () => {
    if (isAllSelected) setSelectedIds([]);
    else setSelectedIds(allVisibleIds);
  };
  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

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
        const variant = info.row.original as any;
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
        );
      },
      enableSorting: false,
      enableColumnFilter: false,
    }),
    // Image
    columnHelper.display({
      id: "image",
      header: "",
      cell: (info) => {
        const variant = info.row.original as any;
        const img = variant.product?.image || "/placeholder.jpg";
        return (
          <div className="flex items-center justify-center min-w-[60px]">
            <Image src={img} alt="Product" width={40} height={40} className="rounded object-cover bg-muted" />
          </div>
        );
      },
      enableSorting: false,
      enableColumnFilter: false,
    }),
    // Serial Number (Stock)
    columnHelper.accessor(
      (row) => (row as any).serial_number,
      {
        id: "serial_number",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="p-0 h-auto font-medium hover:bg-transparent"
            >
              Stock
              {column.getIsSorted() === "asc" ? (
                <ChevronUp className="ml-2 h-4 w-4" />
              ) : column.getIsSorted() === "desc" ? (
                <ChevronDown className="ml-2 h-4 w-4" />
              ) : (
                <ArrowUpDown className="ml-2 h-4 w-4" />
              )}
            </Button>
          )
        },
        cell: (info) => {
          const value = info.getValue();
          return <div className="whitespace-nowrap min-w-[100px] font-medium">{value !== undefined && value !== null ? value : '-'}</div>;
        },
        enableSorting: true,
      }
    ),
    // SKU (from parent product)
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
            {column.getIsSorted() === "asc" ? (
              <ChevronUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === "desc" ? (
              <ChevronDown className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        )
      },
      cell: (info) => {
        const variant = info.row.original as any;
        return <div className="whitespace-nowrap min-w-[100px]">{variant.product?.sku || '-'}</div>;
      },
      enableSorting: true,
      sortingFn: (rowA, rowB) => {
        const a = (rowA.original as any).product?.sku || '';
        const b = (rowB.original as any).product?.sku || '';
        return a.localeCompare(b);
      },
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
        const variant = info.row.original as any;
        return (
          <div className="min-w-[180px]">
            <div className="font-medium">{variant.product?.name || "-"}</div>
            <div className="text-xs text-muted-foreground">{variant.product?.brand || "-"}</div>
          </div>
        );
      },
      enableSorting: true,
      enableColumnFilter: true,
      sortingFn: (rowA, rowB) => {
        const a = (rowA.original as any).product?.name || '';
        const b = (rowB.original as any).product?.name || '';
        return a.localeCompare(b);
      },
    }),
    // Size
    columnHelper.accessor("size", {
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="p-0 h-auto font-medium hover:bg-transparent"
          >
            Size
            {column.getIsSorted() === "asc" ? (
              <ChevronUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === "desc" ? (
              <ChevronDown className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        )
      },
      cell: (info) => {
        const variant = info.row.original as any;
        const size = info.getValue();
        const sizeLabel = variant.size_label;
        return (
          <div className="whitespace-nowrap min-w-[80px] font-medium">
            {size}
            {sizeLabel && (
              <span className="ml-2 text-xs text-muted-foreground">({sizeLabel})</span>
            )}
          </div>
        );
      },
      enableSorting: true,
      sortingFn: (rowA, rowB) => {
        const a = rowA.getValue("size") as string || '';
        const b = rowB.getValue("size") as string || '';
        // Custom sorting for sizes (handle numeric and text sizes)
        const aNum = parseFloat(a);
        const bNum = parseFloat(b);
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return aNum - bNum;
        }
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
        const variant = info.row.original as any;
        const sizeCategory = variant.product?.size_category;
        return (
          <div className="whitespace-nowrap min-w-[100px]">
            {sizeCategory || '-'}
          </div>
        );
      },
      enableSorting: true,
      sortingFn: (rowA, rowB) => {
        const a = (rowA.original as any).product?.size_category || '';
        const b = (rowB.original as any).product?.size_category || '';
        return a.localeCompare(b);
      },
    }),
    // Cost
    columnHelper.accessor("cost_price", {
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
        const value = info.getValue();
        return <div className=" min-w-[100px]">{currencySymbol}{typeof value === 'number' ? value.toFixed(2) : '-'}</div>;
      },
      enableSorting: true,
    }),
    // Price
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
        const variant = info.row.original as any;
        return <div className=" min-w-[100px]">{currencySymbol}{variant.product?.sale_price?.toFixed(2) ?? '-'}</div>;
      },
      enableSorting: true,
      sortingFn: (rowA, rowB) => {
        const a = (rowA.original as any).product?.sale_price || 0;
        const b = (rowB.original as any).product?.sale_price || 0;
        return a - b;
      },
    }),
    // Status (Available, Sold, PullOut, Reserved, PreOrder)
    columnHelper.accessor("status", {
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
        const status = info.getValue() as string;
        let badgeClass = "";
        
        switch (status) {
          case "Available":
            badgeClass = "bg-green-100 text-green-800 border-green-200 hover:bg-green-200";
            break;
          case "Sold":
            badgeClass = "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200";
            break;
          case "PullOut":
            badgeClass = "bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200";
            break;
          case "Reserved":
            badgeClass = "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200";
            break;
          case "PreOrder":
            badgeClass = "bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200";
            break;
          default:
            badgeClass = "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200";
        }
        
        return (
          <div className="min-w-[100px]">
            <Badge 
              variant="outline" 
              className={`${badgeClass} font-medium transition-colors`}
            >
              {status}
            </Badge>
          </div>
        );
      },
      enableSorting: true,
      enableColumnFilter: true,
    }),
    // Owner
    columnHelper.display({
      id: "owner",
      header: () => <span>Owner</span>,
      cell: (info) => {
        const variant = info.row.original as Variant;
        const isStore = variant.owner_type === 'store' || !variant.owner_type || !variant.consignor_id;
        
        return (
          <div className="min-w-[100px]">
            {isStore ? (
              <span className="text-sm font-medium">You</span>
            ) : (
              <span className="text-sm font-medium text-blue-600">
                {variant.consignor?.name || `Consignor ${variant.consignor_id}`}
              </span>
            )}
          </div>
        );
      },
      enableSorting: true,
      enableColumnFilter: true,
    }),
    // (Condition column removed because it's not in Variant type)
    // Date Added
    columnHelper.accessor("created_at", {
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="p-0 h-auto font-medium hover:bg-transparent"
          >
            Date Added
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: (info) => <div className="whitespace-nowrap min-w-[120px]">{new Date(info.getValue() as string).toLocaleDateString()}</div>,
      enableSorting: true,
    }),
    
    // Location
    columnHelper.accessor("location", {
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="p-0 h-auto font-medium hover:bg-transparent"
          >
            Location
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: (info) => {
        const location = info.getValue() as string;
        return <div className="min-w-[100px]">{location || 'Unknown'}</div>;
      },
      enableSorting: true,
    }),

    // Actions
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: (info) => {
        const variant = info.row.original as Variant;
        return (
          <div className="flex justify-center min-w-[100px]">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditModal({ open: true, variant })}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleGeneratePdf(variant)}>
                  <QrCode className="mr-2 h-4 w-4" />
                  Generate PDF
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setDeleteModal({ open: true, variant })}
                  className="text-red-600"
                >
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
  ], [selectedIds, isAllSelected, toggleSelectAll, toggleSelectOne])

  const table = useReactTable({
    data: filteredVariants,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: {
      sorting,
      columnFilters,
    },
    initialState: {
      pagination: { pageSize: 10 },
      sorting: [{ id: "serial_number", desc: true }], // Ensure initial sort is set
    },
    enableSorting: true,
    enableGlobalFilter: false, // Disable since we handle filtering manually
    manualSorting: false, // Let react-table handle sorting
  })

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <VariantsStatsCard 
        totalVariants={calculateLocalStats.totalVariants}
        totalCostValue={calculateLocalStats.totalCostValue}
        totalSaleValue={calculateLocalStats.totalSaleValue}
        loading={false}
      />
      

      
      {/* Bulk actions bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-4 bg-muted px-4 py-2 rounded mb-2">
          <span>{selectedIds.length} selected</span>
          <Button size="sm" variant="destructive" onClick={() => {
            setBulkDeleteModal({ open: true, count: selectedIds.length });
          }}>Bulk Delete</Button>
          <Button 
            size="sm" 
            variant={userPlan === 'free' ? "outline" : "default"} 
            onClick={handleBulkPdfGeneration}
            className={userPlan === 'free' ? "opacity-75" : ""}
          >
            {userPlan === 'free' && <Lock className="w-4 h-4 mr-2" />}
            Bulk Generate PDF
            {userPlan === 'free' && <span className="ml-1 text-xs">(Premium)</span>}
          </Button>
        </div>
      )}

      {/* Filters - search left, filters right, responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 w-full mb-2">
        {/* Search bar left */}
        <div className="flex-1 flex items-center min-w-0">
          <InventorySearchWithQR
            searchTerm={globalFilter}
            onSearchChange={setGlobalFilter}
            placeholder="Search by serial number, name, SKU, or brand..."
            className="w-full"
          />
        </div>
        {/* Filters right, responsive */}
        <div className="flex flex-row gap-2 items-center mt-2 sm:mt-0">
          {/* Size Filter with checkboxes */}
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

          {/* Responsive: show other filters in popover on mobile, inline on desktop */}
          <div className="hidden sm:flex flex-row gap-2 items-center">
            {/* Location Filter */}
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                {locationOptions.map(option => (
                  <SelectItem key={option} value={option}>{option === "all" ? "All Locations" : option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Brand Filter */}
            <Select value={brandFilter} onValueChange={setBrandFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Brand" />
              </SelectTrigger>
              <SelectContent>
                {brandOptions.map(option => (
                  <SelectItem key={option} value={option}>{option === "all" ? "All Brands" : option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Status Filter */}
            <Select value={
              typeof columnFilters.find(f => f.id === "status")?.value === 'string'
                ? String(columnFilters.find(f => f.id === "status")?.value)
                : "all"
            } onValueChange={value => {
              setColumnFilters(filters => {
                const other = filters.filter(f => f.id !== "status");
                return value === "all" ? other : [...other, { id: "status", value }];
              });
            }}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Available">Available</SelectItem>
               
                <SelectItem value="PullOut">PullOut</SelectItem>
                <SelectItem value="Reserved">Reserved</SelectItem>
                <SelectItem value="PreOrder">PreOrder</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Mobile: filter icon popover for other filters */}
          <div className="sm:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="outline" aria-label="Filters">
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 4a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v2a1 1 0 0 1-.293.707l-6.414 6.414A1 1 0 0 0 13 13.414V19a1 1 0 0 1-1.447.894l-2-1A1 1 0 0 1 9 18v-4.586a1 1 0 0 0-.293-.707L2.293 6.707A1 1 0 0 1 2 6V4z"/></svg>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="flex flex-col gap-2 p-2">
                  <Select value={locationFilter} onValueChange={setLocationFilter}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Location" />
                    </SelectTrigger>
                    <SelectContent>
                      {locationOptions.map(option => (
                        <SelectItem key={option} value={option}>{option === "all" ? "All Locations" : option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={brandFilter} onValueChange={setBrandFilter}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Brand" />
                    </SelectTrigger>
                    <SelectContent>
                      {brandOptions.map(option => (
                        <SelectItem key={option} value={option}>{option === "all" ? "All Brands" : option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={typeof columnFilters.find(f => f.id === "status")?.value === 'string' ? String(columnFilters.find(f => f.id === "status")?.value) : "all"} onValueChange={value => {
                    setColumnFilters(filters => {
                      const other = filters.filter(f => f.id !== "status");
                      return value === "all" ? other : [...other, { id: "status", value }];
                    });
                  }}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="Available">Available</SelectItem>
                      <SelectItem value="Sold">Sold</SelectItem>
                      <SelectItem value="PullOut">PullOut</SelectItem>
                      <SelectItem value="Reserved">Reserved</SelectItem>
                      <SelectItem value="PreOrder">PreOrder</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Table with horizontal scroll */}
      <div className="overflow-x-auto rounded-md border">
        <Table className="min-w-[1000px] w-full">
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
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
                <TableCell colSpan={columns.length} className="text-center h-32">
                  <div className="flex flex-col items-center justify-center space-y-4 py-8">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                      <Plus className="w-8 h-8 text-gray-400" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-gray-900">No variant sizes added yet</h3>
                      <p className="text-sm text-gray-500 max-w-sm">
                        Start tracking individual shoes by adding variants with specific sizes, costs, and locations to your products.
                      </p>
                    </div>
                    <Link href="/add-product">
                      <Button className="mt-2">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Product with Variants
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
      <EditVariantModal
        open={editModal.open}
        variant={editModal.variant}
        onClose={(updated) => {
          setEditModal({ open: false })
          if (updated) {
            fetchVariants(); // Refresh the table data
            fetchVariantStats(); // Refresh stats data
            setSorting([{ id: "serial_number", desc: true }]); // Reset sort to Stock descending
          }
        }}
      />

      {/* Delete Modal */}
      <ConfirmationModal
        open={deleteModal.open && !!deleteModal.variant}
        onOpenChange={(open) => setDeleteModal({ open, variant: open ? deleteModal.variant : undefined })}
        title="Delete Variant"
        description="Are you sure you want to delete this variant? This action cannot be undone."
        isConfirming={false}
        onConfirm={async () => {
          if (deleteModal.variant?.id) {
            await supabase.from('variants').delete().eq('id', deleteModal.variant.id);
          }
          setDeleteModal({ open: false });
          await fetchVariants();
          fetchVariantStats(); // Refresh stats data
          setSorting([{ id: "serial_number", desc: true }]); // Reset sort to Stock descending
        }}
      />

      {/* Bulk Delete Modal */}
      <ConfirmationModal
        open={bulkDeleteModal.open}
        onOpenChange={(open) => setBulkDeleteModal({ open, count: bulkDeleteModal.count })}
        title="Bulk Delete Variants"
        description={`Are you sure you want to delete ${bulkDeleteModal.count} selected variants? This action cannot be undone.`}
        isConfirming={false}
        onConfirm={async () => {
          // Bulk delete
          await supabase.from('variants').delete().in('id', selectedIds);
          setSelectedIds([]);
          setBulkDeleteModal({ open: false, count: 0 });
          await fetchVariants();
          fetchVariantStats(); // Refresh stats data
          setSorting([{ id: "serial_number", desc: true }]); // Reset sort to Stock descending
        }}
      />

      {/* Premium Feature Modal */}
      <PremiumFeatureModal
        open={showPremiumModal}
        onOpenChange={setShowPremiumModal}
        featureName="Bulk PDF Generation"
      />

    </div>
  )
}
