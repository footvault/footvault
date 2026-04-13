"use client"

import { useState } from "react"
import { updateSettings } from "@/app/settings/actions"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getTimezoneList, useTimezone } from "@/context/TimezoneContext"
import { LocationManagementCard } from "@/components/location-management-card"
import { motion } from "framer-motion"
import {
  User,
  Globe,
  Clock,
  Receipt,
  CreditCard,
  MapPin,
  Save,
  CheckCircle2,
  ImageIcon,
  FileText,
  Sparkles,
  ArrowRight,
} from "lucide-react"

interface SettingsFormProps {
  user: {
    id: string
    username?: string
    plan?: string
    next_billing_date?: string
    currency?: string
    timezone?: string
    receipt_address?: string
    receipt_more_info?: string
    receipt_header_type?: 'username' | 'logo'
    receipt_logo_url?: string
  } | null
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
}

export function SettingsForm({ user }: SettingsFormProps) {
  const { formatDateInTimezone } = useTimezone();
  const [isPending, setIsPending] = useState(false)
  const [saved, setSaved] = useState(false)
  const [currency, setCurrency] = useState(user?.currency || "USD")
  const [timezone, setTimezone] = useState(user?.timezone || "America/New_York")
  const [receiptHeaderType, setReceiptHeaderType] = useState<'username' | 'logo'>(user?.receipt_header_type || 'username')

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsPending(true)
    setSaved(false)

    try {
      const formData = new FormData(event.currentTarget)
      const username = formData.get("username")?.toString()
      const receipt_address = formData.get("receipt_address")?.toString()
      const receipt_more_info = formData.get("receipt_more_info")?.toString()
      const receipt_logo_url = formData.get("receipt_logo_url")?.toString()

      await updateSettings({
        username,
        currency,
        timezone,
        receipt_address,
        receipt_more_info,
        receipt_header_type: receiptHeaderType,
        receipt_logo_url,
      })

      setSaved(true)
      toast.success("Settings saved successfully")
      setTimeout(() => setSaved(false), 3000)
    } catch (error) {
      console.error("Error updating settings:", error)
      toast.error("Failed to update settings")
    } finally {
      setIsPending(false)
    }
  }

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Not Authenticated</CardTitle>
          <CardDescription>Please sign in to view your settings.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const planColors: Record<string, string> = {
    Free: "bg-muted text-muted-foreground",
    Individual: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    Team: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    Store: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  }

  const currentPlan = user.plan || "Free"

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-5xl mx-auto space-y-6"
    >
      {/* Top Status Bar */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-3 px-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 text-emerald-500" />
            <span>Configure your FootVault experience</span>
          </div>
        </div>
      </motion.div>

      <form onSubmit={handleSubmit}>
        {/* Profile & Preferences Grid */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Profile Card */}
          <Card className="group relative overflow-hidden border border-border/50 hover:border-emerald-500/30 transition-all duration-300 hover:shadow-md hover:shadow-emerald-500/5">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
                  <User className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Profile</CardTitle>
                  <CardDescription className="text-xs">Your display name</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="username" className="text-xs font-medium text-muted-foreground">Username</Label>
                <Input
                  id="username"
                  name="username"
                  defaultValue={user.username}
                  placeholder="Enter your username"
                  className="h-9 transition-all duration-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50"
                />
              </div>
            </CardContent>
          </Card>

          {/* Currency & Timezone Card */}
          <Card className="group relative overflow-hidden border border-border/50 hover:border-emerald-500/30 transition-all duration-300 hover:shadow-md hover:shadow-emerald-500/5">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
                  <Globe className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Regional</CardTitle>
                  <CardDescription className="text-xs">Currency & timezone</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="currency" className="text-xs font-medium text-muted-foreground">Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger id="currency" className="h-9 w-full transition-all duration-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($) - US Dollar</SelectItem>
                    <SelectItem value="PHP">PHP (₱) - Philippine Peso</SelectItem>
                    <SelectItem value="EUR">EUR (€) - Euro</SelectItem>
                    <SelectItem value="GBP">GBP (£) - British Pound</SelectItem>
                    <SelectItem value="JPY">JPY (¥) - Japanese Yen</SelectItem>
                    <SelectItem value="CAD">CAD (C$) - Canadian Dollar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone" className="text-xs font-medium text-muted-foreground">Timezone</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger id="timezone" className="h-9 w-full transition-all duration-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50">
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {getTimezoneList().map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Receipt Settings */}
        <motion.div variants={itemVariants} className="mt-4">
          <Card className="group relative overflow-hidden border border-border/50 hover:border-emerald-500/30 transition-all duration-300 hover:shadow-md hover:shadow-emerald-500/5">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
                  <Receipt className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <CardTitle className="text-base">Receipt Customization</CardTitle>
                  <CardDescription className="text-xs">Configure how your receipts look</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="receipt_address" className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <MapPin className="h-3 w-3" />
                      Address
                    </Label>
                    <Input
                      id="receipt_address"
                      name="receipt_address"
                      defaultValue={user.receipt_address}
                      placeholder="e.g., 123 Main St, City, State 12345"
                      className="h-9 transition-all duration-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="receipt_header_type" className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <ImageIcon className="h-3 w-3" />
                      Header Type
                    </Label>
                    <Select value={receiptHeaderType} onValueChange={(value: 'username' | 'logo') => setReceiptHeaderType(value)}>
                      <SelectTrigger className="h-9 transition-all duration-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50">
                        <SelectValue placeholder="Choose header type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="username">Business Name (Username)</SelectItem>
                        <SelectItem value="logo">Logo Image</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {receiptHeaderType === 'logo' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-2"
                    >
                      <Label htmlFor="receipt_logo_url" className="text-xs font-medium text-muted-foreground">Logo URL</Label>
                      <Input
                        id="receipt_logo_url"
                        name="receipt_logo_url"
                        defaultValue={user.receipt_logo_url}
                        placeholder="https://example.com/logo.png"
                        type="url"
                        className="h-9 transition-all duration-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50"
                      />
                      <p className="text-[11px] text-muted-foreground leading-tight">
                        Use a direct image link (ends with .png, .jpg, etc.)
                      </p>
                    </motion.div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="receipt_more_info" className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <FileText className="h-3 w-3" />
                    Additional Info
                  </Label>
                  <Textarea
                    id="receipt_more_info"
                    name="receipt_more_info"
                    defaultValue={user.receipt_more_info}
                    placeholder={"Visit our facebook page and leave a review.\nhttps://www.facebook.com/your_page\nYour number\nWaze/Google Maps: Shoe Store"}
                    rows={receiptHeaderType === 'logo' ? 7 : 5}
                    className="resize-none transition-all duration-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Save Button */}
        <motion.div variants={itemVariants} className="mt-4 flex items-center gap-3">
          <Button
            type="submit"
            disabled={isPending}
            className={`
              relative px-6 h-10 font-medium transition-all duration-300
              ${saved
                ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25"
                : "bg-primary hover:bg-primary/90"
              }
            `}
          >
            {isPending ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="mr-2"
              >
                <Save className="h-4 w-4" />
              </motion.div>
            ) : saved ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
              </motion.div>
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isPending ? "Saving..." : saved ? "Saved!" : "Save Changes"}
          </Button>
          {saved && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="text-sm text-emerald-600 font-medium"
            >
              All changes saved
            </motion.span>
          )}
        </motion.div>
      </form>

      {/* Subscription Card */}
      <motion.div variants={itemVariants}>
        <Card className="group relative overflow-hidden border border-border/50 hover:border-border transition-all duration-300 hover:shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <CreditCard className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Subscription</CardTitle>
                  <CardDescription className="text-xs">Manage your plan and billing</CardDescription>
                </div>
              </div>
              <Badge
                variant="outline"
                className={`${planColors[currentPlan] || planColors.Free} border font-medium text-xs px-2.5`}
              >
                {currentPlan}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                {user.next_billing_date && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Next billing: {formatDateInTimezone(user.next_billing_date)}</span>
                  </div>
                )}
              </div>
              <Link href="subscription">
                <Button variant="outline" size="sm" className="gap-1.5 group/btn hover:border-emerald-500/50 hover:text-emerald-600 transition-all duration-200">
                  Manage
                  <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover/btn:translate-x-0.5" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Location Management */}
      <motion.div variants={itemVariants}>
        <LocationManagementCard />
      </motion.div>
    </motion.div>
  )
}
