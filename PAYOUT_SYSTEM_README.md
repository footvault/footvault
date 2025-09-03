# Enhanced Payout System Setup

This document explains how to set up the enhanced payout system with custom payment methods and proper payout history tracking.

## Overview

The enhanced payout system includes:

1. **Custom Payment Methods**: Users can create and save their own payment methods
2. **Payout Transactions**: Proper tracking of each payout with transaction references
3. **Payout History**: Grouped payout history for the consignor portal
4. **Currency Support**: Portal displays amounts in the parent user's preferred currency

## Database Setup

### Step 1: Run the Enhanced Payout System SQL

Run the following SQL file in your Supabase SQL Editor:

```sql
sql/enhanced_payout_system.sql
```

This will create:
- `custom_payment_methods` table
- `payout_transactions` table  
- `payout_transaction_items` table
- Proper indexes and RLS policies
- Helper functions for payout grouping

### Step 2: Verify Tables

After running the SQL, verify these tables exist in your Supabase database:

1. `custom_payment_methods`
2. `payout_transactions` 
3. `payout_transaction_items`
4. `consignor_payout_history` (view)

## Features

### Custom Payment Methods

- Users can add custom payment methods beyond the standard ones
- Custom methods are saved and reusable across payouts
- Standard methods: PayPal, Bank Transfer, Venmo, Zelle, Cash, Check, Wire Transfer

### Enhanced Payout Processing

- Creates proper transaction records for each payout
- Links individual sales to payout transactions
- Supports partial payouts and payout history tracking
- Automatically saves new custom payment methods

### Consignor Portal Enhancements

- Currency formatting based on parent user's preferences
- Grouped payout history by date
- Detailed transaction information
- Clean, elegant design with minimal colors

### API Endpoints

#### Payment Methods API (`/api/payment-methods`)
- `GET`: Fetch user's custom payment methods
- `POST`: Create new custom payment method

#### Enhanced Process Payout (`/api/consignors/[id]/process-payout`)
- Creates payout transaction records
- Links sales to payouts
- Automatically saves custom payment methods

#### Enhanced Public Portal (`/api/consignors/public`)
- Returns user's currency preferences
- Includes grouped payout history
- Proper currency formatting

## Usage

### For Store Owners

1. **Processing Payouts**: Use custom payment methods in the payout modal
2. **Adding Custom Methods**: Click "Custom" in payment method dropdown
3. **Viewing History**: See detailed payout history in consignor details

### For Consignors

1. **Portal Access**: View sales and payout history in their portal
2. **Currency Display**: Amounts shown in store owner's preferred currency
3. **Payout History**: Grouped by date with transaction details

## Troubleshooting

### Common Issues

1. **Custom payouts not working**: Ensure the enhanced_payout_system.sql has been run
2. **Currency not displaying**: Check that user has currency set in settings
3. **Payout history empty**: Verify payout_transactions table has data

### Database Check

```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('custom_payment_methods', 'payout_transactions', 'payout_transaction_items');

-- Check if function exists
SELECT routine_name FROM information_schema.routines 
WHERE routine_name = 'get_consignor_payout_groups';
```

## Migration Notes

If you have existing payout data in `consignment_sales`, it will continue to work. The new system enhances the existing functionality without breaking changes.

The enhanced system will:
- Continue to update `consignment_sales` for backward compatibility
- Create new transaction records for better tracking
- Support both old and new payout history formats
