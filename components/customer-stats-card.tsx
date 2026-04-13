"use client"

import React from "react";
import { motion } from "framer-motion";
import { Users, Crown, UserCheck, TrendingUp } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface CustomerStatsCardProps {
  totalCustomers: number;
  vipCustomers: number;
  wholesaleCustomers: number;
  loading?: boolean;
}

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.1,
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  }),
};

const statsData = [
  {
    key: "total",
    label: "Total Customers",
    icon: Users,
    iconClass: "text-blue-500 dark:text-blue-400",
    bgClass: "bg-blue-500/10 dark:bg-blue-500/15",
    accentClass: "from-blue-500/20 to-blue-500/0",
    borderClass: "border-l-blue-500/50",
    getValue: (total: number) => total,
  },
  {
    key: "regular",
    label: "Regular Customers",
    icon: UserCheck,
    iconClass: "text-emerald-500 dark:text-emerald-400",
    bgClass: "bg-emerald-500/10 dark:bg-emerald-500/15",
    accentClass: "from-emerald-500/20 to-emerald-500/0",
    borderClass: "border-l-emerald-500/50",
    getValue: (total: number, vip: number, wholesale: number) => total - vip - wholesale,
  },
  {
    key: "vip",
    label: "VIP & Wholesale",
    icon: Crown,
    iconClass: "text-amber-500 dark:text-amber-400",
    bgClass: "bg-amber-500/10 dark:bg-amber-500/15",
    accentClass: "from-amber-500/20 to-amber-500/0",
    borderClass: "border-l-amber-500/50",
    getValue: (total: number, vip: number, wholesale: number) => vip + wholesale,
  },
];

export function CustomerStatsCard({ 
  totalCustomers, 
  vipCustomers, 
  wholesaleCustomers, 
  loading = false 
}: CustomerStatsCardProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {statsData.map((stat, i) => {
        const Icon = stat.icon;
        const value = stat.getValue(totalCustomers, vipCustomers, wholesaleCustomers);
        
        return (
          <motion.div
            key={stat.key}
            custom={i}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
          >
            <Card className={`@container/card relative overflow-hidden group hover:shadow-md transition-shadow duration-300 border-border/60 border-l-2 ${stat.borderClass}`}>
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.accentClass} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
              <CardHeader className="pb-3 relative">
                <div className="flex items-center justify-between">
                  <CardDescription className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </CardDescription>
                  <div className={`rounded-lg p-2 ${stat.bgClass} transition-transform duration-300 group-hover:scale-110`}>
                    <Icon className={`w-4 h-4 ${stat.iconClass}`} />
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold tabular-nums tracking-tight @[250px]/card:text-3xl">
                  {loading ? (
                    <div className="h-8 bg-muted rounded-md animate-pulse w-16" />
                  ) : (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.1 + 0.3, duration: 0.3 }}
                    >
                      {value.toLocaleString()}
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
