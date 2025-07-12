"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function UserDashboard() {
  const [isSubscribed, setIsSubscribed] = useState(true)
  const [plan, setPlan] = useState<string>("Free")
  const [nextBillingDate, setNextBillingDate] = useState<string>("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchPlan() {
      setLoading(true)
      try {
        const res = await fetch("/api/user-plan")
        const data = await res.json()
        if (data.success) {
          setPlan(data.plan)
          setNextBillingDate(data.nextBillingDate)
          setIsSubscribed(data.plan !== "Free")
        }
      } catch (err) {
        // handle error
      } finally {
        setLoading(false)
      }
    }
    fetchPlan()
  }, [])

  // Plan features by tier
  const planFeatures: Record<string, string[]> = {
    Free: [
      "Unlimited products & variants (up to 10,000)",
      "Basic Dashboard",
      "Standard Support"
    ],
    Individual: [
      "export via CSV",
      "QR code printing for each pair"
    ],
    Team: [
      "All Individual features",
      "Team member avatars",
      "Priority email support"
    ],
    Store: [
      "All Team features",
      "Unlimited team avatars",
      "Dedicated customer support"
    ],
    Pro: [
      "Unlimited products & variants (up to 10,000)",
      "CSV Import/Export",
      "Avatar Management",
      "Priority Support",
      "Advanced Analytics"
    ],
    Enterprise: [
      "Unlimited products & variants (custom limit)",
      "CSV Import/Export",
      "Avatar Management",
      "Dedicated Support",
      "Advanced Analytics",
      "Custom Integrations"
    ]
  }

  const planPrice: Record<string, string> = {
    Free: "$0/mo",
    Individual: "$10/mo",
    Team: "$14/mo",
    Store: "$20/mo",
    Pro: "$19/mo",
    Enterprise: "Contact Us"
  }

  const planStatus = isSubscribed ? "Active" : "Inactive"
  const planColor = plan === "Pro" ? "text-blue-700" : plan === "Enterprise" ? "text-yellow-600" : "text-gray-500"

  return (
    <section className="w-full py-12 bg-gradient-to-b from-white to-gray-50 min-h-screen">
      <div className="container px-4 md:px-6">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl mb-2">Your Dashboard</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            A quick overview of your subscription and plan details.
          </p>
        </div>

        <Card className="max-w-2xl mx-auto p-8 rounded-3xl shadow-xl border border-gray-100 bg-white">
          <CardHeader className="pb-6">
            <CardTitle className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <span>Subscription Overview</span>
              {loading && <span className="ml-2 animate-spin text-blue-500">•</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="mb-6">
              <div className="flex justify-between text-xl font-semibold mb-2 text-gray-800">
                <span>Current Plan</span>
                <span className={planColor + " font-bold uppercase tracking-wide"}>{plan}</span>
              </div>
              <div className="flex justify-between text-sm mb-2 text-gray-500">
                <span>Status</span>
                <span className={planStatus === "Active" ? "text-green-600" : "text-red-600"}>{planStatus}</span>
              </div>
              <div className="flex justify-between text-sm mb-2 text-gray-500">
                <span>Price</span>
                <span>{planPrice[plan] || "$0/mo"}</span>
              </div>
              <div className="flex justify-between text-sm mb-2 text-gray-500">
                <span>Next Billing Date</span>
                <span>{nextBillingDate ? new Date(nextBillingDate).toLocaleDateString() : "-"}</span>
              </div>
            </div>
            <div>
              <div className="font-semibold text-gray-700 mb-3 text-lg">Plan Features</div>
              <ul className="list-disc list-inside text-base text-gray-700 space-y-2">
                {(planFeatures[plan] || planFeatures["Free"]).map((feature, idx) => (
                  <li key={idx}>{feature}</li>
                ))}
              </ul>
            </div>
            {!isSubscribed && !loading && (
              <div className="pt-8 border-t border-gray-200">
                <p className="text-red-600 font-semibold text-lg mb-2">Not Subscribed</p>
                <p className="text-base text-muted-foreground mb-6">Subscribe to unlock full features.</p>
                <Button
                  onClick={() => setIsSubscribed(true)}
                  className="w-full bg-gradient-to-r from-blue-700 to-blue-900 text-white hover:from-blue-800 hover:to-blue-900 text-lg py-3 rounded-xl"
                >
                  Subscribe Now
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
