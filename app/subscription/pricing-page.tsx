"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Check, HelpCircle } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { pricingTiers } from "@/lib/pricing-tiers"
import { cn } from "@/lib/utils"

export default function PricingPage() {
  const [isYearly, setIsYearly] = useState(false)
  const [userActivePlan, setUserActivePlan] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [pendingCancelPlan, setPendingCancelPlan] = useState<string | null>(null)

  useEffect(() => {
    const fetchUserPlan = async () => {
      try {
        const res = await fetch('/api/user-plan')
        const data = await res.json()

        if (data.success) {
          setUserActivePlan(data.plan.toLowerCase())
        } else {
          setUserActivePlan(null)
        }
      } catch (error) {
        console.error('Failed to fetch user plan:', error)
        setUserActivePlan(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserPlan()
  }, [])

  const handleSubscribe = async (planType: string) => {
    const res = await fetch('/api/creem-create-session', {
      method: 'POST',
      body: JSON.stringify({ planType }),
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
      body: JSON.stringify({ planType: pendingCancelPlan }),
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
      return {
        text: tier.buttonText,
        disabled: true,
        onClick: () => {},
        variant: 'default'
      }
    }

    if (isActivePlan) {
      return {
        text: 'Cancel Subscription',
        disabled: false,
        onClick: () => handleCancelSubscription(tier.planType),
        variant: 'destructive'
      }
    }

    return {
      text: tier.buttonText,
      disabled: false,
      onClick: () => handleSubscribe(tier.planType),
      variant: 'default'
    }
  }

  return (
    <TooltipProvider>
      {/* Cancel Subscription Modal */}
      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-xl font-semibold">Cancel Subscription</DialogTitle>
            <DialogDescription className="text-base">
              Are you sure you want to cancel your subscription?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">
                <strong>Warning:</strong> If you cancel your subscription, you will:
              </p>
              <ul className="mt-2 text-sm text-red-700 space-y-1">
                <li>• Lose access to all premium features</li>
                <li>• Be downgraded to the Free plan</li>
                <li>• Have variant limits reduced immediately</li>
              </ul>
              <p className="mt-2 text-sm text-red-800 font-medium">
                This action cannot be undone.
              </p>
            </div>
          </div>
          <DialogFooter className="space-x-2">
            <Button variant="outline" onClick={() => setShowCancelModal(false)}>
              Keep Subscription
            </Button>
            <Button variant="destructive" onClick={confirmCancelSubscription}>
              Cancel Subscription
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <section id="pricing" className="w-full min-h-screen bg-background">
        <div className="container px-4 md:px-6 max-w-6xl mx-auto py-20">
          {/* Header */}
          <div className="text-center space-y-6 mb-20">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Simple pricing
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Start for free. Scale as you grow. Cancel anytime.
            </p>
          </div>

          {/* Yearly/Monthly Toggle */}
          <div className="flex items-center justify-center space-x-6 mb-16">
            <span className={cn("text-lg font-medium transition-all duration-200", !isYearly ? "text-foreground" : "text-muted-foreground")}>
              Monthly
            </span>
            <div className="relative">
              <Switch
                id="pricing-toggle"
                checked={isYearly}
                onCheckedChange={setIsYearly}
              />
            </div>
            <span className={cn("text-lg font-medium transition-all duration-200", isYearly ? "text-foreground" : "text-muted-foreground")}>
              Yearly
            </span>
            {isYearly && (
              <Badge variant="secondary" className="ml-4">
                Save 25%
              </Badge>
            )}
          </div>

          {/* Loading State */}
          {isLoading ? (
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="space-y-4">
                    <div className="h-6 bg-muted rounded w-3/4"></div>
                    <div className="h-4 bg-muted rounded w-full"></div>
                    <div className="h-8 bg-muted rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[1, 2, 3, 4].map((j) => (
                        <div key={j} className="h-4 bg-muted rounded w-full"></div>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <div className="h-10 bg-muted rounded w-full"></div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            /* Pricing Cards */
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {pricingTiers.map((tier) => {
                const buttonConfig = getButtonConfig(tier)
                const isActivePlan = userActivePlan === tier.planType
                const isPopular = tier.planType === 'team'
                const isFree = tier.planType === 'free'

                return (
                  <div key={tier.name} className="relative">
                    {/* Popular Badge */}
                    {isPopular && !isActivePlan && (
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-10">
                        <Badge className="px-3 py-1.5 text-xs font-medium">
                          Most Popular
                        </Badge>
                      </div>
                    )}

                    {/* Active Plan Badge */}
                    {isActivePlan && (
                      <div className="absolute -top-4 right-4 z-10">
                        <Badge variant="secondary" className="px-3 py-1.5 text-xs font-medium">
                          Current Plan
                        </Badge>
                      </div>
                    )}

                    <Card
                      className={cn(
                        "relative h-full transition-all duration-300 hover:shadow-lg",
                        isActivePlan && "ring-2 ring-primary shadow-lg",
                        isPopular && !isActivePlan && "ring-2 ring-primary shadow-lg scale-105"
                      )}
                    >
                      {/* Card Header */}
                      <CardHeader className="text-center pb-6">
                        <CardTitle className="text-2xl font-bold">{tier.name}</CardTitle>
                        <CardDescription className="text-muted-foreground text-base">
                          {tier.subtitle}
                        </CardDescription>
                        
                        {/* Pricing */}
                        <div className="pt-4">
                          <div className="flex items-baseline justify-center space-x-1">
                            <span className="text-5xl font-bold tracking-tight">
                              ${isYearly ? tier.yearlyPrice : tier.monthlyPrice}
                            </span>
                            <span className="text-xl text-muted-foreground font-medium">
                              /{isYearly ? "year" : "month"}
                            </span>
                          </div>
                          {isYearly && tier.monthlyPrice > 0 && (
                            <div className="mt-2">
                              <Badge variant="outline" className="text-xs">
                                Save ${(tier.monthlyPrice * 12) - tier.yearlyPrice}/year
                              </Badge>
                            </div>
                          )}
                        </div>
                      </CardHeader>

                      {/* Features List */}
                      <CardContent className="flex-grow pt-0">
                        <ul className="space-y-4">
                          {tier.features.slice(0, 4).map((feature, index) => (
                            <li key={index} className="flex items-start gap-3">
                              <div className="flex-shrink-0 mt-0.5">
                                <Check className="w-5 h-5 text-primary" />
                              </div>
                              <div className="flex items-start gap-1 min-w-0">
                                <span className="text-sm leading-6 text-muted-foreground">
                                  {feature.label}
                                </span>
                                {feature.tooltip && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help flex-shrink-0 mt-0.5" />
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-[280px] text-sm">
                                      {feature.tooltip}
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            </li>
                          ))}
                          {tier.features.length > 4 && (
                            <li className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>+{tier.features.length - 4} more features</span>
                            </li>
                          )}
                        </ul>
                      </CardContent>

                      {/* Action Button */}
                      <CardFooter className="pt-6">
                        <Button
                          className={cn(
                            "w-full h-12 text-base font-semibold transition-all duration-200",
                            buttonConfig.variant === 'destructive' 
                              ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                              : isPopular && !isActivePlan
                              ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                              : isActivePlan
                              ? "bg-secondary hover:bg-secondary/80 text-secondary-foreground"
                              : isFree
                              ? "bg-muted text-muted-foreground cursor-not-allowed"
                              : "bg-primary hover:bg-primary/90 text-primary-foreground"
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

          {/* FAQ Section */}
          <div className="mt-24">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight mb-4">Frequently Asked Questions</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Everything you need to know about FootVault
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-3">What counts towards my variant limit?</h3>
                <p className="text-muted-foreground">
                  Only shoes with "Available" status count towards your limit. Once you sell a shoe, it no longer affects your quota.
                </p>
              </Card>
              
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-3">Can I change plans anytime?</h3>
                <p className="text-muted-foreground">
                  Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.
                </p>
              </Card>
              
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-3">What happens if I exceed my variant limit?</h3>
                <p className="text-muted-foreground">
                  You'll receive warnings when approaching your limit. Simply upgrade your plan to continue adding inventory.
                </p>
              </Card>
              
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-3">Is my data secure?</h3>
                <p className="text-muted-foreground">
                  Yes. We use enterprise-grade security and never share your data with third parties.
                </p>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </TooltipProvider>
  )
}
