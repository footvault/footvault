"use client";

import { useEffect, useState } from "react";
import { getArchivedProducts } from "@/lib/data";
import { getArchivedVariantsWithProduct } from "@/lib/archived-variants";
// Update the import paths below to the actual locations of Button and Input components
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
export default function ArchivePage() {
  const [archivedProducts, setArchivedProducts] = useState<any[]>([]);
  const [archivedVariantGroups, setArchivedVariantGroups] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Fetch archived products and archived variants on mount
  useEffect(() => {
    const fetchArchived = async () => {
      setIsLoading(true);
      const [products, variantGroups] = await Promise.all([
        getArchivedProducts(),
        getArchivedVariantsWithProduct(),
      ]);
      setArchivedProducts(products);
      setArchivedVariantGroups(variantGroups);
      setIsLoading(false);
    };
    fetchArchived();
  }, []);

  // Merge products and variant groups, avoiding duplicate products
  const mergedArchive = (() => {
    const productMap: Record<string, any> = {};
    archivedProducts.forEach((p) => {
      productMap[p.id] = { ...p };
    });
    archivedVariantGroups.forEach((group) => {
      const pid = group.product?.id;
      if (!pid) return;
      if (productMap[pid]) {
        // Merge variants if product already in archive
        const existing = productMap[pid];
        const variantIds = new Set(existing.variants.map((v: any) => v.id));
        group.variants.forEach((v: any) => {
          if (!variantIds.has(v.id)) existing.variants.push(v);
        });
      } else {
        // Add product with only archived variants
        productMap[pid] = {
          ...group.product,
          variants: group.variants,
        };
      }
    });
    return Object.values(productMap);
  })();

  // Filter by search term
  const filteredProducts = mergedArchive.filter((product: any) => {
    const matchesProduct =
      product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesVariant = product.variants?.some((variant: any) =>
      (variant.serialNumber && variant.serialNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (variant.variantSku && variant.variantSku.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    return matchesProduct || matchesVariant;
  });

  // Restore product or variant
  const handleRestore = async (type: "product" | "variant", id: number | string, productId?: number) => {
    setIsLoading(true);
    let url = "";
    let body: any = {};
    if (type === "product") {
      url = "/api/restore-product";
      body = { productId: id };
    } else {
      url = "/api/restore-variant";
      body = { variantId: id, productId };
    }
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      // Refresh archive list
      const products = await getArchivedProducts();
      setArchivedProducts(products);
    }
    setIsLoading(false);
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Archived Products & Variants</h1>
      <Input
        placeholder="Search archived products or variants..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="mb-4"
      />
      {isLoading ? (
        <div>Loading...</div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-gray-500">No archived products or variants found.</div>
      ) : (
        <div className="space-y-6">
          {filteredProducts.map((product) => (
            <div key={product.id} className="border rounded-lg p-4 bg-white shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-4">
                  <img
                    src={product.image || "/placeholder.svg?height=60&width=60"}
                    alt={product.name}
                    width={60}
                    height={60}
                    className="rounded-md object-cover border border-gray-200"
                  />
                  <div>
                    <div className="font-semibold text-lg">{product.name}</div>
                    <div className="text-sm text-gray-500">{product.brand} | SKU: {product.sku}</div>
                  </div>
                </div>
                {product.isArchived && (
                  <Button
                    variant="outline"
                    onClick={() => handleRestore("product", product.id)}
                    disabled={isLoading}
                  >
                    Restore Product
                  </Button>
                )}
              </div>
              {product.variants && product.variants.length > 0 && (
                <div className="mt-4 border-t pt-4">
                  <div className="font-medium mb-2">Archived Variants</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {product.variants.map((variant: any) => (
                      <div key={variant.id} className="border rounded p-2 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          {variant.image && (
                            <img
                              src={variant.image}
                              alt={variant.variantSku}
                              width={40}
                              height={40}
                              className="rounded object-cover border border-gray-200"
                            />
                          )}
                          <div>
                            <div className="font-mono text-xs">{variant.variantSku}</div>
                            <div className="text-sm text-gray-500">Serial: <span className="font-semibold">{variant.serial_number || "-"}</span></div>
                            <div className="text-xs">Size: {variant.size} {variant.sizeLabel || variant.size_label}</div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleRestore("variant", variant.id, product.id)}
                          disabled={isLoading}
                        >
                          Restore
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
