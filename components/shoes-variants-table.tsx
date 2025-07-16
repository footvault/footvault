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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown, ChevronUp, MoreHorizontal, Edit, Trash2, QrCode, ArrowUpDown } from "lucide-react"
import jsPDF from "jspdf"
import QRCode from "qrcode"
import { createClient } from "@/lib/supabase/client"
import { Variant, Product } from "@/lib/types"
import Image from "next/image"
import EditProductModal from "@/components/edit-product-modal"
import { ConfirmationModal } from "@/components/confirmation-modal"
import { EditVariantModal } from "@/components/edit-variant-modal"

import { Badge } from "@/components/ui/badge"

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


  // New filter state
  const [locationFilter, setLocationFilter] = useState<string>("all")
  const [sizeFilter, setSizeFilter] = useState<string>("all")
  const [brandFilter, setBrandFilter] = useState<string>("all")
  const [sizeCategoryFilter, setSizeCategoryFilter] = useState<string>("all")

  // PDF generation handler

  // Open Next.js API route for PDF in new tab
  const handleGeneratePdf = (variant: Variant) => {
    const id = (variant as any).id;
    if (!id) return;
    window.open(`/api/variant-label?id=${encodeURIComponent(id)}`, "_blank");
  }
  // For searchable size dropdown
  const [sizeSearch, setSizeSearch] = useState("")

  const supabase = createClient()

  const fetchVariants = async () => {
    try {
      setLoading(true)
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
          )
        `)
        .eq('user_id', user.id)
        .eq('isArchived', false)
        .order('serial_number', { ascending: false }) // Sort by serial number descending

      if (error) {
        console.error('Error fetching variants:', error)
      } else {
        setVariants(data || [])
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVariants()
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

  // Filtered variants (all filters except status, which is handled by table column filter)
  const filteredVariants = useMemo(() => {
    const result = variants.filter(v => {
      const brand = (v as any).product_brand || (v as any).product?.brand;
      const sizeCategory = (v as any).product?.size_category;
      return (
        (locationFilter === "all" || v.location === locationFilter) &&
        (sizeFilter === "all" || v.size === sizeFilter) &&
        (brandFilter === "all" || brand === brandFilter) &&
        (sizeCategoryFilter === "all" || sizeCategory === sizeCategoryFilter)
      );
    });
    console.log('Filtered serial_numbers:', result.map(v => (v as any).serial_number));
    console.log('Full filteredVariants:', result);
    return result;
  }, [variants, locationFilter, sizeFilter, brandFilter, sizeCategoryFilter]);

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
        return <div className=" min-w-[100px]">${typeof value === 'number' ? value.toFixed(2) : '-'}</div>;
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
        return <div className=" min-w-[100px]">${variant.product?.sale_price?.toFixed(2) ?? '-'}</div>;
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
        let badgeVariant: any = "default";
        if (status === "Sold") badgeVariant = "secondary";
        else if (["PullOut", "Reserved", "PreOrder"].includes(status)) badgeVariant = "outline";
        else if (status !== "Available") badgeVariant = "destructive";
        return (
          <div className="min-w-[100px]">
            <Badge variant={badgeVariant}>{status}</Badge>
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
    // Date Sold
    columnHelper.display({
      id: "date_sold",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="p-0 h-auto font-medium hover:bg-transparent"
          >
            Date Sold
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: (info) => {
        const variant = info.row.original as any;
        const dateSold = variant.date_sold;
        return (
          <div className="whitespace-nowrap min-w-[120px]">
            {dateSold ? new Date(dateSold).toLocaleDateString() : 'Empty'}
          </div>
        );
      },
      enableSorting: true,
      sortingFn: (rowA, rowB) => {
        const a = (rowA.original as any).date_sold;
        const b = (rowB.original as any).date_sold;
        if (!a && !b) return 0;
        if (!a) return 1; // Empty dates go to bottom
        if (!b) return -1;
        return new Date(a).getTime() - new Date(b).getTime();
      },
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
      sorting: [{ id: "serial_number", desc: true }], // Ensure initial sort is set
    },
    enableSorting: true,
    manualSorting: false, // Let react-table handle sorting
  })

  return (
    <div className="space-y-4">
      {/* Bulk actions bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-4 bg-muted px-4 py-2 rounded mb-2">
          <span>{selectedIds.length} selected</span>
          <Button size="sm" variant="outline" onClick={async () => {
            // Bulk archive
            await supabase.from('variants').update({ isArchived: true }).in('id', selectedIds);
            setSelectedIds([]);
            fetchVariants();
          }}>Bulk Archive</Button>
          <Button size="sm" variant="default" onClick={() => {
            // Bulk PDF: open new tab with ids as query param
            window.open(`/api/variant-label-bulk?ids=${selectedIds.join(',')}`, "_blank");
          }}>Bulk Generate PDF</Button>
        </div>
      )}
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder="Search by name, brand, SKU, or stock..."
          value={globalFilter ?? ""}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex gap-2 flex-wrap">
          {/* Location Filter */}
          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Locations" />
            </SelectTrigger>
            <SelectContent>
              {locationOptions.map(loc => (
                <SelectItem key={loc} value={loc}>{loc === "all" ? "All Locations" : loc}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* Size Filter - searchable */}
          <Select value={sizeFilter} onValueChange={setSizeFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Sizes" />
            </SelectTrigger>
            <SelectContent>
              <div className="px-2 py-1 sticky top-0 bg-white z-10">
                <input
                  type="text"
                  placeholder="Search size..."
                  className="w-full px-2 py-1 border rounded text-sm mb-1"
                  value={sizeSearch}
                  onChange={e => setSizeSearch(e.target.value)}
                  onClick={e => e.stopPropagation()}
                />
              </div>
              {filteredSizeOptions.map(size => (
                <SelectItem key={size} value={size}>{size === "all" ? "All Sizes" : size}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
      <EditVariantModal
        open={editModal.open}
        variant={editModal.variant}
        onClose={(updated) => {
          setEditModal({ open: false })
          if (updated) {
            fetchVariants(); // Refresh the table data
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
          setSorting([{ id: "serial_number", desc: true }]); // Reset sort to Stock descending
        }}
      />

    </div>
  )
}
