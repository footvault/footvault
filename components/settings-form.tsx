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
  } | null
}

export function SettingsForm({ user }: SettingsFormProps) {
  const [isPending, setIsPending] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [currency, setCurrency] = useState(user?.currency || "USD")
  const [timezone, setTimezone] = useState(user?.timezone || "America/New_York")

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsPending(true)
    setSuccessMessage("")

    try {
      const formData = new FormData(event.currentTarget)
      const username = formData.get("username")?.toString()

      await updateSettings({
        username,
        currency,
        timezone,
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
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Update your profile settings.
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
