"use client"

import { useState, useEffect } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Check, HelpCircle } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { pricingTiers } from "@/lib/pricing-tiers"

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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure you want to cancel your subscription?</DialogTitle>
          </DialogHeader>
          <div className="py-2 text-gray-700">
            If you cancel your subscription, you will lose access to all premium features associated with your current plan. Your advanced features will be removed, and you will be downgraded to the Free plan. This action cannot be undone.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelModal(false)}>Go Back</Button>
            <Button variant="destructive" onClick={confirmCancelSubscription}>Yes, Cancel Subscription</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <section className="w-full py-12 md:py-24 lg:py-12 bg-white">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl">Pricing</h1>
              <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Check out our affordable pricing plans designed for resellers and stores
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center space-x-2 py-8">
            <Label htmlFor="pricing-toggle" className="text-base font-medium">Monthly</Label>
            <Switch
              id="pricing-toggle"
              checked={isYearly}
              onCheckedChange={setIsYearly}
              className="data-[state=checked]:bg-black data-[state=unchecked]:bg-gray-200"
            />
            <Label htmlFor="pricing-toggle" className="text-base font-medium">Yearly</Label>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 items-stretch">
              {pricingTiers.map((tier) => {
                const buttonConfig = getButtonConfig(tier)
                const isActivePlan = userActivePlan === tier.planType

                return (
                  <div key={tier.name} className="relative h-full">
                    {tier.name === "team" && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                        <span className="rounded-full border border-black bg-black px-4 py-1 text-sm font-semibold text-white shadow-sm">
                          Recommended
                        </span>
                      </div>
                    )}

                    {isActivePlan && (
                      <div className="absolute -top-3 right-4 z-10">
                        <span className="rounded-full bg-green-100 text-green-800 px-3 py-1 text-xs font-medium ring-1 ring-inset ring-green-600/20">
                          Active
                        </span>
                      </div>
                    )}

                    <Card
                      className={`
                        h-full flex flex-col justify-between p-6 rounded-2xl transition-all duration-200
                        ${
                          isActivePlan
                            ? "bg-gradient-to-br from-green-50 to-white border border-green-500 ring-2 ring-green-500/30 shadow-sm"
                            : tier.name === "Team"
                            ? "border border-neutral-900 shadow-lg hover:shadow-xl ring-1 ring-neutral-900/10"
                            : "border border-gray-200 hover:shadow-md"
                        }
                      `}
                    >
                      <CardHeader className="pb-4">
                        <CardTitle className="text-2xl font-bold">{tier.name}</CardTitle>
                        <CardDescription className="text-muted-foreground">{tier.subtitle}</CardDescription>
                        <div className="mt-4 text-4xl font-bold">
                          ${isYearly ? tier.yearlyPrice : tier.monthlyPrice}
                          <span className="text-lg font-normal text-muted-foreground">
                            /{isYearly ? "yr" : "mo"}
                          </span>
                        </div>
                        <hr className="my-4 border-gray-200" />
                      </CardHeader>

                      <CardContent className="flex-grow">
                        <ul className="space-y-2">
                          {tier.features.map((feature, index) => (
                            <li key={index} className="flex items-start gap-2 text-muted-foreground">
                              <Check className="w-5 h-5 mt-1 text-black" />
                              <div className="flex items-center gap-1">
                                <span>{feature.label}</span>
                                {feature.tooltip && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="ml-1 cursor-help text-gray-400">
                                        <HelpCircle className="w-4 h-4" />
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="right" className="max-w-[220px] text-sm z-50">
                                      {feature.tooltip}
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </CardContent>

                      <CardFooter className="pt-6">
                        <Button
                          className={`w-full ${
                            buttonConfig.variant === 'destructive'
                              ? ' text-white hover:bg-red-700'
                              : 'bg-black text-white hover:bg-gray-800'
                          }`}
                          onClick={buttonConfig.onClick}
                          disabled={buttonConfig.disabled}
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
        </div>
      </section>
    </TooltipProvider>
  )
}
