# Location Management & Consignor Payout Improvements

## Summary of Changes

This update addresses three critical improvements requested by users:

### 1. ✅ **Consignor Payout Methods** - Fixed Non-Percentage Markup Options
### 2. ✅ **Location Management** - Add/Edit/Delete Storage Locations
### 3. ✅ **Location Migration** - Text-based to ID-based System

---

## 1. Consignor Payout Methods (FIXED)

### Problem
Users reported that percentage-based payouts don't work well for all pricing scenarios. For example, if cost is $2,500 and sale price is $5,000, a fixed dollar markup makes more sense than a percentage.

### Solution
The system already had 4 payout methods in the backend, but they weren't visible in the UI. Now they're fully implemented:

#### **Available Payout Methods:**

1. **Percentage Split (Traditional)**
   - Store keeps commission %, consignor gets the rest
   - Example: $100 sale, 20% commission → Store gets $20, Consignor gets $80

2. **Cost Price Only**
   - Consignor gets exactly their cost price, store keeps all profit
   - Example: Cost $100, sells for $150 → Consignor gets $100, Store gets $50

3. **Cost + Fixed Markup**
   - Consignor gets cost + a fixed dollar amount
   - Example: Cost $2,500 + $1,000 markup = $3,500 to consignor
   - **This solves the high-value sneaker problem!**

4. **Cost + Percentage Markup**
   - Consignor gets cost + a percentage markup
   - Example: Cost $2,500 + 40% ($1,000) = $3,500 to consignor

### Files Changed:
- ✅ `components/add-consignor-modal.tsx` - Added payout method fields
- ✅ `components/edit-consignor-modal.tsx` - Added payout method fields

### How to Use:
1. Go to **Consignors** page
2. Click "Add Consignor" or edit existing consignor
3. Select **Payout Method** dropdown
4. Choose appropriate method and enter required values (fixed markup or markup %)

---

## 2. Location Management System

### Problem
Users couldn't edit or delete storage locations in dropdowns. Once created, locations were permanent.

### Solution
Created a complete location management system in Settings with full CRUD operations.

### Features:
- ✅ **Add** new custom locations
- ✅ **Edit** location names (updates all variants automatically)
- ✅ **Delete** locations (only if not in use)
- ✅ **View** all locations with usage tracking
- ✅ **Validation** prevents duplicate names
- ✅ **Protection** can't delete locations currently in use

### Files Created:
- ✅ `app/api/custom-locations/[id]/route.ts` - PATCH & DELETE endpoints
- ✅ `components/location-management-card.tsx` - Location management UI

### Files Modified:
- ✅ `components/settings-form.tsx` - Added LocationManagementCard
- ✅ `app/api/get-custom-locations/route.ts` - Already returns full objects (no changes needed)

### How to Use:
1. Go to **Settings** page
2. Scroll to **Storage Locations** card
3. Add new locations or edit/delete existing ones
4. Changes apply immediately across the system

---

## 3. Location Migration (Text to ID)

### Problem
The `variants.location` column stored location as **text**, which caused issues:
- Can't rename locations without breaking references
- Typos create duplicate locations
- No referential integrity
- Hard to track usage
- Not scalable

### Solution
Migrated from text-based to ID-based foreign key system while maintaining backward compatibility.

### Migration Script
Created: `scripts/migrate-locations-to-ids.sql`

This script:
1. ✅ Adds `location_id` UUID column to `variants` table
2. ✅ Creates foreign key to `custom_locations(id)`
3. ✅ Ensures default locations exist for all users
4. ✅ Migrates existing text data to IDs
5. ✅ Reports migration statistics
6. ✅ Keeps old `location` column for backward compatibility

### How to Run Migration:

**Step 1: Run the SQL Migration**
```sql
-- In Supabase SQL Editor or your database client
-- Copy and paste the entire contents of scripts/migrate-locations-to-ids.sql
-- Then execute
```

**Step 2: Verify Migration**
The script will output migration statistics:
```
total_variants | migrated_count | unmigrated_count
--------------|----------------|------------------
     150      |      147       |        3
```

**Step 3: Handle Unmigrated Locations (if any)**
If there are unmigrated variants, the script shows which locations couldn't be matched:
```sql
-- Uncomment the auto-create section in the script to create missing locations
-- Then re-run the migration function
```

### What Happens During Migration:
1. New `location_id` column is added (nullable)
2. Foreign key constraint is created
3. Default locations (Warehouse A, B, C) are ensured for all users
4. Existing text locations are matched to location IDs
5. Old `location` text column is kept for safety

### Benefits:
- ✅ Renaming locations updates all variants automatically
- ✅ Database enforces location exists before assigning
- ✅ Better queries with JOINs
- ✅ Analytics on location usage
- ✅ No risk of typos creating duplicate locations

---

## Next Steps (TODO)

### 7. Update Variant Forms to Use location_id
**Status:** Not started
**Files to modify:**
- `app/add-product/ManualAddProduct.tsx`
- `components/add-product-form.tsx`
- `components/edit-variant-modal.tsx`

**Changes needed:**
- Store `location_id` instead of `location` text when creating/editing variants
- Fetch locations and populate dropdown with ID values
- Display location name but submit location ID

### 8. Update Inventory Displays
**Status:** Not started
**Files to modify:**
- `app/inventory/page.tsx`
- API routes that fetch variants

**Changes needed:**
- JOIN `variants` with `custom_locations` to display names
- Update queries to use `location_id` instead of `location` text
- Ensure filters work with location IDs

---

## Testing Checklist

### Consignor Payout Methods
- [ ] Create consignor with "Cost + Fixed Markup" method
- [ ] Add variant with consignor owner and cost price
- [ ] Sell variant and verify payout calculation is correct
- [ ] Check consignment_sales table for accurate splits

### Location Management
- [ ] Add a new location from Settings
- [ ] Edit location name
- [ ] Try to delete location in use (should fail)
- [ ] Delete unused location (should succeed)
- [ ] Verify location appears in Add Product dropdown

### Location Migration
- [ ] Run migration script in Supabase SQL editor
- [ ] Check migration statistics (should show 100% migrated)
- [ ] Verify existing variants have location_id populated
- [ ] Try editing a location name and confirm variants update

---

## Rollback Plan

If issues occur, you can safely rollback:

### For Location Migration:
```sql
-- The old location text column is still there
-- Just remove the new column if needed:
ALTER TABLE variants DROP COLUMN IF EXISTS location_id;
DROP INDEX IF EXISTS idx_variants_location_id;

-- System will fall back to using text-based locations
```

### For UI Changes:
Simply revert the commits for:
- `components/add-consignor-modal.tsx`
- `components/edit-consignor-modal.tsx`
- `components/location-management-card.tsx`
- `components/settings-form.tsx`

---

## Support

If you encounter issues:
1. Check migration statistics output
2. Review unmigrated locations query results
3. Ensure all users have default locations created
4. Verify foreign key constraints are in place

---

## Future Enhancements

Potential improvements for later:
1. Location usage analytics (which locations have most inventory)
2. Bulk location reassignment tool
3. Location-based inventory reports
4. Location capacity tracking
5. Multi-location inventory transfers
