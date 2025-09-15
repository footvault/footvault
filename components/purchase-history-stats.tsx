import React from "react";
import { DollarSign, ShoppingBag, TrendingUp, Package } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/currency";
import { useCurrency } from "@/context/CurrencyContext";

interface PurchaseHistoryStatsProps {
  totalOrders: number;
  totalSpent: number;
  totalItems: number;
  averageOrderValue: number;
  loading?: boolean;
}

export function PurchaseHistoryStats({ 
  totalOrders, 
  totalSpent, 
  totalItems, 
  averageOrderValue, 
  loading = false 
}: PurchaseHistoryStatsProps) {
  const { currency } = useCurrency();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-blue-600" />
            Total Orders
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {loading ? (
              <div className="h-8 bg-gray-200 rounded animate-pulse w-16" />
            ) : (
              totalOrders
            )}
          </CardTitle>
        </CardHeader>
      </Card>
      
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-600" />
            Total Spent
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {loading ? (
              <div className="h-8 bg-gray-200 rounded animate-pulse w-20" />
            ) : (
              formatCurrency(totalSpent, currency)
            )}
          </CardTitle>
        </CardHeader>
      </Card>
      
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <Package className="w-4 h-4 text-purple-600" />
            Total Items
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {loading ? (
              <div className="h-8 bg-gray-200 rounded animate-pulse w-16" />
            ) : (
              totalItems
            )}
          </CardTitle>
        </CardHeader>
      </Card>
      
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-orange-600" />
            Average Order
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {loading ? (
              <div className="h-8 bg-gray-200 rounded animate-pulse w-20" />
            ) : (
              formatCurrency(averageOrderValue, currency)
            )}
          </CardTitle>
        </CardHeader>
      </Card>
    </div>
  );
}
