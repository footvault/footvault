"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Crown, Package, Users, Zap } from "lucide-react"
import { cn } from "@/lib/utils"

interface VariantLimitsData {
  plan: string;
  limit: number;
  current: number;
  remaining: number;
  isAtLimit: boolean;
}

const planIcons: Record<string, any> = {
  Free: Package, Individual: Users, Team: Crown, Store: Zap,
}

export default function UserDashboard() {
  const [plan, setPlan] = useState<string>("Free")
  const [nextBillingDate, setNextBillingDate] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [variantLimits, setVariantLimits] = useState<VariantLimitsData | null>(null)

  useEffect(() => {
    // Get token first, then fire both requests in parallel
    async function fetchAll() {
      let token = ""
      try {
        const { createClient } = await import("@/lib/supabase/client")
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        token = session?.access_token || ""
      } catch {}

      const [planRes, variantRes] = await Promise.all([
        fetch("/api/user-plan").then(r => r.json()).catch(() => null),
        fetch("/api/variant-limits", {
          headers: { Authorization: `Bearer ${token}` },
        }).then(r => r.json()).catch(() => null),
      ])

      if (planRes?.success) {
        setPlan(planRes.plan)
        setNextBillingDate(planRes.nextBillingDate)
      }
      if (variantRes?.success) {
        setVariantLimits(variantRes.data)
      }
      setLoading(false)
    }
    fetchAll()
  }, [])

  const Icon = planIcons[plan] || Package
  const usagePercentage = variantLimits ? (variantLimits.current / variantLimits.limit) * 100 : 0

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto">
        <Card className="animate-pulse rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center gap-5">
              <div className="h-12 w-12 bg-muted rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="h-5 bg-muted rounded w-40" />
                <div className="h-3 bg-muted rounded w-full" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      <Card className="rounded-2xl border-border/60 overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            {/* Plan info */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                <Icon className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  <span className="font-semibold text-base">{plan} Plan</span>
                  <Badge className="bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/15 text-xs px-2 py-0.5 h-auto border-0">
                    Active
                  </Badge>
                </div>
                {nextBillingDate && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Next billing: {new Date(nextBillingDate).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>

            {/* Usage bar */}
            {variantLimits && (
              <div className="flex-1 min-w-0 sm:max-w-[340px]">
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-sm font-medium text-foreground/70">
                    {variantLimits.current.toLocaleString()} / {variantLimits.limit.toLocaleString()} variants
                  </span>
                  <span className={cn(
                    "text-sm font-semibold",
                    usagePercentage >= 90 ? "text-red-400" : usagePercentage >= 75 ? "text-amber-400" : "text-emerald-400"
                  )}>
                    {Math.round(usagePercentage)}%
                  </span>
                </div>
                <Progress
                  value={usagePercentage}
                  className={cn(
                    "h-2.5 rounded-full",
                    "[&>div]:bg-emerald-500 [&>div]:rounded-full",
                    usagePercentage >= 90 && "[&>div]:bg-red-500",
                    usagePercentage >= 75 && usagePercentage < 90 && "[&>div]:bg-amber-500"
                  )}
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  {variantLimits.remaining.toLocaleString()} slots remaining
                </p>
              </div>
            )}
          </div>

          {/* Limit warning */}
          {variantLimits && usagePercentage >= 80 && (
            <div className={cn(
              "mt-4 px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2",
              usagePercentage >= 90
                ? "bg-red-50 text-red-700"
                : "bg-amber-50 text-amber-700"
            )}>
              <div className="w-1.5 h-1.5 rounded-full bg-current flex-shrink-0" />
              {usagePercentage >= 90
                ? "Almost at your limit — upgrade to keep adding inventory."
                : "Approaching your limit — consider upgrading soon."}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
