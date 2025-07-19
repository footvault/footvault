import React from "react";
import { DollarSign, Boxes, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency, getCurrencySymbol } from "@/lib/utils/currency"
import { useCurrency } from "@/context/CurrencyContext"
interface VariantsStatsCardProps {
  totalVariants: number;
  totalCostValue: number;
  totalSaleValue: number;
  profit?: number;
  loading?: boolean;
}

export function VariantsStatsCard({ totalVariants, totalCostValue, totalSaleValue, profit, loading = false }: VariantsStatsCardProps) {
  // Debug logging
  console.log('VariantsStatsCard props:', { totalVariants, totalCostValue, totalSaleValue, loading });

  const { currency } = useCurrency(); // Get the user's selected currency
  const currencySymbol = getCurrencySymbol(currency);

  const potentialProfit = typeof profit === 'number' ? profit : totalSaleValue - totalCostValue;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 ">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <Boxes className="w-4 h-4 text-blue-600" />
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
            Total Cost Value
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {loading ? (
              <div className="h-8 bg-gray-200 rounded animate-pulse w-20" />
            ) : (
              formatCurrency(totalCostValue, currency)
            )}
          </CardTitle>
        </CardHeader>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-600" />
            Total Sale Value
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {loading ? (
              <div className="h-8 bg-gray-200 rounded animate-pulse w-20" />
            ) : (
              formatCurrency(totalSaleValue, currency)
            )}
          </CardTitle>
        </CardHeader>
        <CardFooter className="pt-0">
          <div className="text-xs text-muted-foreground">
            Profit: {formatCurrency(potentialProfit)}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
