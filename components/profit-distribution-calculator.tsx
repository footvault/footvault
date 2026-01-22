"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar as UIAvatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Plus, Trash2, Percent, Loader2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import type { ProfitDistributionTemplateDetail } from "@/lib/types"
import { formatCurrency } from "@/lib/utils/currency"
import { useCurrency } from "@/context/CurrencyContext"

interface Avatar {
  id: string
  name: string
  default_percentage: number
}

interface ProfitDistributionCalculatorProps {
  netProfit: number
  avatars: Avatar[]
  profitTemplates: ProfitDistributionTemplateDetail[]
  onRecordSale: (profitDistribution: { avatarId: string; percentage: number; amount: number }[]) => Promise<void>
  isRecordingSale: boolean
  shippingMode?: boolean
  downPaymentAmount?: number
  isShippingValid?: boolean
  shippingValidationErrors?: string[]
  hasPreorders?: boolean
}

export function ProfitDistributionCalculator({
  netProfit,
  avatars,
  profitTemplates,
  onRecordSale,
  isRecordingSale,
  shippingMode = false,
  downPaymentAmount = 0,
  isShippingValid = true,
  shippingValidationErrors = [],
  hasPreorders = false,
}: ProfitDistributionCalculatorProps) {
  console.log('ProfitDistributionCalculator: profitTemplates', profitTemplates)
  const [distributionType, setDistributionType] = useState<"default" | "manual" | "template">("default")
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [manualDistribution, setManualDistribution] = useState<{ id: string; avatarId: string; percentage: number }[]>(
    [],
  )

  useEffect(() => {
    console.log("ProfitTemplates prop received:", profitTemplates)
    if (profitTemplates.length > 0) {
      setDistributionType("template")
      setSelectedTemplateId(profitTemplates[0].id)
    } else if (avatars.length > 0) {
      setDistributionType("default")
    } else {
      setManualDistribution([])
      setDistributionType("manual")
    }
  }, [avatars, profitTemplates])

  const handleAddManualDistribution = () => {
    setManualDistribution((prev) => [...prev, { id: crypto.randomUUID(), avatarId: "", percentage: 0 }])
  }

  const handleRemoveManualDistribution = (id: string) => {
    setManualDistribution((prev) => prev.filter((item) => item.id !== id))
  }

  const handleManualPercentageChange = (id: string, value: number) => {
    setManualDistribution((prev) => prev.map((item) => (item.id === id ? { ...item, percentage: value } : item)))
  }

  const handleManualAvatarChange = (id: string, avatarId: string) => {
    setManualDistribution((prev) => prev.map((item) => (item.id === id ? { ...item, avatarId: avatarId } : item)))
  }

  const calculateDistributionAmounts = (distributionItems: { avatarId: string; percentage: number }[]) => {
    const totalPercentage = distributionItems.reduce((sum, item) => sum + item.percentage, 0)
    const distributedAmounts: { avatarId: string; percentage: number; amount: number }[] = []
    let sumOfCalculatedAmounts = 0

    if (totalPercentage === 0) {
      distributionItems.forEach((item) => {
        distributedAmounts.push({
          avatarId: item.avatarId,
          percentage: item.percentage,
          amount: 0,
        })
      })
    } else {
      for (let i = 0; i < distributionItems.length; i++) {
        const item = distributionItems[i]
        const amount = (netProfit * item.percentage) / 100
        distributedAmounts.push({
          avatarId: item.avatarId,
          percentage: item.percentage,
          amount: amount,
        })
        sumOfCalculatedAmounts += amount
      }

      if (Math.abs(totalPercentage - 100) < 0.001 && distributedAmounts.length > 0) {
        const difference = netProfit - sumOfCalculatedAmounts
        distributedAmounts[distributedAmounts.length - 1].amount += difference
      }
    }
    return distributedAmounts
  }

  const currentDistribution = useMemo(() => {
    if (distributionType === "default") {
      const mainAccount = avatars.find((a) => (a as any).type === "Main")
      if (mainAccount) {
        return calculateDistributionAmounts([
          { avatarId: mainAccount.id, percentage: 100 },
        ])
      }
      return []
    }
    if (distributionType === "template" && selectedTemplateId) {
      const selectedTemplate = profitTemplates.find((t) => t.id === selectedTemplateId)
      if (selectedTemplate && selectedTemplate.distributions) {
        return calculateDistributionAmounts(
          selectedTemplate.distributions.map((d) => ({ avatarId: d.avatar_id, percentage: d.percentage })),
        )
      }
    }
    return calculateDistributionAmounts(manualDistribution)
  }, [distributionType, selectedTemplateId, profitTemplates, manualDistribution, netProfit, avatars])

  const totalDistributedPercentage = useMemo(() => {
    if (distributionType === "default") {
      return 100
    }
    if (distributionType === "template" && selectedTemplateId) {
      const selectedTemplate = profitTemplates.find((t) => t.id === selectedTemplateId)
      return selectedTemplate?.distributions?.reduce((sum, item) => sum + item.percentage, 0) || 0
    }
    return manualDistribution.reduce((sum, item) => sum + item.percentage, 0)
  }, [distributionType, selectedTemplateId, profitTemplates, manualDistribution])

  const totalDistributedAmount = useMemo(() => {
    return currentDistribution.reduce((sum, item) => sum + item.amount, 0)
  }, [currentDistribution])

  const handleRecordSaleClick = () => {
    if (totalDistributedPercentage !== 100) {
      toast({
        title: "Distribution Mismatch",
        description: "Total profit distribution percentage must be exactly 100%.",
        variant: "destructive",
      })
      return
    }
    if (currentDistribution.some((item) => !item.avatarId)) {
      toast({
        title: "Missing Avatar",
        description: "Please select an avatar for all distribution entries.",
        variant: "destructive",
      })
      return
    }
    onRecordSale(currentDistribution)
  }

  const { currency } = useCurrency(); // Get the user's selected currency

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Percent className="h-5 w-5" /> Profit Distribution
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="distribution-type" className="text-sm">
            Distribution Type
          </Label>
          <Select value={distributionType} onValueChange={(value: "default" | "manual" | "template") => setDistributionType(value)}>
            <SelectTrigger id="distribution-type">
              <SelectValue placeholder="Select distribution type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default (Main Account Only)</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
              <SelectItem value="template" disabled={profitTemplates.length === 0}>
                Template ({profitTemplates.length})
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {distributionType === "default" && (
          <div className="space-y-3">
            {(() => {
              const mainAccount = avatars.find((a) => (a as any).type === "Main")
              if (!mainAccount) return <p className="text-sm text-gray-500">No Main Account avatar found.</p>
              return (
                <div className="flex items-center gap-2">
                  <UIAvatar className="h-6 w-6">
                    <AvatarImage src={`/api/avatar?name=${mainAccount.name}`} />
                    <AvatarFallback>{mainAccount.name.charAt(0)}</AvatarFallback>
                  </UIAvatar>
                  <span>{mainAccount.name}</span>
                  <div className="relative w-24">
                    <Input type="number" value={100} readOnly disabled className="pr-6 bg-gray-100" />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                  </div>
                </div>
              )
            })()}
          </div>
        )}

        {distributionType === "template" && (
          <div>
            <Label htmlFor="profit-template" className="text-sm">
              Select Template
            </Label>
            <Select value={selectedTemplateId || ""} onValueChange={(value) => setSelectedTemplateId(value)}>
              <SelectTrigger id="profit-template">
                <SelectValue placeholder="Select a profit template" />
              </SelectTrigger>
              <SelectContent>
                {profitTemplates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {distributionType === "manual" && (
          <div className="space-y-3">
            {manualDistribution.map((item) => (
              <div key={item.id} className="flex items-center gap-2">
                <Select value={item.avatarId} onValueChange={(value) => handleManualAvatarChange(item.id, value)}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select Avatar" />
                  </SelectTrigger>
                  <SelectContent>
                    {avatars.map((avatar) => (
                      <SelectItem key={avatar.id} value={avatar.id}>
                        <div className="flex items-center gap-2">
                          <UIAvatar className="h-6 w-6">
                            <AvatarImage src={`/api/avatar?name=${avatar.name}`} />
                            <AvatarFallback>{avatar.name.charAt(0)}</AvatarFallback>
                          </UIAvatar>
                          {avatar.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative w-24">
                  <Input
                    type="number"
                    value={item.percentage || ""}
                    onChange={(e) => {
                      const value = e.target.value
                      if (value === "") {
                        handleManualPercentageChange(item.id, 0)
                      } else {
                        handleManualPercentageChange(item.id, Number(value))
                      }
                    }}
                    placeholder="0"
                    min="0"
                    max="100"
                    step="0.01"
                    className="pr-6"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleRemoveManualDistribution(item.id)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            ))}
            <Button variant="outline" className="w-full" onClick={handleAddManualDistribution}>
              <Plus className="h-4 w-4 mr-2" /> Add Participant
            </Button>
          </div>
        )}

        {distributionType === "template" && selectedTemplateId && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Template Participants:</h4>
            {currentDistribution.length === 0 ? (
              <p className="text-sm text-gray-500">This template has no participants defined.</p>
            ) : (
              currentDistribution.map((item) => {
                const avatar = avatars.find((a) => a.id === item.avatarId)
                return (
                  <div key={item.avatarId} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <UIAvatar className="h-6 w-6">
                        <AvatarImage src={`/api/avatar?name=${avatar?.name}`} />
                        <AvatarFallback>{avatar?.name?.charAt(0)}</AvatarFallback>
                      </UIAvatar>
                      <span>{avatar?.name || "Unknown Avatar"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.percentage.toFixed(2)}%</span>
                      <span className="text-gray-500">({formatCurrency(item.amount, currency)})</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        <div className="border-t pt-4 space-y-2">
          <div className="flex justify-between text-sm font-medium">
            <span>Total Profit:</span>
            <span className={netProfit < 0 ? "text-red-600" : "text-green-600"}>{formatCurrency(netProfit, currency)}</span>
          </div>
          <div className="flex justify-between text-sm font-medium">
            <span>Total Distributed Percentage:</span>
            <span className={totalDistributedPercentage !== 100 ? "text-red-500" : "text-green-600"}>
              {totalDistributedPercentage.toFixed(2)}%
            </span>
          </div>
          <div className="flex justify-between text-sm font-medium">
            <span>Total Distributed Amount:</span>
            <span className={Math.abs(totalDistributedAmount - netProfit) > 0.01 ? "text-red-500" : "text-green-600"}>
              {formatCurrency(totalDistributedAmount, currency)}
            </span>
          </div>
          {Math.abs(totalDistributedAmount - netProfit) > 0.01 && (
            <p className="text-xs text-red-500">
              Warning: Distributed amount does not match net profit. Adjust percentages.
            </p>
          )}
        </div>

        {/* Shipping validation errors display */}
        {shippingMode && !isShippingValid && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-sm font-medium text-red-800 mb-2">Shipping details incomplete:</p>
            <ul className="text-sm text-red-700 space-y-1">
              {shippingValidationErrors.map((error, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-red-500 mr-2">•</span>
                  {error}
                </li>
              ))}
            </ul>
          </div>
        )}

        <Button
          className="w-full"
          onClick={handleRecordSaleClick}
          disabled={
            isRecordingSale ||
            (distributionType === "manual" && manualDistribution.length === 0) ||
            totalDistributedPercentage !== 100 ||
            (shippingMode && !isShippingValid)
          }
        >
          {isRecordingSale ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
            </>
          ) : shippingMode ? (
            hasPreorders 
              ? 'Complete Order (COD)'
              : `Record Down Payment (${formatCurrency(downPaymentAmount, currency)})`
          ) : (
            "Complete Sale"
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
