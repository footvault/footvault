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
import { useCountUp } from "@/hooks/useCountUp"

interface VariantsStatsCardProps {
  totalVariants: number;
  totalCostValue: number;
  totalSaleValue: number;
  profit?: number;
  loading?: boolean;
}

export function VariantsStatsCard({ totalVariants, totalCostValue, totalSaleValue, profit, loading = false }: VariantsStatsCardProps) {
  const { currency } = useCurrency();
  const currencySymbol = getCurrencySymbol(currency);

  const potentialProfit = typeof profit === 'number' ? profit : totalSaleValue - totalCostValue;

  const animatedVariants = useCountUp(totalVariants, 800, !loading);
  const animatedCost = useCountUp(totalCostValue, 1000, !loading);
  const animatedSale = useCountUp(totalSaleValue, 1000, !loading);
  const animatedProfit = useCountUp(potentialProfit, 1000, !loading);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 ">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <Boxes className="w-4 h-4 text-blue-400" />
            Total Variants
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {loading ? (
              <div className="h-8 bg-muted rounded animate-pulse w-16" />
            ) : (
              animatedVariants
            )}
          </CardTitle>
        </CardHeader>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            Total Cost Value
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              {loading ? (
              <div className="h-8 bg-muted rounded animate-pulse w-20" />
            ) : (
              formatCurrency(animatedCost, currency)
            )}
          </CardTitle>
        </CardHeader>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-400" />
            Total Sale Value
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {loading ? (
              <div className="h-8 bg-muted rounded animate-pulse w-20" />
            ) : (
              formatCurrency(animatedSale, currency)
            )}
          </CardTitle>
        </CardHeader>
        <CardFooter className="pt-0">
          <div className="text-xs text-muted-foreground">
            Profit: {formatCurrency(animatedProfit, currency)}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
