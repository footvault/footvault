"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, Package, CalendarIcon, TrendingUp, Clock } from "lucide-react"
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
import { Skeleton } from "@/components/ui/skeleton"
import { motion } from "framer-motion"
import { useCountUp } from "@/hooks/useCountUp"

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
  isLoading?: boolean // New loading prop
}

type DateRangeOption = "today" | "this-month" | "this-year" | "custom"

export function SalesStatsCard({
  stats = { totalSalesAmount: 0, totalNetProfit: 0, numberOfSales: 0, totalPendingAmount: 0 },
  onDateRangeChange,
  avatarProfits, // Destructure new prop
  isLoading = false, // Destructure loading prop
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

  // Count-up animations for stat values
  const animatedSalesAmount = useCountUp(Math.round(stats.totalSalesAmount * 100), 800, !isLoading)
  const animatedPendingAmount = useCountUp(Math.round((stats.totalPendingAmount || 0) * 100), 800, !isLoading)
  const animatedNetProfit = useCountUp(Math.round(stats.totalNetProfit * 100), 800, !isLoading)
  const animatedNumberOfSales = useCountUp(stats.numberOfSales, 600, !isLoading)

  return (
    <div className="space-y-4">
      {/* Date Range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">Sales Overview</h2>
        <div className="flex items-center gap-2">
          <Select value={dateRangeOption} onValueChange={(value: DateRangeOption) => setDateRangeOption(value)}>
            <SelectTrigger className="w-[160px] h-9 text-sm">
              <SelectValue placeholder="Select Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="this-month">This Month</SelectItem>
              <SelectItem value="this-year">This Year</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {dateRangeOption === "custom" && (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="date"
              variant={"outline"}
              className={cn("w-full sm:w-auto justify-start text-left font-normal h-9 text-sm", !date && "text-muted-foreground")}
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

      {/* Stats Grid */}
      <div className={`grid grid-cols-1 gap-3 ${(isLoading || (stats.totalPendingAmount || 0) > 0) ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-3'}`}>
        {/* Completed Sales */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0 }}
        >
          <div className="group relative flex items-center gap-3 rounded-xl border bg-card p-4 transition-all duration-200 hover:shadow-md hover:border-border/80">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 transition-transform duration-200 group-hover:scale-105">
              <DollarSign className="h-5 w-5 text-emerald-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-muted-foreground">Completed Sales</p>
              {isLoading ? (
                <Skeleton className="h-7 w-28 mt-0.5" />
              ) : (
                <p className="text-xl font-bold text-foreground truncate">{formatCurrency(animatedSalesAmount / 100, currency)}</p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Amount Pending */}
        {(isLoading || (stats.totalPendingAmount || 0) > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
          >
            <div className="group relative flex items-center gap-3 rounded-xl border bg-card p-4 transition-all duration-200 hover:shadow-md hover:border-border/80">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 transition-transform duration-200 group-hover:scale-105">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground">Amount Pending</p>
                {isLoading ? (
                  <Skeleton className="h-7 w-28 mt-0.5" />
                ) : (
                  <p className="text-xl font-bold text-amber-600 dark:text-amber-400 truncate">{formatCurrency(animatedPendingAmount / 100, currency)}</p>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Total Net Profit */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <div className="group relative flex items-center gap-3 rounded-xl border bg-card p-4 transition-all duration-200 hover:shadow-md hover:border-border/80">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105 ${
              stats.totalNetProfit < 0 ? 'bg-red-500/10' : 'bg-blue-500/10'
            }`}>
              <TrendingUp className={`h-5 w-5 ${stats.totalNetProfit < 0 ? 'text-red-500' : 'text-blue-500'}`} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-muted-foreground">Net Profit</p>
              {isLoading ? (
                <Skeleton className="h-7 w-28 mt-0.5" />
              ) : (
                <p className={`text-xl font-bold truncate ${stats.totalNetProfit < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                  {formatCurrency(animatedNetProfit / 100, currency)}
                </p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Number of Sales */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
        >
          <div className="group relative flex items-center gap-3 rounded-xl border bg-card p-4 transition-all duration-200 hover:shadow-md hover:border-border/80">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 transition-transform duration-200 group-hover:scale-105">
              <Package className="h-5 w-5 text-purple-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-muted-foreground">Total Sales</p>
              {isLoading ? (
                <Skeleton className="h-7 w-16 mt-0.5" />
              ) : (
                <p className="text-xl font-bold text-foreground">{animatedNumberOfSales}</p>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Avatar Profits Section */}
      {(isLoading || (avatarProfits && avatarProfits.length > 0)) && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <div className="rounded-xl border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Profit by Avatar</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
                    <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                    <div className="min-w-0 flex-1">
                      <Skeleton className="h-3.5 w-16 mb-1" />
                      <Skeleton className="h-5 w-14" />
                    </div>
                  </div>
                ))
              ) : (
                avatarProfits?.map((avatar, index) => (
                  <motion.div
                    key={avatar.name}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.25, delay: 0.25 + index * 0.05 }}
                  >
                    <div className="group flex items-center gap-3 rounded-lg border bg-muted/30 p-3 transition-all duration-200 hover:bg-muted/50 hover:shadow-sm">
                      <Avatar className="h-10 w-10 shrink-0 transition-transform duration-200 group-hover:scale-105">
                        <AvatarImage
                          src={`https://avatar-placeholder.iran.liara.run/api?name=${encodeURIComponent(avatar.name)}&background=random`}
                          alt={avatar.name}
                        />
                        <AvatarFallback className="text-xs font-medium">{avatar.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-muted-foreground truncate">{avatar.name}</p>
                        <p className={`text-sm font-bold truncate ${avatar.profit < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                          {formatCurrency(avatar.profit, currency)}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
