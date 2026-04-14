"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ArrowRight, CheckCircle2, CreditCard, ShieldCheck, Sparkles } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SubscriptionSuccessPage() {
  const params = useSearchParams();
  const checkoutId = params.get("checkout_id");
  const productId = params.get("product_id");

  useEffect(() => {
    // Optionally, call your backend to verify and update the user's plan
    // You can POST params to your own API if you want to sync immediately
  }, [params]);

  return (
    <div className="relative min-h-[calc(100svh-56px)] overflow-hidden bg-[#0b0f0d]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_40%),linear-gradient(180deg,_rgba(18,24,22,0.92),_rgba(11,15,13,1))]" />
      <div className="absolute inset-x-0 top-0 h-40 bg-[linear-gradient(90deg,rgba(16,185,129,0.12),transparent,rgba(34,197,94,0.12))] blur-3xl" />

      <div className="relative mx-auto flex min-h-[calc(100svh-56px)] max-w-5xl items-center justify-center px-4 py-12">
        <Card className="w-full max-w-3xl overflow-hidden rounded-[28px] border border-emerald-500/20 bg-white/[0.04] shadow-[0_24px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <CardContent className="p-0">
            <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="border-b border-white/10 p-8 sm:p-10 lg:border-b-0 lg:border-r">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  Premium unlocked
                </div>

                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15 ring-1 ring-emerald-400/20">
                  <CheckCircle2 className="h-9 w-9 text-emerald-400" />
                </div>

                <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Subscription successful
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-white/70 sm:text-base">
                  Your paid plan is being activated. FootVault will keep your billing state in sync automatically, so you can head back to your workspace and keep moving.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Button asChild className="h-11 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white hover:bg-emerald-500">
                    <Link href="/subscription">
                      Review subscription
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="h-11 rounded-xl border-white/15 bg-white/5 px-5 text-sm font-semibold text-white hover:bg-white/10 hover:text-white">
                    <Link href="/inventory">
                      Go to inventory
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="bg-white/[0.02] p-8 sm:p-10">
                <div className="space-y-5">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
                      <CreditCard className="h-4 w-4 text-emerald-400" />
                      Checkout details
                    </div>
                    <div className="space-y-2 text-sm text-white/65">
                      <p>Your subscription confirmation was received successfully.</p>
                      {checkoutId && (
                        <p>
                          Checkout ID: <span className="font-mono text-white/85">{checkoutId}</span>
                        </p>
                      )}
                      {productId && (
                        <p>
                          Product ID: <span className="font-mono text-white/85">{productId}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                      <ShieldCheck className="h-4 w-4 text-emerald-400" />
                      What happens next
                    </div>
                    <div className="space-y-3 text-sm text-white/65">
                      <div className="flex items-start gap-2">
                        <Badge className="mt-0.5 border-0 bg-emerald-500/15 text-[10px] text-emerald-300">1</Badge>
                        <p>Your plan status updates in FootVault and premium limits become available.</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <Badge className="mt-0.5 border-0 bg-emerald-500/15 text-[10px] text-emerald-300">2</Badge>
                        <p>If billing ever needs attention later, FootVault will warn you before access falls back to Free.</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <Badge className="mt-0.5 border-0 bg-emerald-500/15 text-[10px] text-emerald-300">3</Badge>
                        <p>You can review or manage your plan anytime from the subscription page.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
