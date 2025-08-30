"use client"

import { useState, useMemo, useTransition, useEffect } from "react"
import type { Avatar } from "@/lib/types"
import type { ProfitDistributionTemplateDetail, Sale, SalesStats } from "@/lib/types"


import { SalesStatsCard } from "@/components/sales-stats-card"
import { AvatarManagementModal } from "@/components/avatar-management-modal"
import { ProfitTemplateManagementModal } from "@/components/profit-template-management-modal"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Plus, Search, Filter, Loader2 } from "lucide-react"
import Link from "next/link"
import { SaleDetailModal } from "@/components/sale-detail-modal"
import  SalesList from "@/components/sales-list"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu"
import { createClient } from "@/lib/supabase/client"
import PremiumFeatureModal from "./PremiumFeatureModal"

interface SalesClientWrapperProps {
  initialSales: Sale[]
  initialAvatars: Avatar[]
  initialProfitTemplates: ProfitDistributionTemplateDetail[]
  initialAvatarProfits: { avatarUrl: string; name: string; profit: number }[] // New prop
}

export function SalesClientWrapper({
  initialSales,
  initialAvatars,
  initialProfitTemplates,
  initialAvatarProfits,
}: SalesClientWrapperProps) {
  const supabase = createClient();
  const [sales, setSales] = useState<Sale[]>(initialSales)
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [salesStats, setSalesStats] = useState<SalesStats>({ totalSalesAmount: 0, totalNetProfit: 0, numberOfSales: 0 })
  const [dateRange, setDateRange] = useState<{ from: Date | null; to: Date | null }>({ from: null, to: null })
  const [isFetchingStats, startFetchingStatsTransition] = useTransition()
  const [avatars, setAvatars] = useState<Avatar[]>(initialAvatars)
  const [profitTemplates, setProfitTemplates] = useState<ProfitDistributionTemplateDetail[]>(initialProfitTemplates)
  const [searchTerm, setSearchTerm] = useState("")
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false)
  const [isProfitTemplateModalOpen, setIsProfitTemplateModalOpen] = useState(false)
  const [selectedFilters, setSelectedFilters] = useState<string[]>([])
  const [isRefreshingData, startRefreshTransition] = useTransition()
  const [avatarProfits, setAvatarProfits] =
    useState<{ avatarUrl: string; name: string; profit: number }[]>(initialAvatarProfits) // New state
  const [userPlan, setUserPlan] = useState<string | null>(null);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  // Function to calculate avatar profits from sales data
  const calculateAvatarProfits = (salesData: Sale[], avatarData: Avatar[]) => {
    const avatarProfitMap = new Map<string, {
      avatarUrl: string;
      name: string;
      profit: number;
    }>();

    avatarData.forEach(avatar => {
      avatarProfitMap.set(avatar.id, {
        avatarUrl: avatar.image || '/placeholder.svg',
        name: avatar.name,
        profit: 0
      });
    });

    // Filter out refunded sales
    const nonRefundedSales = salesData.filter(sale => sale.status !== 'refunded');

    nonRefundedSales.forEach(sale => {
      (sale.profitDistribution || []).forEach((dist: any) => {
        const currentProfit = avatarProfitMap.get(dist.avatar?.id);
        if (currentProfit && dist.amount) {
          currentProfit.profit += Number(dist.amount);
        }
      });
    });

    return Array.from(avatarProfitMap.values());
  };

  // Function to handle date range changes from SalesStatsCard
  const handleDateRangeChange = (startDate: Date | null, endDate: Date | null) => {
    setDateRange({ from: startDate, to: endDate })
  }

  useEffect(() => {
    startFetchingStatsTransition(async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError || !session?.access_token) {
          console.error('Authentication error:', sessionError)
          return
        }

        const queryParams = new URLSearchParams()
        if (dateRange.from) {
          queryParams.set('from', dateRange.from.toISOString())
        }
        if (dateRange.to) {
          queryParams.set('to', dateRange.to.toISOString())
        }

        const response = await fetch(`/api/get-sales-stats?${queryParams.toString()}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          }
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to fetch sales stats')
        }

        const data = await response.json()
        if (data.success === false) {
          throw new Error(data.error || 'Failed to fetch sales stats')
        }

        setSalesStats({
          totalSalesAmount: data.totalSalesAmount || 0,
          totalNetProfit: data.totalNetProfit || 0,
          numberOfSales: data.numberOfSales || 0
        })
      } catch (error) {
        console.error('Error fetching sales stats:', error)
      }
    })
  }, [dateRange])

  // Fetch sales from API with session token
  const fetchSalesFromApi = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/get-sales', {
        headers: {
          Authorization: `Bearer ${session?.access_token || ''}`
        }
      });
      const result = await response.json();
      if (result.success && result.data) {
      
        setSales(result.data);
        // Recalculate avatar profits with the updated sales data
        const updatedAvatarProfits = calculateAvatarProfits(result.data, avatars);
        setAvatarProfits(updatedAvatarProfits);
      } else {
        console.error('Failed to fetch sales:', result.error);
      }
    } catch (err) {
      console.error('Failed to fetch sales:', err);
    }
  };

  // Initial load: fetch latest sales from API
  useEffect(() => {
    fetchSalesFromApi();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Function to refresh avatars and profit templates data
  const refreshManagementData = async () => {
    startRefreshTransition(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const response = await fetch('/api/get-avatars', {
          headers: {
            Authorization: `Bearer ${session?.access_token || ''}`
          }
        })
        const { success, data: refreshedAvatars, error: avatarError } = await response.json()
        if (success && refreshedAvatars) {
          setAvatars(refreshedAvatars)
          // Recalculate avatar profits with updated avatars
          const updatedAvatarProfits = calculateAvatarProfits(sales, refreshedAvatars);
          setAvatarProfits(updatedAvatarProfits);
        } else {
          console.error("Failed to refresh avatars:", avatarError)
        }
      } catch (err) {
        console.error("Failed to refresh avatars:", err)
      }

      let refreshedTemplates = null;
      let templateError = null;
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const response = await fetch('/api/get-profit-templates', {
          headers: {
            Authorization: `Bearer ${session?.access_token || ''}`
          }
        })
        const result = await response.json()
        if (result.success && result.data) {
          refreshedTemplates = result.data
        } else {
          templateError = result.error
        }
      } catch (err) {
        templateError = err
      }
      if (refreshedTemplates) {
        setProfitTemplates(refreshedTemplates)
      } else {
        console.error("Failed to refresh profit templates:", templateError)
      }

      // Also refresh sales data as avatars/templates might affect how sales are displayed
      let refreshedSales = null;
      let salesError = null;
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const response = await fetch('/api/get-sales', {
          headers: {
            Authorization: `Bearer ${session?.access_token || ''}`
          }
        })
        const result = await response.json()
        if (result.success && result.data) {
          refreshedSales = result.data
        } else {
          salesError = result.error
        }
      } catch (err) {
        salesError = err
      }
      if (refreshedSales) {
        setSales(refreshedSales)
        // Recalculate avatar profits with updated sales data
        const updatedAvatarProfits = calculateAvatarProfits(refreshedSales, avatars);
        setAvatarProfits(updatedAvatarProfits);
      } else {
        console.error("Failed to refresh sales after management data update:", salesError)
      }
    })
  }

  const handleViewDetails = (sale: Sale) => {
    setSelectedSale(sale)
    setShowDetailModal(true)
  }

  const filteredSales = useMemo(() => {
    let filtered = sales

    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (sale) =>
          sale.id.toLowerCase().includes(lowerCaseSearchTerm) ||
          sale.sale_date.includes(lowerCaseSearchTerm) ||
          sale.customer_name?.toLowerCase().includes(lowerCaseSearchTerm) || // Search by customer name
          sale.customer_phone?.toLowerCase().includes(lowerCaseSearchTerm) || // Search by customer phone
          sale.items.some(
            (item: { variant: { productName: string; productBrand: string; serialNumber: string } }) =>
              item.variant.productName.toLowerCase().includes(lowerCaseSearchTerm) ||
              item.variant.productBrand.toLowerCase().includes(lowerCaseSearchTerm) ||
              item.variant.serialNumber.toLowerCase().includes(lowerCaseSearchTerm),
          ),
      )
    }

    // Apply filters (example: by profit range, or specific items)
    // This is a placeholder for more complex filtering logic
    if (selectedFilters.includes("high_profit")) {
      filtered = filtered.filter((sale) => sale.net_profit > 100) // Example threshold
    }

    return filtered
  }, [sales, searchTerm, selectedFilters])

  const handleFilterChange = (filter: string) => {
    setSelectedFilters((prev) => (prev.includes(filter) ? prev.filter((f) => f !== filter) : [...prev, filter]))
  }

  // Fetch user plan on mount
  useEffect(() => {
    async function fetchPlan() {
      try {
        const res = await fetch("/api/user-plan");
        const data = await res.json();
        setUserPlan(data.plan || "free");
      } catch {
        setUserPlan("free");
      }
    }
    fetchPlan();
  }, []);

  return (
    <div className="container mx-auto py-4 px-2 sm:px-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Sales History</h1>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={() => setIsProfitTemplateModalOpen(true)} className="w-full sm:w-auto">
            Manage Templates
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              if (userPlan === "free" || userPlan === "individual") {
                setShowPremiumModal(true);
              } else if (userPlan === "team" && avatars.length >= 5) {
                setShowPremiumModal(true);
              } else {
                setIsAvatarModalOpen(true);
              }
            }}
            className="w-full sm:w-auto"
          >
            Manage Avatars
          </Button>
          <Link href="/checkout" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" /> New Sale
            </Button>
          </Link>
        </div>
      </div>

      <div className="mb-6">
        <SalesStatsCard stats={salesStats} onDateRangeChange={handleDateRangeChange} avatarProfits={avatarProfits} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Search className="h-5 w-5" /> Search Sales
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
        

          {isRefreshingData ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
              <p className="text-gray-600">Refreshing data...</p>
            </div>
          ) : (
            // @ts-ignore
            <div className="overflow-x-auto">
              
              <SalesList sales={filteredSales}
              onRefunded={fetchSalesFromApi}
              onDeleted={fetchSalesFromApi}
              // @ts-ignore
              onSelectSale={handleViewDetails} />
            </div>
          )}
        </CardContent>
      </Card>
   
      {selectedSale && (
        <SaleDetailModal
          open={showDetailModal}
          onOpenChange={setShowDetailModal}
          sale={{ ...selectedSale, items: selectedSale.items ?? [] }}
        />
      )}

      <AvatarManagementModal
        open={isAvatarModalOpen}
        onOpenChange={(open) => {
          setIsAvatarModalOpen(open)
          if (!open) {
            refreshManagementData()
          }
        }}
        initialAvatars={avatars}
        refreshAvatars={refreshManagementData}
      />

      <ProfitTemplateManagementModal
        isOpen={isProfitTemplateModalOpen}
        onClose={() => {
          setIsProfitTemplateModalOpen(false)
          refreshManagementData()
        }}
        avatars={avatars}
        profitTemplates={profitTemplates}
      />

      <PremiumFeatureModal
        open={showPremiumModal}
        onOpenChange={setShowPremiumModal}
        featureName={userPlan === "team" ? "Up to 5 Avatars allowed on Team plan. Upgrade for more." : "Avatar Management"}
      />
    </div>
  )
}
