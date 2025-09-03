import { createClient } from '@/lib/supabase/client'
import { Variant } from '@/lib/types'
import { SaleSplit } from '@/lib/types/consignor'

/**
 * Calculate how money splits for a variant sale
 */
export function calculateSaleSplit(
  variant: Variant,
  salePrice: number,
  consignorCommissionRate?: number,
  commissionFrom: 'total' | 'profit' = 'total',
  consignor?: {
    payout_method?: 'cost_price' | 'cost_plus_fixed' | 'cost_plus_percentage' | 'percentage_split';
    fixed_markup?: number;
    markup_percentage?: number;
  }
): SaleSplit {
  if (variant.owner_type === 'store') {
    // Store owns it - keeps everything (team split handled elsewhere)
    return {
      sale_price: salePrice,
      owner_type: 'store',
      store_gets: salePrice,
      consignor_gets: 0
    }
  } else {
    // Consignor owns it - calculate based on payout method
    const costPrice = variant.cost_price || 0
    const payoutMethod = consignor?.payout_method || 'percentage_split'
    
    let consignorPayout: number
    let storeGets: number
    let markupAmount: number | undefined
    
    switch (payoutMethod) {
      case 'cost_price':
        // Consignor gets only the cost price
        consignorPayout = costPrice
        storeGets = salePrice - consignorPayout
        break
        
      case 'cost_plus_fixed':
        // Consignor gets cost price + fixed markup
        markupAmount = consignor?.fixed_markup || 0
        consignorPayout = costPrice + markupAmount
        storeGets = salePrice - consignorPayout
        break
        
      case 'cost_plus_percentage':
        // Consignor gets cost price + percentage markup
        const markupPercentage = consignor?.markup_percentage || 0
        markupAmount = Math.round(costPrice * (markupPercentage / 100) * 100) / 100
        consignorPayout = costPrice + markupAmount
        storeGets = salePrice - consignorPayout
        break
        
      case 'percentage_split':
      default:
        // Traditional percentage split - use existing logic
        const commissionRate = consignorCommissionRate || 20 // Default 20%
        
        if (commissionFrom === 'total') {
          // Store commission is taken from total sale amount (default)
          storeGets = Math.round(salePrice * (commissionRate / 100) * 100) / 100
          consignorPayout = salePrice - storeGets
        } else {
          // Store commission is taken from profit (sale price - cost price)
          const profit = salePrice - costPrice
          storeGets = Math.round(profit * (commissionRate / 100) * 100) / 100
          consignorPayout = salePrice - storeGets
        }
        break
    }
    
    // Ensure payout doesn't exceed sale price
    if (consignorPayout > salePrice) {
      consignorPayout = salePrice
      storeGets = 0
    }
    
    // Ensure values are non-negative
    consignorPayout = Math.max(0, consignorPayout)
    storeGets = Math.max(0, storeGets)
    
    return {
      sale_price: salePrice,
      owner_type: 'consignor',
      store_gets: storeGets,
      consignor_gets: consignorPayout,
      commission_rate: consignorCommissionRate,
      payout_method: payoutMethod,
      markup_amount: markupAmount
    }
  }
}

/**
 * Process consignment sales when a checkout happens
 */
export async function processConsignmentSalesForCheckout(
  saleId: string,
  variants: Array<{
    variant: Variant
    salePrice: number
    customStoreAmount?: number // Add custom amounts
    customConsignorAmount?: number // Add custom amounts
    consignor?: { 
      id: number; 
      commission_rate: number;
      payout_method?: 'cost_price' | 'cost_plus_fixed' | 'cost_plus_percentage' | 'percentage_split';
      fixed_markup?: number;
      markup_percentage?: number;
    }
  }>,
  commissionFrom: 'total' | 'profit' = 'total' // New parameter
): Promise<void> {
  const supabase = createClient()
  
  try {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.access_token) {
      throw new Error('No authentication token')
    }

    // Only create consignment sales for consignor-owned variants
    const consignmentSales = variants
      .filter(item => item.variant.owner_type === 'consignor' && item.consignor)
      .map(item => {
        let storeGets: number
        let consignorGets: number
        let actualCommissionRate: number
        
        // Use custom amounts if provided, otherwise calculate from commission rate
        if (item.customStoreAmount !== undefined && item.customConsignorAmount !== undefined) {
          storeGets = item.customStoreAmount
          consignorGets = item.customConsignorAmount
          // Calculate the actual commission rate based on custom amounts
          actualCommissionRate = item.salePrice > 0 ? (storeGets / item.salePrice) * 100 : 0
        } else {
          // Use original calculation method
          const split = calculateSaleSplit(
            item.variant, 
            item.salePrice, 
            item.consignor!.commission_rate,
            commissionFrom,
            {
              payout_method: item.consignor!.payout_method,
              fixed_markup: item.consignor!.fixed_markup,
              markup_percentage: item.consignor!.markup_percentage
            }
          )
          storeGets = split.store_gets
          consignorGets = split.consignor_gets
          actualCommissionRate = item.consignor!.commission_rate
        }
        
        return {
          sale_id: saleId,
          variant_id: item.variant.id,
          consignor_id: item.consignor!.id,
          sale_price: item.salePrice,
          commission_rate: actualCommissionRate, // Use the actual commission rate (custom or original)
          store_commission: storeGets,
          consignor_payout: consignorGets,
          payout_status: 'pending',
          user_id: session.user.id,
          created_at: new Date().toISOString()
        }
      })

    if (consignmentSales.length > 0) {
      const response = await fetch('/api/consignment-sales/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ sales: consignmentSales }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create consignment sales')
      }
    }

  } catch (error) {
    console.error('Error processing consignment sales:', error)
    throw error
  }
}

/**
 * Get consignor info for variants
 */
export async function getConsignorsForVariants(variantIds: string[]) {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('variants')
      .select(`
        id,
        owner_type,
        consignor_id,
        consignor:consignors(id, name, commission_rate, payout_method, fixed_markup, markup_percentage)
      `)
      .in('id', variantIds)
      .eq('owner_type', 'consignor')

    if (error) {
      console.error('Error fetching consignors for variants:', error)
      return []
    }

    return data || []

  } catch (error) {
    console.error('Error fetching consignors for variants:', error)
    return []
  }
}
