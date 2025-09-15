import React from "react";
import { Users, Crown, Building, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface CustomerStatsCardProps {
  totalCustomers: number;
  vipCustomers: number;
  wholesaleCustomers: number;
  loading?: boolean;
}

export function CustomerStatsCard({ 
  totalCustomers, 
  vipCustomers, 
  wholesaleCustomers, 
  loading = false 
}: CustomerStatsCardProps) {
  const regularCustomers = totalCustomers - vipCustomers - wholesaleCustomers;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <Users className="text-blue-600 w-4 h-4" />
            Total Customers
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {loading ? (
              <div className="h-8 bg-gray-200 rounded animate-pulse w-16" />
            ) : (
              totalCustomers
            )}
          </CardTitle>
        </CardHeader>
      </Card>
      
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <UserCheck className="text-green-600 w-4 h-4" />
            Regular Customers
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {loading ? (
              <div className="h-8 bg-gray-200 rounded animate-pulse w-16" />
            ) : (
              regularCustomers
            )}
          </CardTitle>
        </CardHeader>
      </Card>
      
      <Card className="@container/card">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <Crown className="text-purple-600 w-4 h-4" />
            VIP Customers
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {loading ? (
              <div className="h-8 bg-gray-200 rounded animate-pulse w-16" />
            ) : (
              vipCustomers
            )}
          </CardTitle>
        </CardHeader>
      </Card>
    </div>
  );
}
