"use client"
import { createClient } from "@/lib/supabase/client";
import { Variant, Product } from "@/lib/types";
import { fetchCustomLocations, CustomLocation } from "@/lib/fetchCustomLocations";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { useRouter } from "next/navigation";
import * as React from "react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Trash2, MapPin, Plus } from "lucide-react";

import { formatCurrency, getCurrencySymbol } from "@/lib/utils/currency"
import { useCurrency } from "@/context/CurrencyContext"
import { insertVariantsWithUniqueSerials } from "@/lib/utils/serial-number-generator"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input as ShadInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  // Use variant's sale_price if available, otherwise fall back to product's sale_price
  const [price, setPrice] = useState(((variant as any)?.sale_price || product?.sale_price)?.toString() ?? "");
  const [sizeCategory, setSizeCategory] = useState(product?.size_category || "");
  const [location, setLocation] = useState(variant?.location || "");
  
  // Location management state
  const [customLocations, setCustomLocations] = useState<CustomLocation[]>([]);
  const [showAddLocationInput, setShowAddLocationInput] = useState(false);
  const [newLocation, setNewLocation] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState<string | undefined>(undefined);
  
  const { currency } = useCurrency(); // Get the user's selected currency
  const currencySymbol = getCurrencySymbol(currency);
  const supabase = createClient();
  
  // Check if this variant is sold
  const isSold = variant?.status === "Sold";

  // Fetch custom locations
  useEffect(() => {
    if (!open) return;
    
    const fetchLocations = async () => {
      const response = await fetchCustomLocations();
      if (response.success && response.data) {
        setCustomLocations(response.data);
        
        // Set selectedLocationId from variant's location_id
        if (variant?.location) {
          setSelectedLocationId(variant.location);
        } else if (variant?.location) {
          // Fallback: find location by name if only text location exists
          const matchingLoc = response.data.find(loc => loc.name === variant.location);
          if (matchingLoc) setSelectedLocationId(matchingLoc.id);
        }
      }
    };
    
    fetchLocations();
  }, [open, variant]);
  
  // Update state when variant or product changes
  useEffect(() => {
    setStatus(variant?.status || "Available");
    // Use the variant's cost_price if available, otherwise fall back to product's original_price
    setCost((variant?.cost_price || product?.original_price)?.toString() ?? "");
    // Use variant's sale_price if available, otherwise fall back to product's sale_price
    setPrice(((variant as any)?.sale_price || product?.sale_price)?.toString() ?? "");
    setSizeCategory(product?.size_category || "");
    setLocation(variant?.location || "");
  }, [variant, product]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setShowAddLocationInput(false);
      setNewLocation("");
    }
  }, [open]);

  const handleAddLocation = async () => {
    if (!newLocation.trim()) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("custom_locations")
        .insert({ name: newLocation.trim(), user_id: user.id })
        .select()
        .single();

      if (!error && data) {
        const newLoc: CustomLocation = data;
        setCustomLocations(prev => [...prev, newLoc]);
        setLocation(newLoc.name);
        setSelectedLocationId(newLoc.id);
        setNewLocation("");
        setShowAddLocationInput(false);
      }
    } catch (error) {
      console.error('Error adding location:', error);
    }
  };
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
          <div>
            <Label className="flex items-center gap-2 text-xs mb-1">
              <MapPin className="h-3 w-3" />
              Location
            </Label>
            <div className="space-y-2">
              {showAddLocationInput ? (
                <div className="flex gap-2">
                  <ShadInput
                    placeholder="Enter new location name"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddLocation()}
                  />
                  <Button onClick={handleAddLocation} size="sm">
                    Add
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowAddLocationInput(false)}
                    size="sm"
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Select value={selectedLocationId} onValueChange={(value) => {
                  if (value === "__add_new__") {
                    setShowAddLocationInput(true);
                  } else {
                    setSelectedLocationId(value);
                    const loc = customLocations.find(l => l.id === value);
                    if (loc) setLocation(loc.name);
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {customLocations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="__add_new__" className="border-t">
                      <div className="flex items-center gap-2 text-blue-600">
                        <Plus className="h-3 w-3" />
                        Add New Location
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave({ 
            status, 
            cost_price: cost, // Use cost_price to match database schema
            sale_price: price, 
            size_category: sizeCategory, 
            location, // Keep for backward compatibility
            location_id: selectedLocationId, // New: use location ID
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

type BulkAddVariantModalProps = {
  open: boolean;
  product: Product | null;
  size: string;
  onOpenChange: (open: boolean) => void;
  onVariantsAdded: () => void;
};

function BulkAddVariantModal({ open, product, size, onOpenChange, onVariantsAdded }: BulkAddVariantModalProps) {
  const [quantity, setQuantity] = useState<number>(1);
  const [status, setStatus] = useState<string>("Available");
  const [location, setLocation] = useState<string>("");
  const [costPrice, setCostPrice] = useState<string>("");
  const [salePrice, setSalePrice] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // For location management
  const [customLocations, setCustomLocations] = useState<CustomLocation[]>([]);
  const [showAddLocationInput, setShowAddLocationInput] = useState(false);
  const [newLocation, setNewLocation] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState<string | undefined>(undefined);
  
  const supabase = createClient();
  const { currency } = useCurrency();
  const currencySymbol = getCurrencySymbol(currency);

  // Fetch custom locations
  useEffect(() => {
    if (!open) return;
    
    const fetchLocations = async () => {
      const result = await fetchCustomLocations();
      if (result.success && result.data) {
        setCustomLocations(result.data);
      }
    };
    
    fetchLocations();
  }, [open]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!open) {
      setQuantity(1);
      setStatus("Available");
      setLocation("");
      setSelectedLocationId(undefined);
      setCostPrice("");
      setSalePrice("");
      setShowAddLocationInput(false);
      setNewLocation("");
    }
  }, [open]);

  const handleAddLocation = async () => {
    if (!newLocation.trim()) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("custom_locations")
        .insert({ name: newLocation.trim(), user_id: user.id })
        .select()
        .single();

      if (!error && data) {
        const newLoc: CustomLocation = data;
        setCustomLocations(prev => [...prev, newLoc]);
        setLocation(newLoc.name);
        setSelectedLocationId(newLoc.id);
        setNewLocation("");
        setShowAddLocationInput(false);
      }
    } catch (error) {
      console.error('Error adding location:', error);
    }
  };

  const handleSubmit = async () => {
    if (!product || !location || quantity < 1) return;
    
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const selectedLocation = customLocations.find(loc => loc.name === location);
      
      // Create variants for the quantity specified
      const variantsToCreate = [];
      for (let i = 0; i < quantity; i++) {
        const variant = {
          id: crypto.randomUUID(),
          product_id: product.id,
          size: size,
          status: status,
          location: location,
          location_id: selectedLocation?.id,
          date_added: new Date().toISOString().slice(0, 10),
          variant_sku: `${product.sku || 'SKU'}-${size}`,
          cost_price: parseFloat(costPrice) || 0.00,
          sale_price: parseFloat(salePrice) || 0.00,
          size_label: "US", // Default, can be made dynamic if needed
          type: 'In Stock',
        };
        variantsToCreate.push(variant);
      }

      const result = await insertVariantsWithUniqueSerials(variantsToCreate, user.id, supabase);
      
      if (!result.success) {
        alert(`Error creating variants: ${result.error || 'Unknown error'}`);
        return;
      }

      onVariantsAdded();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating variants:', error);
      alert(`Error creating variants: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Add Variants</DialogTitle>
          <DialogDescription>
            Add multiple variants for {product.name} (Size: {size})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quantity */}
          <div className="space-y-2">
            <Label>Quantity</Label>
            <Input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full"
            />
            <div className="text-sm text-muted-foreground">
              Total variants to create: {quantity}
            </div>
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
                      <SelectItem key={loc.id} value={loc.name}>{loc.name}</SelectItem>
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

          {/* Cost Price */}
          <div className="space-y-2">
            <Label>Cost Price ({currencySymbol})</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
              placeholder="0.00"
              className="w-full"
            />
          </div>

          {/* Sale Price */}
          <div className="space-y-2">
            <Label>Sale Price ({currencySymbol})</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
              placeholder="0.00"
              className="w-full"
            />
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
            disabled={isSubmitting || !location}
          >
            {isSubmitting ? "Creating..." : `Add ${quantity} Variant${quantity > 1 ? 's' : ''}`}
          </Button>
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
  const [statusFilter, setStatusFilter] = useState<string>("Available");
  const [dateFilter, setDateFilter] = useState<string>("");
  // Unwrap params for Next.js app router
  const { productId, size } = React.use(params); // This will extract values from the Promise

  const [variants, setVariants] = useState<Variant[]>([]);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState<{ open: boolean; variant: Variant | null }>({ open: false, variant: null });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; variant: Variant | null }>({ open: false, variant: null });
  const [bulkAddModal, setBulkAddModal] = useState<boolean>(false);
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
        .select(`
          *,
          consignor:consignors (
            id,
            name
          ),
          custom_locations!location_id (
            id,
            name
          )
        `)
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
  // Exclude "Sold" variants from stats calculation
  const stats = React.useMemo(() => {
    const availableVariants = variants.filter(v => v.status !== 'Sold');
    const totalVariants = availableVariants.length;
    const totalCostValue = availableVariants.reduce((sum, variant) => {
      const cost = variant.cost_price || product?.original_price || 0;
      return sum + cost;
    }, 0);
    const totalSaleValue = availableVariants.reduce((sum, variant) => {
      // Use variant's sale_price first, fallback to product's sale_price
      const price = (variant as any).sale_price ?? product?.sale_price ?? 0;
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
    
    // Update variant with cost_price and sale_price at variant level
    const { error: variantError } = await supabase.from("variants").update({
      // Don't update serial_number since we removed it from the form
      status: data.status,
      // Use cost_price as it's the column name in the variants table
      cost_price: data.cost_price !== undefined ? Number(data.cost_price) : undefined,
      // Save sale_price at variant level
      sale_price: data.sale_price !== undefined ? Number(data.sale_price) : undefined,
      location: data.location, // Keep for backward compatibility
      location_id: data.location_id, // New: use location ID
    }).eq("id", editModal.variant.id);
    
    if (variantError) {
      console.error("Error updating variant:", variantError);
      return;
    }
    
    // Refresh data before closing modal
    const { data: variantsData, error: variantsFetchError } = await supabase
      .from("variants")
      .select(`
        *,
        consignor:consignors (
          id,
          name
        )
      `)
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
      .select(`
        *,
        consignor:consignors (
          id,
          name
        )
      `)
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
      <div className="flex flex-col sm:flex-row gap-2 mb-4 items-center justify-between">
        <div className="flex gap-2">
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
        <Button onClick={() => setBulkAddModal(true)} size="sm" className="flex items-center gap-1">
          <Plus className="h-4 w-4" />
          Bulk Add Variants
        </Button>
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
              <TableHead>Owner</TableHead>
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
                <TableCell colSpan={11} className="text-center">No variants for this size.</TableCell>
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
                  <TableCell>
                    {(() => {
                      const isStore = variant.owner_type === 'store' || !variant.owner_type || !variant.consignor_id;
                      return isStore ? (
                        <span className="text-sm font-medium">You</span>
                      ) : (
                        <span className="text-sm font-medium text-blue-600">
                          {variant.consignor?.name || `Consignor ${variant.consignor_id}`}
                        </span>
                      );
                    })()}
                  </TableCell>
                  <TableCell>{product.size_category || "-"}</TableCell>
                  <TableCell>{currencySymbol}{typeof variant.cost_price === 'number' ? variant.cost_price.toFixed(2) : (typeof product.original_price === 'number' ? product.original_price.toFixed(2) : '-')}</TableCell>
                  <TableCell>{currencySymbol}{typeof (variant as any).sale_price === 'number' ? (variant as any).sale_price.toFixed(2) : (typeof product.sale_price === 'number' ? product.sale_price.toFixed(2) : '-')}</TableCell>
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
      {/* Bulk Add Modal */}
      <BulkAddVariantModal
        open={bulkAddModal}
        product={product}
        size={size}
        onOpenChange={setBulkAddModal}
        onVariantsAdded={() => {
          // Refresh variants
          const fetchData = async () => {
            const { data: variantsData } = await supabase
              .from("variants")
              .select(`
                *,
                consignor:consignors (
                  id,
                  name
                )
              `)
              .eq("product_id", productId)
              .eq("size", size)
              .eq("isArchived", false);
            if (variantsData) setVariants(variantsData);
          };
          fetchData();
        }}
      />
    </div>
  );

}

export const dynamic = "force-dynamic";
function order(arg0: string, arg1: { ascending: boolean; }) {
    throw new Error("Function not implemented.");
}

