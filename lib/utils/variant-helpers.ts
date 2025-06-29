import type { Variant } from '@/lib/utils/types'

// Helper functions for variants data manipulation
export const getAvailableVariants = (variants: Variant[]) => {
  return variants.filter((v) => v.status === "Available")
}

export const getVariantsBySize = (variants: Variant[]) => {
  return variants.reduce(
    (acc, variant) => {
      if (!acc[variant.size]) {
        acc[variant.size] = []
      }
      acc[variant.size].push(variant)
      return acc
    },
    {} as Record<string, Variant[]>,
  )
}

export const getTotalStock = (variants: Variant[]) => {
  return getAvailableVariants(variants).length
}

export const getStockBySize = (variants: Variant[], size: string) => {
  return variants.filter((v) => v.size === size && v.status === "Available").length
}
