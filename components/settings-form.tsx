"use client"

import { useState } from "react"
import { User } from "@supabase/supabase-js"
import { updateSettings } from "@/app/settings/actions"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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

export function SettingsForm({ user }: SettingsFormProps) {
  const [isPending, setIsPending] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [currency, setCurrency] = useState(user?.currency || "USD")
  const [timezone, setTimezone] = useState(user?.timezone || "America/New_York")
  const [receiptHeaderType, setReceiptHeaderType] = useState<'username' | 'logo'>(user?.receipt_header_type || 'username')

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsPending(true)
    setSuccessMessage("")

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

      setSuccessMessage("Settings updated successfully.")
      toast.success("Settings updated successfully")
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile Settings</CardTitle>
          <CardDescription>
            Update your profile settings and receipt information.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                defaultValue={user.username}
                placeholder="Enter your username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency Format</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="currency" className="w-full">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($) - United States Dollar</SelectItem>
                  <SelectItem value="PHP">PHP (₱) - Philippine Peso</SelectItem>
                  <SelectItem value="EUR">EUR (€) - Euro</SelectItem>
                  <SelectItem value="GBP">GBP (£) - British Pound</SelectItem>
                  <SelectItem value="JPY">JPY (¥) - Japanese Yen</SelectItem>
                  <SelectItem value="CAD">CAD (C$) - Canadian Dollar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger id="timezone" className="w-full">
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                  <SelectItem value="America/Los_Angeles">America/Los_Angeles (PST)</SelectItem>
                  <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                  <SelectItem value="Asia/Tokyo">Asia/Tokyo (JST)</SelectItem>
                  <SelectItem value="Asia/Manila">Asia/Manila (PHT)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="receipt_address">Receipt Address</Label>
              <Input
                id="receipt_address"
                name="receipt_address"
                defaultValue={user.receipt_address}
                placeholder="e.g., 123 Main St, City, State 12345"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="receipt_header_type">Receipt Header</Label>
              <Select value={receiptHeaderType} onValueChange={(value: 'username' | 'logo') => setReceiptHeaderType(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose header type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="username">Business Name (Username)</SelectItem>
                  <SelectItem value="logo">Logo Image</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {receiptHeaderType === 'logo' && (
              <div className="space-y-2">
                <Label htmlFor="receipt_logo_url">Logo Image URL</Label>
                <Input
                  id="receipt_logo_url"
                  name="receipt_logo_url"
                  defaultValue={user.receipt_logo_url}
                  placeholder="https://example.com/your-logo.png"
                  type="url"
                />
                <p className="text-xs text-muted-foreground">
                  Recommended: Copy the image address of your social media profile picture or logo image. Make sure it's a direct link to the image (ends with .png, .jpg, etc.).
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="receipt_more_info">Receipt Additional Info</Label>
              <Textarea
                id="receipt_more_info"
                name="receipt_more_info"
                defaultValue={user.receipt_more_info}
                placeholder="Visit our facebook page and leave a review.&#10;https://www.facebook.com/your_Facebook_page&#10;your number&#10;Waze/Google Maps: Shoe Store"
                rows={4}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col items-start">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
            {successMessage && (
              <p className="mt-2 text-sm text-green-500">{successMessage}</p>
            )}
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
          <CardDescription>
            Manage your subscription plan and billing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Current Plan</Label>
            <div className="flex items-center space-x-2">
              <Badge variant={user.plan === "Free" ? "secondary" : "default"}>
                {user.plan || "Free"}
              </Badge>
            </div>
          </div>
          {user.next_billing_date && (
            <div className="space-y-2">
              <Label>Next Billing Date</Label>
              <p className="text-sm text-gray-500">
                {new Date(user.next_billing_date).toLocaleDateString()}
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Link href="subscription" className="w-full">
            <Button>
              Manage Subscription
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
