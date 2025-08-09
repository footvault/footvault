"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Crown, Package, Users, Zap, ArrowRight, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface VariantLimitsData {
  plan: string;
  limit: number;
  current: number;
  remaining: number;
  isAtLimit: boolean;
}

export default function UserDashboard() {
  const [plan, setPlan] = useState<string>("Free")
  const [nextBillingDate, setNextBillingDate] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [variantLimits, setVariantLimits] = useState<VariantLimitsData | null>(null)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        // Fetch user plan
        const planRes = await fetch("/api/user-plan")
        const planData = await planRes.json()
        if (planData.success) {
          setPlan(planData.plan)
          setNextBillingDate(planData.nextBillingDate)
        }

        // Fetch variant limits
        const variantRes = await fetch("/api/variant-limits", {
          headers: {
            Authorization: `Bearer ${await getAccessToken()}`,
          },
        })
        const variantData = await variantRes.json()
        if (variantData.success) {
          setVariantLimits(variantData.data)
        }
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Helper function to get access token
  async function getAccessToken() {
    try {
      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      return session?.access_token || ""
    } catch {
      return ""
    }
  }

  // Plan configuration
  const planConfig: Record<string, {
    color: string;
    bgColor: string;
    icon: any;
    price: string;
    features: string[];
    description: string;
  }> = {
    Free: {
      color: "text-gray-700",
      bgColor: "bg-gray-50",
      icon: Package,
      price: "$0",
      description: "Perfect for getting started",
      features: [
        "Up to 100 available variants",
        "Track available shoes",
        "Track sold shoes",
        "Community support"
      ]
    },
    Individual: {
      color: "text-blue-700",
      bgColor: "bg-blue-50",
      icon: Users,
      price: "$10",
      description: "For serious solo resellers",
      features: [
        "Up to 500 available variants",
        "CSV export",
        "QR code printing",
        "Priority support"
      ]
    },
    Team: {
      color: "text-purple-700",
      bgColor: "bg-purple-50",
      icon: Crown,
      price: "$14",
      description: "For small reseller teams",
      features: [
        "Up to 1,500 available variants",
        "5 Team member avatars",
        "Priority email support",
        "All Individual features"
      ]
    },
    Store: {
      color: "text-amber-700",
      bgColor: "bg-amber-50",
      icon: Zap,
      price: "$20",
      description: "For full-scale sneaker stores",
      features: [
        "Up to 5,000 available variants",
        "Unlimited team avatars",
        "Dedicated customer support",
        "All Team features"
      ]
    }
  }

  const currentPlanConfig = planConfig[plan] || planConfig.Free
  const Icon = currentPlanConfig.icon
  const usagePercentage = variantLimits ? (variantLimits.current / variantLimits.limit) * 100 : 0

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded-md w-64 mx-auto"></div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="h-64 bg-gray-200 rounded-lg"></div>
            <div className="h-64 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your subscription and track your usage
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Current Plan Card */}
          <Card className="overflow-hidden">
            <CardHeader className={cn("pb-4", currentPlanConfig.bgColor)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={cn("p-2 rounded-lg bg-white/80")}>
                    <Icon className={cn("h-6 w-6", currentPlanConfig.color)} />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{plan} Plan</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {currentPlanConfig.description}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className={cn("font-semibold", currentPlanConfig.color)}>
                  {currentPlanConfig.price}/mo
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
                    Active
                  </Badge>
                </div>
                {nextBillingDate && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Next billing</span>
                    <span className="font-medium">
                      {new Date(nextBillingDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium">Plan Features</h4>
                <ul className="space-y-2">
                  {currentPlanConfig.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => window.location.href = '/subscription'}
              >
                Manage Subscription
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          {/* Usage Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Variant Usage</CardTitle>
              <p className="text-sm text-muted-foreground">
                Track your available inventory slots
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {variantLimits ? (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between items-end">
                      <span className="text-2xl font-bold">
                        {variantLimits.current.toLocaleString()}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        of {variantLimits.limit.toLocaleString()} used
                      </span>
                    </div>
                    <Progress 
                      value={usagePercentage} 
                      className={cn(
                        "h-3",
                        "[&>div]:bg-green-500",
                        usagePercentage >= 90 && "[&>div]:bg-red-500",
                        usagePercentage >= 75 && usagePercentage < 90 && "[&>div]:bg-yellow-500"
                      )}
                    />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Available variants</span>
                      <span>{Math.round(usagePercentage)}% used</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-700">
                        {variantLimits.remaining.toLocaleString()}
                      </div>
                      <div className="text-xs text-blue-600 font-medium">
                        Slots Remaining
                      </div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-700">
                        {variantLimits.limit.toLocaleString()}
                      </div>
                      <div className="text-xs text-green-600 font-medium">
                        Total Limit
                      </div>
                    </div>
                  </div>

                  {usagePercentage >= 80 && (
                    <div className={cn(
                      "p-4 rounded-lg border",
                      usagePercentage >= 90 
                        ? "bg-red-50 border-red-200 text-red-800"
                        : "bg-yellow-50 border-yellow-200 text-yellow-800"
                    )}>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 rounded-full bg-current"></div>
                        <span className="font-medium text-sm">
                          {usagePercentage >= 90 
                            ? "Almost at your limit!" 
                            : "Approaching your limit"
                          }
                        </span>
                      </div>
                      <p className="text-sm mt-1 opacity-80">
                        Consider upgrading your plan to add more variants.
                      </p>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="mt-3"
                        onClick={() => window.location.href = '/subscription'}
                      >
                        Upgrade Plan
                      </Button>
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground p-3 bg-gray-50 rounded-lg">
                    <strong>Note:</strong> Only "Available" status variants count towards your limit. 
                    Sold shoes don't affect your quota.
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                variant="outline" 
                className="h-20 flex-col space-y-2"
                onClick={() => window.location.href = '/add-product'}
              >
                <Package className="h-6 w-6" />
                <span>Add Products</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex-col space-y-2"
                onClick={() => window.location.href = '/inventory'}
              >
                <Users className="h-6 w-6" />
                <span>View Inventory</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex-col space-y-2"
                onClick={() => window.location.href = '/sales'}
              >
                <Zap className="h-6 w-6" />
                <span>Sales</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
