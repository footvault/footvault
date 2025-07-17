import React from "react";
import { TrendingUp, Footprints, Boxes, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface InventoryStatsCardProps {
  totalShoes: number;
  totalVariants: number;
  totalValue: number;
  loading?: boolean;
}

export function InventoryStatsCard({ totalShoes, totalVariants, totalValue, loading = false }: InventoryStatsCardProps) {
  function formatCurrency(value: number | undefined | null) {
    const safeValue = typeof value === "number" && !isNaN(value) ? value : 0;
    return safeValue.toLocaleString("en-US", { style: "currency", currency: "USD" });
  }
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 px-4 lg:px-6">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <Footprints className="text-blue-600 w-4 h-4 " />
            Total Shoes
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {loading ? (
              <div className="h-8 bg-gray-200 rounded animate-pulse w-16" />
            ) : (
              totalShoes
            )}
          </CardTitle>
        </CardHeader>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <Boxes className="text-orange-600 w-4 h-4 " />
            Total Variants
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {loading ? (
              <div className="h-8 bg-gray-200 rounded animate-pulse w-16" />
            ) : (
              totalVariants
            )}
          </CardTitle>
        </CardHeader>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-600" />
            Total Inventory Value
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {loading ? (
              <div className="h-8 bg-gray-200 rounded animate-pulse w-20" />
            ) : (
              formatCurrency(totalValue)
            )}
          </CardTitle>
        </CardHeader>
      </Card>
    </div>
  );
}
