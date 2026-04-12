import React from "react";
import { Footprints, Boxes, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency"
import { useCurrency } from "@/context/CurrencyContext"

interface InventoryStatsCardProps {
  totalShoes: number;
  totalVariants: number;
  totalValue: number;
  loading?: boolean;
}

export function InventoryStatsCard({ totalShoes, totalVariants, totalValue, loading = false }: InventoryStatsCardProps) {
  const { currency } = useCurrency();

  const stats = [
    {
      label: "Total Shoes",
      value: totalShoes,
      icon: Footprints,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Total Variants",
      value: totalVariants,
      icon: Boxes,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
    {
      label: "Inventory Value",
      value: formatCurrency(totalValue, currency),
      icon: DollarSign,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
      isCurrency: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="group relative flex items-center gap-3 rounded-xl border bg-card p-4 transition-all duration-200 hover:shadow-md hover:border-border/80"
        >
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${stat.bgColor} transition-transform duration-200 group-hover:scale-105`}>
            <stat.icon className={`h-5 w-5 ${stat.color}`} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
            {loading ? (
              <div className="h-7 w-16 bg-muted rounded animate-pulse mt-0.5" />
            ) : (
              <p className="text-xl font-semibold tabular-nums truncate">
                {stat.isCurrency ? stat.value : stat.value}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
