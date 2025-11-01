"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, Package, CalendarIcon, TrendingUp } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { format, subMonths, startOfMonth, startOfYear, endOfDay } from "date-fns" // Import necessary date-fns functions
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { useState, useEffect, useRef } from "react" // Import useRef
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { useCurrency } from "@/context/CurrencyContext"
import { formatCurrency } from "@/lib/utils/currency"

interface SalesStats {
  totalSalesAmount: number
  totalNetProfit: number
  numberOfSales: number
  totalPendingAmount?: number // New optional field
}

interface SalesStatsCardProps {
  stats?: SalesStats // Make stats optional
  onDateRangeChange: (startDate: Date | null, endDate: Date | null) => void
  avatarProfits?: { avatarUrl: string; name: string; profit: number }[] // New prop
}

type DateRangeOption = "today" | "this-month" | "this-year" | "custom"

export function SalesStatsCard({
  stats = { totalSalesAmount: 0, totalNetProfit: 0, numberOfSales: 0, totalPendingAmount: 0 },
  onDateRangeChange,
  avatarProfits, // Destructure new prop
}: SalesStatsCardProps) {
  const { currency } = useCurrency()
  const [dateRangeOption, setDateRangeOption] = useState<DateRangeOption>("this-month")
  const [date, setDate] = useState<{ from?: Date; to?: Date } | undefined>(() => {
    const today = new Date()
    return { from: startOfMonth(today), to: endOfDay(today) } // Initialize to "this-month" equivalent
  })

  // Use a ref to store the last reported date range to prevent infinite loops
  const lastReportedRange = useRef<{ from: Date | null; to: Date | null }>({ from: null, to: null })

  useEffect(() => {
    const today = new Date()
    let startDate: Date | null = null
    let endDate: Date | null = null

    switch (dateRangeOption) {
      case "today":
        startDate = today
        endDate = today
        break
      case "this-month":
        startDate = startOfMonth(today)
        endDate = endOfDay(today)
        break
      case "this-year":
        startDate = startOfYear(today)
        endDate = endOfDay(today)
        break
      case "custom":
        startDate = date?.from || null
        endDate = date?.to || null
        break
    }

    // Normalize dates to remove time components for comparison if only date matters
    // Or ensure they are consistently start/end of day if time matters for range
    const normalizedStartDate = startDate
      ? new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
      : null
    const normalizedEndDate = endDate ? new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()) : null

    // Check if the calculated range is different from the last reported one
    const isSameRange =
      normalizedStartDate?.getTime() === lastReportedRange.current.from?.getTime() &&
      normalizedEndDate?.getTime() === lastReportedRange.current.to?.getTime()

    if (!isSameRange) {
      onDateRangeChange(startDate, endDate) // Call the parent callback
      lastReportedRange.current = { from: normalizedStartDate, to: normalizedEndDate } // Update the ref
    }
  }, [dateRangeOption, date, onDateRangeChange]) // onDateRangeChange is stable, date and dateRangeOption can change

  // Handle initial date state based on dateRangeOption
  useEffect(() => {
    const today = new Date()
    let newDateState: { from?: Date; to?: Date } | undefined

    switch (dateRangeOption) {
      case "today":
        newDateState = { from: today, to: today }
        break
      case "this-month":
        newDateState = { from: startOfMonth(today), to: endOfDay(today) }
        break
      case "this-year":
        newDateState = { from: startOfYear(today), to: endOfDay(today) }
        break
      case "custom":
        // If switching to custom, keep the current 'date' state or set a default if undefined
        if (!date?.from && !date?.to) {
          newDateState = { from: subMonths(today, 1), to: today }
        } else {
          newDateState = date // Keep existing custom range
        }
        break
    }
    // Only update if the newDateState is actually different to prevent unnecessary re-renders
    if (JSON.stringify(newDateState) !== JSON.stringify(date)) {
      setDate(newDateState)
    }
  }, [dateRangeOption]) // Only re-run when dateRangeOption changes

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-bold">Sales Overview</CardTitle>
        <Select value={dateRangeOption} onValueChange={(value: DateRangeOption) => setDateRangeOption(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select Date Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="this-month">This Month</SelectItem>
            <SelectItem value="this-year">This Year</SelectItem>
            <SelectItem value="custom">Custom Range</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="space-y-4">
        {dateRangeOption === "custom" && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={"outline"}
                className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date?.from ? (
                  date.to ? (
                    <>
                      {format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(date.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                 // @ts-ignore
                selected={date}
                onSelect={setDate}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        )}
        <div className={`grid grid-cols-1 gap-4 ${(stats.totalPendingAmount || 0) > 0 ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-3'}`}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Sales</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold"> {formatCurrency(stats.totalSalesAmount, currency)}</div>
              <p className="text-xs text-muted-foreground">Revenue from completed sales</p>
            </CardContent>
          </Card>

          {/* Only show Amount Pending card if there is a pending amount */}
          {(stats.totalPendingAmount || 0) > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Amount Pending</CardTitle>
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {formatCurrency(stats.totalPendingAmount || 0, currency)}
                </div>
                <p className="text-xs text-muted-foreground">Outstanding from pending sales</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Net Profit</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stats.totalNetProfit < 0 ? "text-red-600" : "text-green-600"}`}>
                {formatCurrency(stats.totalNetProfit, currency)}
              </div>
              <p className="text-xs text-muted-foreground">Profit after cost of goods sold</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Number of Sales</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.numberOfSales}</div>
              <p className="text-xs text-muted-foreground">Completed transactions</p>
            </CardContent>
          </Card>
        </div>

        {/* New section for avatar profits */}
        {avatarProfits && avatarProfits.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-4">Profit Distribution by Avatar</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {avatarProfits.map((avatar) => (
                <Card key={avatar.name} className="flex flex-col items-center p-4">
                  <Avatar className="h-16 w-16 mb-2">
                    <AvatarImage
                      src={
                        
                        `https://avatar-placeholder.iran.liara.run/api?name=${encodeURIComponent(avatar.name)}&background=random`
                      }
                      alt={avatar.name}
                    />
                    <AvatarFallback>{avatar.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <p className="text-sm font-medium text-center">{avatar.name}</p>
                  <p className={`text-lg font-bold ${avatar.profit < 0 ? "text-red-600" : "text-green-600"}`}>
                    {formatCurrency(avatar.profit, currency)}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
