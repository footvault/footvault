"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface BulkMoveLocationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedVariants: any[];
  locations: string[];
  onBulkMove: (location: string) => Promise<void>;
}

export function BulkMoveLocationModal({ open, onOpenChange, selectedVariants, locations, onBulkMove }: BulkMoveLocationModalProps) {
  const [selectedLocation, setSelectedLocation] = useState(locations[0] || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleMove = async () => {
    setLoading(true);
    setError("");
    try {
      // Call the API route to update locations in bulk
      const res = await fetch("/api/bulk-move-location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantIds: selectedVariants.map(v => v.id),
          newLocation: selectedLocation,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to move location");
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || "Failed to move location");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Move {selectedVariants.length} Individual Shoes</DialogTitle>
        </DialogHeader>
        <div className="mb-4">
          <label className="block mb-2 font-medium">Select New Location</label>
          <select
            className="w-full border rounded p-2"
            value={selectedLocation}
            onChange={e => setSelectedLocation(e.target.value)}
          >
            {locations.map(loc => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
        </div>
        <div className="mb-4 max-h-40 overflow-y-auto border rounded p-2 bg-gray-50">
          <div className="font-semibold mb-2">Selected Variants:</div>
          <ul className="text-xs">
            {selectedVariants.map(v => (
              <li key={v.id} className="mb-1">{v.productName || v.name} - {v.variantSku || v.sku} ({v.location})</li>
            ))}
          </ul>
        </div>
        {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
        <Button onClick={handleMove} disabled={loading || !selectedLocation} className="w-full">
          {loading ? "Moving..." : `Move to ${selectedLocation}`}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
