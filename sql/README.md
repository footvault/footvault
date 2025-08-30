# Database Migration: Add Receipt Fields and Payment Information

This migration adds several new fields to support receipt generation and enhanced payment tracking:

## Users Table Changes
- `receipt_address`: A single line text field for the business address on receipts
- `receipt_more_info`: A multi-line text field for additional business information (social media, contact details, etc.)

## Sales Table Changes
- `payment_received`: Amount of money received from the customer
- `change_amount`: Change amount given back to customer
- `additional_charge`: Any additional charges added to the sale

## How to Apply

1. Connect to your Supabase database
2. Run the SQL commands in `add_user_address_info.sql`

## Features Added

### 1. Enhanced Checkout Process
- Payment received input field
- Additional charge field
- Automatic change calculation
- Updated order summary with all payment details

### 2. Receipt Generation
- PDF receipt generation with business branding
- Professional receipt layout matching the example provided
- Includes all sale details, payment information, and business info
- Print functionality for physical receipts

### 3. Sale Success Modal Updates
- "Print Receipt" button for immediate receipt generation
- "Make More Sales" button to continue with checkout
- Removed automatic redirect

## Usage Examples

### Receipt Address
```
347 Mulawin street, Brgy. Bucal, Calamba City, Laguna
```

### Receipt More Info
```
Visit our facebook page and leave a review.
https://www.facebook.com/sneakfits.ph
09562564505
Waze/Google Maps: Sneakfits Shoe Store
```

## API Endpoints Added
- `GET /api/receipt/[saleId]` - Fetch receipt data for PDF generation

## Components Added
- `ReceiptGenerator` - Handles PDF receipt generation
- Updated `SaleSuccessModal` - New interface for post-sale actions
