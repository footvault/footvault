"use client"
import { createClient } from "@/lib/supabase/client";
import { Variant, Product } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { useRouter } from "next/navigation";
import * as React from "react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Trash2 } from "lucide-react";

import { formatCurrency, getCurrencySymbol } from "@/lib/utils/currency"
import { useCurrency } from "@/context/CurrencyContext"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input as ShadInput } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { VariantsStatsCard } from "@/components/variants-stats-card";

type EditVariantModalProps = {
  open: boolean;
  onClose: () => void;
  variant: Variant | null;
  product: Product | null;
  onSave: (data: any) => void;
};
function EditVariantModal({ open, onClose, variant, product, onSave }: EditVariantModalProps) {
  const [status, setStatus] = useState(variant?.status || "Available");
  // Use the variant's cost_price if available, otherwise fall back to product's original_price
  const [cost, setCost] = useState((variant?.cost_price || product?.original_price)?.toString() ?? "");
  const [price, setPrice] = useState(product?.sale_price?.toString() ?? "");
  const [sizeCategory, setSizeCategory] = useState(product?.size_category || "");
   const { currency } = useCurrency(); // Get the user's selected currency
  const currencySymbol = getCurrencySymbol(currency);
  
  // Check if this variant is sold
  const isSold = variant?.status === "Sold";
  
  // Update state when variant or product changes
  useEffect(() => {
    setStatus(variant?.status || "Available");
    // Use the variant's cost_price if available, otherwise fall back to product's original_price
    setCost((variant?.cost_price || product?.original_price)?.toString() ?? "");
    setPrice(product?.sale_price?.toString() ?? "");
    setSizeCategory(product?.size_category || "");
  }, [variant, product]);
  if (!open) return null;
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Edit Variant</DialogTitle>
          {isSold && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              ⚠️ This item is marked as "Sold". Status cannot be changed unless the sale is refunded first.
            </div>
          )}
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <label className="block text-xs mb-1">Status</label>
            <Select value={status} onValueChange={setStatus} disabled={isSold}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Available">Available</SelectItem>
              
                <SelectItem value="PullOut">PullOut</SelectItem>
                <SelectItem value="Reserved">Reserved</SelectItem>
                <SelectItem value="PreOrder">PreOrder</SelectItem>
              </SelectContent>
            </Select>
            {isSold && (
              <p className="text-xs text-muted-foreground mt-1">
                Status is locked for sold items
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs mb-1">Cost</label>
            <ShadInput type="number" value={cost} onChange={e => setCost(e.target.value)} min={0} step="0.01" />
          </div>
          <div>
            <label className="block text-xs mb-1">Price</label>
            <ShadInput type="number" value={price} onChange={e => setPrice(e.target.value)} min={0} step="0.01" />
          </div>
          <div>
            <label className="block text-xs mb-1">Size Category</label>
            <ShadInput value={sizeCategory} onChange={e => setSizeCategory(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave({ 
            status, 
            cost_price: cost, // Use cost_price to match database schema
            sale_price: price, 
            size_category: sizeCategory, 
            original_price: cost // Also include original_price for product update
          })}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type ConfirmDeleteModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
};
function ConfirmDeleteModal({ open, onClose, onConfirm }: ConfirmDeleteModalProps) {
  if (!open) return null;
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Delete Variant</DialogTitle>
        </DialogHeader>
        <div className="mb-4 text-sm">Are you sure you want to delete this variant? This action cannot be undone.</div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm}>Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface Props {
  params: Promise<{ productId: string; size: string }>;
}

export default function ProductVariantsBySizePage({ params }: Props) {
  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("");
  // Unwrap params for Next.js app router
  const { productId, size } = React.use(params); // This will extract values from the Promise

  const [variants, setVariants] = useState<Variant[]>([]);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState<{ open: boolean; variant: Variant | null }>({ open: false, variant: null });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; variant: Variant | null }>({ open: false, variant: null });
  const supabase = createClient();
  const router = useRouter();
   const { currency } = useCurrency(); // Get the user's selected currency
  const currencySymbol = getCurrencySymbol(currency);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const { data: productData } = await supabase.from("products").select("*").eq("id", productId).single();
      setProduct(productData || null);
      const { data: variantsData } = await supabase
        .from("variants")
        .select("*")
        .eq("product_id", productId)
        .eq("size", size)
        .eq("isArchived", false)
        .order("serial_number", { ascending: false }); // Ensure consistent order by serial_number
      setVariants(variantsData || []);
      setLoading(false);
    }
    fetchData();
  }, [productId, size]);

  // Calculate stats for all variants (not just filtered ones) - MOVED BEFORE CONDITIONAL RETURNS
  const stats = React.useMemo(() => {
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

  // Filtered variants
  const filteredVariants = variants.filter(v => {
    let statusOk = statusFilter === "all" || v.status === statusFilter;
    let dateOk = true;
    if (dateFilter) {
      // Compare only date part
      const created = v.created_at ? new Date(v.created_at).toISOString().slice(0, 10) : "";
      dateOk = created === dateFilter;
    }
    return statusOk && dateOk;
  });

  if (loading) return <div className="p-8">Loading...</div>;
  if (!product) return <div className="p-8">Product not found.</div>;

  // Edit handler
  async function handleEditSave(data: any) {
    if (!editModal.variant) return;
    
    console.log("Saving variant with data:", data);
    
    // Update variant status and cost_price (matching the actual database schema)
    const { error: variantError } = await supabase.from("variants").update({
      // Don't update serial_number since we removed it from the form
      status: data.status,
      // Use cost_price as it's the column name in the variants table
      cost_price: data.cost_price !== undefined ? Number(data.cost_price) : undefined,
    }).eq("id", editModal.variant.id);
    
    if (variantError) {
      console.error("Error updating variant:", variantError);
      return;
    }
    
    // Optionally update product's size_category, cost, price if changed
    if (product && (
      product.size_category !== data.size_category ||
      product.original_price !== Number(data.original_price) ||
      product.sale_price !== Number(data.sale_price)
    )) {
      const { error: productError } = await supabase.from("products").update({
        size_category: data.size_category,
        original_price: Number(data.original_price),
        sale_price: Number(data.sale_price),
      }).eq("id", product.id);
      
      if (productError) {
        console.error("Error updating product:", productError);
      } else {
        // Refresh product
        const { data: productData } = await supabase.from("products").select("*").eq("id", productId).single();
        setProduct(productData || null);
      }
    }
    // Refresh data before closing modal
    const { data: variantsData, error: variantsFetchError } = await supabase
      .from("variants")
      .select("*")
      .eq("product_id", productId)
      .eq("size", size)
      .eq("isArchived", false);
      
    
    if (variantsFetchError) {
      console.error("Error fetching updated variants:", variantsFetchError);
    } else {
      // Make sure to update local state with fresh data
      if (variantsData) {
        console.log("Updated variants data:", variantsData);
        setVariants(variantsData);
      }
    }
    
    // Close modal after data is refreshed
    setEditModal({ open: false, variant: null });
  }

  // Delete handler
  async function handleDeleteConfirm() {
    if (!deleteModal.variant) return;
    
    const { error: deleteError } = await supabase.from("variants").delete().eq("id", deleteModal.variant.id);
    
    if (deleteError) {
      console.error("Error deleting variant:", deleteError);
      return;
    }
    
    // Refresh data before closing modal
    const { data: variantsData, error: fetchError } = await supabase
      .from("variants")
      .select("*")
      .eq("product_id", productId)
      .eq("size", size)
      .eq("isArchived", false);
    
    if (fetchError) {
      console.error("Error fetching variants after delete:", fetchError);
    } else {
      // Update local state with fresh data
      if (variantsData) {
        console.log("Updated variants after delete:", variantsData);
        setVariants(variantsData);
      }
    }
    
    // Close modal after data is refreshed
    setDeleteModal({ open: false, variant: null });
  }

  return (
    <div className="px-2 py-4 max-w-7xl mx-auto w-full">
        <Link href="/inventory">
      <Button variant="outline" className="mb-4">
        ← Back
      </Button>
      </Link>
      
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
      
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4 items-center">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Available">Available</SelectItem>
            <SelectItem value="Sold">Sold</SelectItem>
            <SelectItem value="PullOut">PullOut</SelectItem>
            <SelectItem value="Reserved">Reserved</SelectItem>
            <SelectItem value="PreOrder">PreOrder</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={dateFilter}
          onChange={e => setDateFilter(e.target.value)}
          className="w-[180px]"
          placeholder="Date Added"
        />
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <Image src={product.image || "/placeholder.jpg"} alt="Product" width={60} height={60} className="rounded object-cover bg-muted mx-auto sm:mx-0" />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-lg truncate">{product.name}</div>
          <div className="text-muted-foreground text-sm truncate">{product.brand}</div>
          <div className="text-xs mt-1 truncate">SKU: {product.sku}</div>
        </div>
        <div className="sm:ml-auto text-base font-semibold text-center sm:text-right">Size: {size}</div>
      </div>
      <div className="overflow-x-auto rounded-md border bg-background container">
        <Table className="min-w-[1200px] w-full text-sm">
          <TableHeader>
            <TableRow>
              <TableHead>Image</TableHead>
              <TableHead>Serial Number</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Size Category</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Date Added</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVariants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center">No variants for this size.</TableCell>
              </TableRow>
            ) : (
              filteredVariants.map(variant => (
                <TableRow key={variant.id}>
                  
                  <TableCell>
                    <Image src={product.image || "/placeholder.jpg"} alt="Product" width={40} height={40} className="rounded object-cover bg-muted" />
                  </TableCell>
                  <TableCell>{variant.serial_number || '-'}</TableCell>
                  <TableCell>
                    <div className="font-medium truncate max-w-[120px]">{product.name}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-[120px]">{product.brand}</div>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold">{variant.size}</span>
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const status = variant.status || '-';
                      let badgeVariant: string = 'default';
                      if (status === 'Available') badgeVariant = 'success';
                      else if (status === 'Sold') badgeVariant = 'destructive';
                      else if (status === 'Reserved') badgeVariant = 'warning';
                      else if (status === 'PullOut') badgeVariant = 'destructive';
                      else if (status === 'PreOrder') badgeVariant = 'default';
                      
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
                      );
                    })()}
                  </TableCell>
                  <TableCell>{product.size_category || "-"}</TableCell>
                  <TableCell>{currencySymbol}{typeof variant.cost_price === 'number' ? variant.cost_price.toFixed(2) : (typeof product.original_price === 'number' ? product.original_price.toFixed(2) : '-')}</TableCell>
                  <TableCell>{currencySymbol}{typeof product.sale_price === 'number' ? product.sale_price.toFixed(2) : '-'}</TableCell>
                  <TableCell>{variant.created_at ? new Date(variant.created_at).toISOString().slice(0, 10) : "-"}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onClick={() => setEditModal({ open: true, variant: variant })}
                          disabled={variant.status === "Sold"}
                        >
                          <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => setDeleteModal({ open: true, variant: variant })} 
                          className="text-red-600"
                          disabled={variant.status === "Sold"}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                        {variant.status === "Sold" && (
                          <div className="px-2 py-1 text-xs text-muted-foreground">
                            Sold items cannot be modified
                          </div>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {/* Edit Modal */}
      <EditVariantModal
        open={editModal.open}
        variant={editModal.variant}
        product={product}
        onClose={() => setEditModal({ open: false, variant: null })}
        onSave={handleEditSave}
      />
      {/* Delete Modal */}
      <ConfirmDeleteModal
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, variant: null })}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );

}

export const dynamic = "force-dynamic";
function order(arg0: string, arg1: { ascending: boolean; }) {
    throw new Error("Function not implemented.");
}

