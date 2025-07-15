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
import { ChevronDown, ChevronUp } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Variant, Product } from "@/lib/types"
import Image from "next/image"
import EditProductModal from "@/components/edit-product-modal"
import { ConfirmationModal } from "@/components/confirmation-modal"
import { Badge } from "@/components/ui/badge"

const columnHelper = createColumnHelper<Variant>()


export function ShoesVariantsTable() {
  const [sorting, setSorting] = useState<SortingState>([])
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
        .order('created_at', { ascending: false })

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

  // Filtered variants
  const filteredVariants = useMemo(() => {
    return variants.filter(v => {
      const brand = (v as any).product_brand || (v as any).product?.brand;
      return (
        (locationFilter === "all" || v.location === locationFilter) &&
        (sizeFilter === "all" || v.size === sizeFilter) &&
        (brandFilter === "all" || brand === brandFilter)
      );
    })
  }, [variants, locationFilter, sizeFilter, brandFilter])

  const columns = useMemo(() => [
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
    columnHelper.display({
      id: "serial_number",
      header: "Stock",
      cell: (info) => {
        const variant = info.row.original as any;
        return <div className="whitespace-nowrap min-w-[100px] font-medium">{variant.serial_number || '-'}</div>;
      },
      enableSorting: true,
    }),
    // SKU (from parent product)
    columnHelper.display({
      id: "sku",
      header: "SKU",
      cell: (info) => {
        const variant = info.row.original as any;
        return <div className="whitespace-nowrap min-w-[100px]">{variant.product?.sku || '-'}</div>;
      },
      enableSorting: true,
    }),
    // Name (brand below)
    columnHelper.display({
      id: "name",
      header: "Name",
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
    }),
    // Size
    columnHelper.accessor("size", {
      header: "Size",
      cell: (info) => <div className="whitespace-nowrap min-w-[80px] font-medium">{info.getValue()}</div>,
      enableSorting: true,
    }),
    // Cost
    columnHelper.accessor("cost_price", {
      header: "Cost",
      cell: (info) => {
        const value = info.getValue();
        return <div className=" min-w-[100px]">${typeof value === 'number' ? value.toFixed(2) : '-'}</div>;
      },
      enableSorting: true,
    }),
    // Price
    columnHelper.display({
      id: "price",
      header: "Price",
      cell: (info) => {
        const variant = info.row.original as any;
        return <div className=" min-w-[100px]">${variant.product?.sale_price?.toFixed(2) ?? '-'}</div>;
      },
      enableSorting: true,
    }),
    // Status (Available, Sold, PullOut, Reserved, PreOrder)
    columnHelper.accessor("status", {
      header: "Status",
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
      header: "Date Added",
      cell: (info) => <div className="whitespace-nowrap min-w-[120px]">{new Date(info.getValue() as string).toLocaleDateString()}</div>,
      enableSorting: true,
    }),
    // Date Sold
    columnHelper.accessor("updated_at", {
      header: "Date Sold",
      cell: (info) => <div className="whitespace-nowrap min-w-[120px]">{new Date(info.getValue() as string).toLocaleDateString()}</div>,
      enableSorting: true,
    }),
    // Actions
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: (info) => {
        const variant = info.row.original as Variant;
        return (
          <div className="flex gap-2 min-w-[100px]">
            <Button size="icon" variant="ghost" onClick={() => setEditModal({ open: true, variant })} title="Edit">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536M9 11l6 6M3 21h6l11-11a2.828 2.828 0 0 0-4-4L5 17v4z"/></svg>
            </Button>
            <Button size="icon" variant="ghost" onClick={() => setDeleteModal({ open: true, variant })} title="Delete">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 6h18M9 6v12a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V6m-6 0V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>
            </Button>
          </div>
        );
      },
      enableSorting: false,
      enableColumnFilter: false,
    }),
  ], [])

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
    },
  })

  return (
    <div className="space-y-4">
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
      {editModal.open && editModal.variant && (
        <EditProductModal
          open={editModal.open}
          onOpenChange={(open) => setEditModal({ open, variant: open ? editModal.variant : undefined })}
          product={editModal.variant}
          onProductUpdated={fetchVariants}
        />
      )}
      {/* Delete Modal */}
      {deleteModal.open && deleteModal.variant && (
        <ConfirmationModal
          open={deleteModal.open}
          onOpenChange={(open) => setDeleteModal({ open, variant: open ? deleteModal.variant : undefined })}
          title="Delete Variant"
          description="Are you sure you want to delete this variant? This action cannot be undone."
          isConfirming={false}
          onConfirm={async () => {
            // Implement your delete logic here
            setDeleteModal({ open: false });
            await fetchVariants();
          }}
        />
      )}
    </div>
  )
}
