"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { AlertTriangle, Crown, Package, Users, Zap } from "lucide-react"
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

function parseDisplayDate(value: string | null | undefined): string | null {
  if (!value || value === "null" || value === "undefined") {
    return null
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime()) || parsed.getFullYear() <= 1970) {
    return null
  }

  return parsed.toLocaleDateString()
}

function isFutureOrToday(value: string | null | undefined): boolean {
  if (!value || value === "null" || value === "undefined") {
    return false
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return false
  }

  parsed.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return parsed >= today
}

export default function UserDashboard() {
  const [plan, setPlan] = useState<string>("Free")
  const [nextBillingDate, setNextBillingDate] = useState<string>("")
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>("free")
  const [subscriptionEndsAt, setSubscriptionEndsAt] = useState<string>("")
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
        setSubscriptionStatus(planRes.subscriptionStatus || (planRes.plan === "Free" ? "free" : "active"))
        setSubscriptionEndsAt(planRes.subscriptionEndsAt || "")
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
  const formattedNextBillingDate = parseDisplayDate(nextBillingDate)
  const formattedSubscriptionEndDate = parseDisplayDate(subscriptionEndsAt)
  const billingDateLabel = formattedSubscriptionEndDate || formattedNextBillingDate
  const shouldShowGraceReminder = Boolean(
    billingDateLabel &&
    (subscriptionStatus === "scheduled_cancel" ||
      subscriptionStatus === "past_due" ||
      ((subscriptionStatus === "canceled" || subscriptionStatus === "expired") && isFutureOrToday(subscriptionEndsAt)))
  )
  const showBillingAlert = shouldShowGraceReminder

  const billingBadge = subscriptionStatus === "past_due"
    ? "Payment issue"
    : subscriptionStatus === "scheduled_cancel"
    ? "Ending soon"
    : subscriptionStatus === "canceled" || subscriptionStatus === "expired"
    ? "Ended"
    : plan === "Free"
    ? "Free"
    : "Active"

  const billingAlertCopy = subscriptionStatus === "past_due"
    ? `We couldn't process your latest payment. Your plan is still active for now, but it may return to Free${billingDateLabel ? ` on ${billingDateLabel}` : " if payment isn't updated"}.`
    : subscriptionStatus === "scheduled_cancel"
    ? `Your plan stays active until ${billingDateLabel}. Renew before then to keep your limits and premium features without interruption.`
    : subscriptionStatus === "canceled" || subscriptionStatus === "expired"
    ? `Your subscription is marked as ended, but this account still has access recorded until ${billingDateLabel}. If this date looks wrong, review your recent billing activity or contact support.`
    : ""

  if (loading) {
    return (
      <div className="w-full">
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
    <div className="w-full">
      <Card className="rounded-2xl border-border/60 overflow-hidden">
        <CardContent className="p-6 sm:p-7">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)] xl:items-center">
            {/* Plan info */}
            <div className="min-w-0">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15">
                  <Icon className="h-7 w-7 text-emerald-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-xl font-semibold tracking-tight">{plan} Plan</span>
                    <Badge className={cn(
                      "text-xs px-2 py-0.5 h-auto border-0",
                      subscriptionStatus === "past_due"
                        ? "bg-amber-500/15 text-amber-500 hover:bg-amber-500/15"
                        : subscriptionStatus === "scheduled_cancel"
                        ? "bg-orange-500/15 text-orange-500 hover:bg-orange-500/15"
                        : "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/15"
                    )}>
                      {billingBadge}
                    </Badge>
                  </div>
                  {(formattedNextBillingDate || formattedSubscriptionEndDate) && (
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {subscriptionStatus === "scheduled_cancel"
                        ? `Access until ${billingDateLabel}`
                        : subscriptionStatus === "past_due"
                        ? `Billing retry window ends ${billingDateLabel}`
                        : subscriptionStatus === "canceled" || subscriptionStatus === "expired"
                        ? `Recorded access until ${billingDateLabel}`
                        : `Next billing: ${formattedNextBillingDate}`}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Usage bar */}
            {variantLimits && (
              <div className="min-w-0 rounded-2xl border border-white/8 bg-white/[0.03] p-4 sm:p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
                  <span className="text-sm font-medium text-foreground/75">
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
                <p className="mt-2 text-xs text-muted-foreground">
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

          {showBillingAlert && (
            <div className={cn(
              "mt-4 overflow-hidden rounded-2xl border text-sm shadow-[0_10px_24px_rgba(0,0,0,0.22)]",
              subscriptionStatus === "past_due"
                ? "border-amber-500/20 bg-[linear-gradient(135deg,rgba(120,53,15,0.46),rgba(41,37,36,0.92))] text-amber-50"
                : "border-orange-500/20 bg-[linear-gradient(135deg,rgba(124,45,18,0.46),rgba(41,37,36,0.92))] text-orange-50"
            )}>
              <div className="flex items-start gap-3 px-4 py-4">
                <div className={cn(
                  "mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl",
                  subscriptionStatus === "past_due"
                    ? "bg-amber-400/15 text-amber-200 ring-1 ring-amber-300/15"
                    : "bg-orange-400/15 text-orange-200 ring-1 ring-orange-300/15"
                )}>
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold tracking-tight">
                    {subscriptionStatus === "past_due"
                      ? "Billing needs attention"
                      : subscriptionStatus === "scheduled_cancel"
                      ? "Plan ending gently"
                      : "Subscription timeline needs review"}
                  </p>
                  <p className="mt-1 text-sm/6 text-white/72">{billingAlertCopy}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
