import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select"; // Shadcn Select components

export default function EditProductModal({
  open,
  onOpenChange,
  product,
  onProductUpdated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: any;
  onProductUpdated: () => void;
}) {
  const [form, setForm] = useState({
    name: product.name || "",
    brand: product.brand || "",
    sku: product.sku || "",
    category: product.category || "",
    original_price: product.original_price ?? product.originalPrice ?? 0,
    sale_price: product.sale_price ?? product.salePrice ?? 0,
    status: product.status || "",
    image: product.image || "",
    size_category: product.size_category ?? product.sizeCategory ?? "",
  });

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev: any) => ({
      ...prev,
      [name]: ["original_price", "sale_price"].includes(name)
        ? Number(value)
        : value,
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/update-product", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: product.id,
          ...form,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "Failed to update product");
      } else {
        onProductUpdated();
        onOpenChange(false);
      }
    } catch (e: any) {
      setError(e.message || "Unknown error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl w-full">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
        </DialogHeader>

        <form className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { name: "name", label: "Name" },
              { name: "brand", label: "Brand" },
              { name: "sku", label: "SKU" },
              { name: "category", label: "Category" },
              { name: "original_price", label: "Original Price", type: "number" },
              { name: "sale_price", label: "Sale Price", type: "number" },
              { name: "status", label: "Status" },
              { name: "image", label: "Image URL" },
            ].map(({ name, label, type = "text" }) => (
              <div key={name} className="space-y-1">
                <Label htmlFor={name}>{label}</Label>
                <Input
                  id={name}
                  name={name}
                  type={type}
                  value={form[name as keyof typeof form]}
                  onChange={handleChange}
                  placeholder={label}
                />
              </div>
            ))}

            {/* Shadcn Select for Size Category */}
            <div className="space-y-1">
              <Label htmlFor="size_category">Size Category</Label>
              <Select
                value={form.size_category}
                onValueChange={(value) =>
                  setForm((prev: any) => ({ ...prev, size_category: value }))
                }
              >
                <SelectTrigger id="size_category">
                  <SelectValue placeholder="Select Size Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Men's">Men's</SelectItem>
                  <SelectItem value="Women's">Women's</SelectItem>
                  <SelectItem value="Toddlers">Toddlers</SelectItem>
                  <SelectItem value="Youth">Youth</SelectItem>
                  <SelectItem value="Unisex">Unisex</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
