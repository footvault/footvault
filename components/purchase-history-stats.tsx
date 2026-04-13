"use client"

import React from "react";
import { motion } from "framer-motion";
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

const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: i * 0.08, duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

const statsConfig = [
  {
    key: "orders",
    label: "Total Orders",
    icon: ShoppingBag,
    iconClass: "text-blue-500 dark:text-blue-400",
    bgClass: "bg-blue-500/10 dark:bg-blue-500/15",
    accentClass: "from-blue-500/20 to-blue-500/0",
  },
  {
    key: "spent",
    label: "Total Spent",
    icon: DollarSign,
    iconClass: "text-emerald-500 dark:text-emerald-400",
    bgClass: "bg-emerald-500/10 dark:bg-emerald-500/15",
    accentClass: "from-emerald-500/20 to-emerald-500/0",
  },
  {
    key: "items",
    label: "Total Items",
    icon: Package,
    iconClass: "text-violet-500 dark:text-violet-400",
    bgClass: "bg-violet-500/10 dark:bg-violet-500/15",
    accentClass: "from-violet-500/20 to-violet-500/0",
  },
  {
    key: "average",
    label: "Average Order",
    icon: TrendingUp,
    iconClass: "text-amber-500 dark:text-amber-400",
    bgClass: "bg-amber-500/10 dark:bg-amber-500/15",
    accentClass: "from-amber-500/20 to-amber-500/0",
  },
];

export function PurchaseHistoryStats({ 
  totalOrders, 
  totalSpent, 
  totalItems, 
  averageOrderValue, 
  loading = false 
}: PurchaseHistoryStatsProps) {
  const { currency } = useCurrency();

  const values = [
    totalOrders.toString(),
    formatCurrency(totalSpent, currency),
    totalItems.toString(),
    formatCurrency(averageOrderValue, currency),
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {statsConfig.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <motion.div key={stat.key} custom={i} variants={cardVariants} initial="hidden" animate="visible">
            <Card className="@container/card relative overflow-hidden group hover:shadow-md transition-shadow duration-300 border-border/60">
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.accentClass} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
              <CardHeader className="pb-2 relative">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-xs font-medium text-muted-foreground">
                    {stat.label}
                  </CardDescription>
                  <div className={`rounded-lg p-1.5 ${stat.bgClass} transition-transform duration-300 group-hover:scale-110`}>
                    <Icon className={`w-3.5 h-3.5 ${stat.iconClass}`} />
                  </div>
                </div>
                <CardTitle className="text-xl font-bold tabular-nums tracking-tight @[250px]/card:text-2xl">
                  {loading ? (
                    <div className="h-7 bg-muted rounded-md animate-pulse w-16" />
                  ) : (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.08 + 0.2, duration: 0.3 }}
                    >
                      {values[i]}
                    </motion.span>
                  )}
                </CardTitle>
              </CardHeader>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
