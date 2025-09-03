// Helper functions for consignor payout methods

export type PayoutMethod = 'cost_price' | 'cost_plus_fixed' | 'cost_plus_percentage' | 'percentage_split';

export const PAYOUT_METHODS = {
  cost_price: {
    label: 'Cost Price Only',
    description: 'Consignor gets only the cost price of the item',
    requiresMarkup: false,
    icon: '💰'
  },
  cost_plus_fixed: {
    label: 'Cost Price + Fixed Markup',
    description: 'Consignor gets cost price plus a fixed dollar amount',
    requiresMarkup: 'fixed',
    icon: '📊'
  },
  cost_plus_percentage: {
    label: 'Cost Price + Percentage Markup',
    description: 'Consignor gets cost price plus a percentage markup',
    requiresMarkup: 'percentage',
    icon: '📈'
  },
  percentage_split: {
    label: 'Percentage Split (Traditional)',
    description: 'Traditional percentage split - store keeps commission rate from sale',
    requiresMarkup: false,
    icon: '🔄'
  }
} as const;

export function getPayoutMethodDescription(method: PayoutMethod): string {
  return PAYOUT_METHODS[method]?.description || 'Unknown payout method';
}

export function getPayoutMethodLabel(method: PayoutMethod): string {
  return PAYOUT_METHODS[method]?.label || 'Unknown';
}

export function requiresMarkupInput(method: PayoutMethod): 'fixed' | 'percentage' | false {
  return PAYOUT_METHODS[method]?.requiresMarkup || false;
}

export function validatePayoutMethodData(
  method: PayoutMethod,
  commissionRate?: number,
  fixedMarkup?: number,
  markupPercentage?: number
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (method === 'percentage_split' && (commissionRate === undefined || commissionRate < 0 || commissionRate > 100)) {
    errors.push('Commission rate must be between 0 and 100 for percentage split method');
  }
  
  if (method === 'cost_plus_fixed') {
    if (fixedMarkup === undefined || fixedMarkup < 0) {
      errors.push('Fixed markup must be a positive number');
    }
  }
  
  if (method === 'cost_plus_percentage') {
    if (markupPercentage === undefined || markupPercentage < 0) {
      errors.push('Markup percentage must be a positive number');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

export function calculatePayoutPreview(
  costPrice: number,
  salePrice: number,
  method: PayoutMethod,
  commissionRate: number = 20,
  fixedMarkup: number = 0,
  markupPercentage: number = 0
): { consignorGets: number; storeGets: number; method: string } {
  let consignorGets: number;
  let storeGets: number;
  
  switch (method) {
    case 'cost_price':
      consignorGets = costPrice;
      storeGets = salePrice - consignorGets;
      break;
      
    case 'cost_plus_fixed':
      consignorGets = costPrice + fixedMarkup;
      storeGets = salePrice - consignorGets;
      break;
      
    case 'cost_plus_percentage':
      const markupAmount = costPrice * (markupPercentage / 100);
      consignorGets = costPrice + markupAmount;
      storeGets = salePrice - consignorGets;
      break;
      
    case 'percentage_split':
    default:
      storeGets = salePrice * (commissionRate / 100);
      consignorGets = salePrice - storeGets;
      break;
  }
  
  // Ensure non-negative values
  consignorGets = Math.max(0, Math.min(consignorGets, salePrice));
  storeGets = Math.max(0, salePrice - consignorGets);
  
  return {
    consignorGets,
    storeGets,
    method: getPayoutMethodLabel(method)
  };
}
