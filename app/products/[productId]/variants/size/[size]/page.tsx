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

interface Props {
  params: Promise<{ productId: string; size: string }>;
}

export default function ProductVariantsBySizePage({ params }: Props) {
      // Filter state
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("");
  // Unwrap params for Next.js app router
  const { productId, size } = React.use(params);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

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
        .eq("isArchived", false);
      setVariants(variantsData || []);
      setLoading(false);
    }
    fetchData();
  }, [productId, size]);

  if (loading) return <div className="p-8">Loading...</div>;
  if (!product) return <div className="p-8">Product not found.</div>;

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

  return (
    <div className="px-2 sm:px-4 md:px-8 py-4 max-w-4xl mx-auto w-full">
      <Button variant="outline" className="mb-4" onClick={() => router.back()}>
        ← Back
      </Button>
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
                 <TableHead>Stock</TableHead>
              <TableHead>Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Size</TableHead>
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
                    <TableCell>{variant.serial_number || '-'}</TableCell>
                  <TableCell>
                    <Image src={product.image || "/placeholder.jpg"} alt="Product" width={40} height={40} className="rounded object-cover bg-muted" />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium truncate max-w-[120px]">{product.name}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-[120px]">{product.brand}</div>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold">{variant.size}</span>
                  </TableCell>
                  <TableCell>{product.size_category || "-"}</TableCell>
                  <TableCell>{variant.serial_number || '-'}</TableCell>
                  <TableCell>${typeof product.original_price === 'number' ? product.original_price.toFixed(2) : '-'}</TableCell>
                  <TableCell>${typeof product.sale_price === 'number' ? product.sale_price.toFixed(2) : '-'}</TableCell>
                  <TableCell>{variant.created_at ? new Date(variant.created_at).toISOString().slice(0, 10) : "-"}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {/* TODO: Edit logic */}}>
                          <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {/* TODO: Delete logic */}} className="text-red-600">
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";
