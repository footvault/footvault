## 🎉 Update: Variant-Level Pricing System

### What's New
You can now set **independent cost and sale prices for each variant**, giving you complete control over your inventory pricing at the individual item level!

### Key Changes

**Variant-Level Pricing**
- Each variant now has its own `cost_price` and `sale_price` fields
- Set different prices for the same product in different sizes, locations, or conditions
- Bulk add variants with custom pricing for each batch

**UI Updates**
- Product pages now show pricing at the variant level
- Bulk add modals include cost and sale price inputs
- Edit variant modal saves prices directly to the variant
- Checkout system uses variant-specific pricing
- Stats now show profit with correct currency symbol (¥, $, etc.)
- Default filter set to "Available" status (excludes sold items)

**Backward Compatibility**
- Existing products continue to work
- If a variant doesn't have a price set, it falls back to the product's price
- No data loss - product-level prices remain in the database

### Benefits
✅ Price variants independently based on condition, location, or other factors
✅ More accurate inventory valuation
✅ Better profit tracking per item
✅ Flexible pricing strategies
