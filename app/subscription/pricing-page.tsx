"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Check, HelpCircle, Sparkles, Shield, Zap, Crown } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { pricingTiers } from "@/lib/pricing-tiers"
import { cn } from "@/lib/utils"

const tierIcons: Record<string, any> = {
  free: Shield,
  individual: Zap,
  team: Crown,
  store: Sparkles,
}

export default function PricingPage() {
  const [isYearly, setIsYearly] = useState(false)
  const [userActivePlan, setUserActivePlan] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [pendingCancelPlan, setPendingCancelPlan] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/user-plan')
      .then(r => r.json())
      .then(data => setUserActivePlan(data.success ? data.plan.toLowerCase() : null))
      .catch(() => setUserActivePlan(null))
      .finally(() => setIsLoading(false))
  }, [])

  const handleSubscribe = async (planType: string) => {
    const res = await fetch('/api/creem-create-session', {
      method: 'POST',
      body: JSON.stringify({ 
        planType,
        billingPeriod: isYearly ? 'yearly' : 'monthly'
      }),
      headers: { 'Content-Type': 'application/json' }
    })
    const data = await res.json()
    if (data.success) {
      window.location.href = data.url
    } else {
      alert('Failed to start subscription: ' + data.error)
    }
  }

  const handleCancelSubscription = async (planType: string) => {
    setShowCancelModal(true)
    setPendingCancelPlan(planType)
  }

  const confirmCancelSubscription = async () => {
    if (!pendingCancelPlan) return;
    setShowCancelModal(false)
    const res = await fetch('/api/cancel-subscription', {
      method: 'POST',
      body: JSON.stringify({ 
        planType: pendingCancelPlan,
        billingPeriod: isYearly ? 'yearly' : 'monthly'
      }),
      headers: { 'Content-Type': 'application/json' }
    })
    const data = await res.json()
    if (data.success) {
      alert('Subscription cancelled successfully')
      setUserActivePlan(null)
    } else {
      alert('Failed to cancel subscription: ' + data.error)
    }
    setPendingCancelPlan(null)
  }

  const getButtonConfig = (tier: any) => {
    const isActivePlan = userActivePlan === tier.planType
    const isFree = tier.planType === 'free'

    if (isFree) {
      return { text: tier.buttonText, disabled: true, onClick: () => {}, variant: 'default' }
    }
    if (isActivePlan) {
      return { text: 'Cancel Subscription', disabled: false, onClick: () => handleCancelSubscription(tier.planType), variant: 'destructive' }
    }
    return { text: tier.buttonText, disabled: false, onClick: () => handleSubscribe(tier.planType), variant: 'default' }
  }

  return (
    <TooltipProvider>
      {/* Cancel Subscription Modal */}
      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-lg font-semibold">Cancel Subscription</DialogTitle>
            <DialogDescription>Are you sure you want to cancel?</DialogDescription>
          </DialogHeader>
          <div className="py-3">
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm">
              <p className="text-red-800 font-medium">You will:</p>
              <ul className="mt-1.5 text-red-700 space-y-0.5 text-xs">
                <li>• Lose access to all premium features</li>
                <li>• Be downgraded to the Free plan</li>
                <li>• Have variant limits reduced immediately</li>
              </ul>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowCancelModal(false)}>
              Keep Subscription
            </Button>
            <Button variant="destructive" size="sm" onClick={confirmCancelSubscription}>
              Cancel Subscription
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <section id="pricing" className="w-full">
        <div className="max-w-5xl mx-auto px-4 py-10">

          {/* Header */}
          <div className="text-center mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              Simple, transparent pricing
            </div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
              Find the plan that fits{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-green-500">
                your scale
              </span>
            </h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Start free. Upgrade when you&apos;re ready. Cancel anytime.
            </p>
          </div>

          {/* Toggle */}
          <div className="flex items-center justify-center gap-3 mb-10 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-100">
            <span className={cn("text-xs font-semibold", !isYearly ? "text-emerald-500" : "text-muted-foreground")}>
              Monthly
            </span>
            <Switch
              id="pricing-toggle"
              checked={isYearly}
              onCheckedChange={setIsYearly}
              className="data-[state=checked]:bg-emerald-600 scale-90"
            />
            <span className={cn("text-xs font-semibold", isYearly ? "text-emerald-500" : "text-muted-foreground")}>
              Yearly
            </span>
            <div className={cn(
              "transition-all duration-300 overflow-hidden",
              isYearly ? "opacity-100 max-w-[100px]" : "opacity-0 max-w-0"
            )}>
              <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/15 whitespace-nowrap text-[10px] px-2 py-0.5">
                Save ~17%
              </Badge>
            </div>
          </div>

          {/* Pricing Cards */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="animate-pulse rounded-2xl">
                  <CardHeader className="space-y-3 pb-4">
                    <div className="h-9 w-9 bg-muted rounded-lg" />
                    <div className="h-4 bg-muted rounded w-1/3" />
                    <div className="h-3 bg-muted rounded w-2/3" />
                    <div className="h-8 bg-muted rounded w-1/4" />
                  </CardHeader>
                  <CardContent><div className="space-y-2">{[1,2,3].map(j=><div key={j} className="h-3 bg-muted rounded"/>)}</div></CardContent>
                  <CardFooter><div className="h-10 bg-muted rounded-lg w-full"/></CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {pricingTiers.map((tier, idx) => {
                const buttonConfig = getButtonConfig(tier)
                const isActivePlan = userActivePlan === tier.planType
                const isPopular = tier.planType === 'team'
                const isFree = tier.planType === 'free'
                const TierIcon = tierIcons[tier.planType] || Shield

                return (
                  <div
                    key={tier.name}
                    className="relative animate-in fade-in slide-in-from-bottom-4 duration-500"
                    style={{ animationDelay: `${150 + idx * 75}ms`, animationFillMode: "backwards" }}
                  >
                    {/* Badges */}
                    {isPopular && !isActivePlan && (
                      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-10">
                        <Badge className="bg-gradient-to-r from-emerald-600 to-green-500 text-white border-0 shadow-md shadow-emerald-900/30 px-3 py-0.5 text-[10px] font-semibold">
                          Most Popular
                        </Badge>
                      </div>
                    )}
                    {isActivePlan && (
                      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-10">
                        <Badge className="bg-emerald-600 text-white border-0 shadow-md shadow-emerald-900/30 px-3 py-0.5 text-[10px] font-semibold">
                          Current Plan
                        </Badge>
                      </div>
                    )}

                    <Card
                      className={cn(
                        "relative h-full rounded-2xl border transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 group overflow-hidden",
                        (isActivePlan || isPopular) && "ring-2 ring-emerald-500/70 shadow-lg shadow-emerald-500/10",
                        !isActivePlan && !isPopular && "border-border/50 hover:border-emerald-500/40"
                      )}
                    >
                      {(isPopular || isActivePlan) && (
                        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 to-transparent pointer-events-none" />
                      )}

                      <CardHeader className="relative pb-3 pt-6">
                        <div className={cn(
                          "w-9 h-9 rounded-lg flex items-center justify-center mb-2 transition-transform duration-200 group-hover:scale-110",
                          (isPopular || isActivePlan) ? "bg-emerald-500/15" : "bg-muted"
                        )}>
                          <TierIcon className={cn("w-4 h-4", (isPopular || isActivePlan) ? "text-emerald-400" : "text-muted-foreground")} />
                        </div>
                        <CardTitle className="text-lg font-bold">{tier.name}</CardTitle>
                        <CardDescription className="text-xs">{tier.subtitle}</CardDescription>
                        <div className="pt-2">
                          <div className="flex items-baseline gap-0.5">
                            <span className="text-3xl font-extrabold tracking-tight">
                              ${isYearly ? tier.yearlyPrice : tier.monthlyPrice}
                            </span>
                            <span className="text-xs text-muted-foreground font-medium">
                              /{isYearly ? "yr" : "mo"}
                            </span>
                          </div>
                          {isYearly && tier.monthlyPrice > 0 && (
                            <p className="text-[11px] text-emerald-400 font-medium mt-0.5">
                              Save ${(tier.monthlyPrice * 12) - tier.yearlyPrice}/yr
                            </p>
                          )}
                        </div>
                      </CardHeader>

                      <div className="mx-5 border-t border-border/30" />

                      <CardContent className="relative pt-4 pb-2 flex-grow">
                        <ul className="space-y-2">
                          {tier.features.map((feature, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <div className={cn(
                                "flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center mt-0.5",
                                (isPopular || isActivePlan) ? "bg-emerald-500/15" : "bg-muted"
                              )}>
                                <Check className={cn("w-2.5 h-2.5", (isPopular || isActivePlan) ? "text-emerald-400" : "text-muted-foreground")} />
                              </div>
                              <div className="flex items-start gap-1 min-w-0">
                                <span className="text-xs leading-5 text-foreground/75">{feature.label}</span>
                                {feature.tooltip && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <HelpCircle className="w-3 h-3 text-muted-foreground/50 cursor-help flex-shrink-0 mt-0.5" />
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-[220px] text-xs">
                                      {feature.tooltip}
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </CardContent>

                      <CardFooter className="relative pt-3 pb-5 px-5">
                        <Button
                          className={cn(
                            "w-full h-9 rounded-lg text-xs font-semibold transition-all duration-200",
                            buttonConfig.variant === 'destructive'
                              ? "bg-red-600 hover:bg-red-700 text-white"
                              : (isPopular && !isActivePlan)
                              ? "bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-700 hover:to-green-600 text-white shadow-md shadow-emerald-900/30"
                              : isActivePlan
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20"
                              : isFree
                              ? "bg-muted text-muted-foreground cursor-not-allowed"
                              : "bg-emerald-600 hover:bg-emerald-700 text-white"
                          )}
                          onClick={buttonConfig.onClick}
                          disabled={buttonConfig.disabled}
                          variant={buttonConfig.variant as any}
                        >
                          {buttonConfig.text}
                        </Button>
                      </CardFooter>
                    </Card>
                  </div>
                )
              })}
            </div>
          )}

          {/* FAQ */}
          <div className="mt-16 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: "500ms", animationFillMode: "backwards" }}>
            <h3 className="text-lg font-bold text-center mb-6">FAQ</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-3xl mx-auto">
              {[
                { q: "What counts towards my variant limit?", a: "Only shoes with \"Available\" status. Sold shoes don't count." },
                { q: "Can I change plans anytime?", a: "Yes — upgrade or downgrade instantly. Changes take effect immediately." },
                { q: "What if I exceed my limit?", a: "You'll get a warning. Upgrade your plan to keep adding inventory." },
                { q: "Is my data secure?", a: "Enterprise-grade security. We never share your data with third parties." }
              ].map((item, i) => (
                <Card key={i} className="p-4 rounded-xl border-border/50 hover:border-emerald-500/40 transition-colors duration-200">
                  <h4 className="text-sm font-semibold mb-1">{item.q}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.a}</p>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>
    </TooltipProvider>
  )
}
