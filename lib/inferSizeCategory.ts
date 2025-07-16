// Helper to infer size category from product title or SKU
export function inferSizeCategory(title: string, sku: string): string {
  if (/GS/i.test(title) || /GS/i.test(sku)) return "Youth";
  if (/TD/i.test(title) || /TD/i.test(sku)) return "Toddlers";
  if (/women|womens|\(women'?s\)/i.test(title) || /women|womens/i.test(sku)) return "Women's";
  return "Men's";
}
