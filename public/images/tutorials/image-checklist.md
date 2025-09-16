# Tutorial Images Checklist

## 📋 **Images Needed for Each Tutorial**

### **Welcome Tutorial**
- [ ] `welcome-dashboard.png` - Main dashboard overview
- [ ] `welcome/inventory-overview.png` - Inventory management features
- [ ] `welcome/sales-overview.png` - Sales and checkout system
- [ ] `welcome/customers-overview.png` - Customer management features
- [ ] `welcome/get-started.png` - Getting started guide

### **Inventory Management**
- [ ] `inventory/product-list.png` - Main inventory table view
- [ ] `inventory/size-tracking.png` - Size availability display  
- [ ] `inventory/pricing.png` - Cost and price tracking
- [ ] `inventory/stock-status.png` - Stock level indicators
- [ ] `inventory/search-filters.png` - Search and filter interface

### **Variants Management**
- [ ] `variants/variants-overview.png` - Variants table view
- [ ] `variants/qr-search.png` - QR code scanning interface
- [ ] `variants/label-generation.png` - Label generation tool
- [ ] `variants/bulk-labels.png` - Bulk label creation
- [ ] `variants/advanced-filtering.png` - Advanced filtering options

### **Add Product**
- [ ] `add-product/product-search.png` - Product database search
- [ ] `add-product/instant-info.png` - Auto-filled product information
- [ ] `add-product/manual-entry.png` - Manual product entry form
- [ ] `add-product/size-categories.png` - Size category selection
- [ ] `add-product/locations-preorders.png` - Location and pre-order setup

### **Checkout & Sales**
- [ ] `checkout/add-to-cart.png` - Adding products to cart
- [ ] `checkout/filter-types.png` - Product type filtering
- [ ] `checkout/customer-management.png` - Customer selection and management
- [ ] `checkout/payment-types.png` - Payment type setup
- [ ] `checkout/discounts-charges.png` - Discount and additional charges
- [ ] `checkout/payment-received.png` - Payment recording interface
- [ ] `checkout/profit-distribution.png` - Profit sharing setup
- [ ] `checkout/print-receipts.png` - Receipt generation and printing

### **Sales Management**
- [ ] `sales/view-sales.png` - Sales transaction overview
- [ ] `sales/avatar-management.png` - Avatar creation and management
- [ ] `sales/template-creation.png` - Distribution template builder
- [ ] `sales/refund-sales.png` - Refund processing interface
- [ ] `sales/sales-filtering.png` - Sales filtering and analysis

### **Customer Management**
- [ ] `customers/add-customers.png` - Customer creation form
- [ ] `customers/purchase-history.png` - Customer purchase history view
- [ ] `customers/customer-insights.png` - Customer analytics dashboard

### **Pre-orders**
- [ ] `preorders/view-preorders.png` - Pre-order variants overview
- [ ] `preorders/add-preorders.png` - Creating new pre-orders
- [ ] `preorders/update-preorders.png` - Status updates and management
- [ ] `preorders/payment-management.png` - Down payment tracking
- [ ] `preorders/status-management.png` - Order status lifecycle

### **Consignors**
- [ ] `consignors/create-consignors.png` - Consignor creation form
- [ ] `consignors/manage-consignors.png` - Relationship management
- [ ] `consignors/portal-sharing.png` - Consignor portal access
- [ ] `consignors/process-payouts.png` - Payout processing interface

## 🎯 **Screenshot Guidelines**

### **What to Capture**
1. **Clean Interface**: Remove test data, use realistic examples
2. **Highlight Features**: Use arrows, boxes, or highlights on key elements
3. **Consistent Browser**: Use same browser/theme for all screenshots
4. **Full Context**: Show enough interface to provide context
5. **High Quality**: Use high DPI displays for crisp images

### **Image Specifications**
- **Dimensions**: 600-800px wide, 400-600px tall
- **Format**: PNG for UI screenshots
- **Compression**: Optimize for web without quality loss
- **Responsive**: Consider how they'll look on mobile

### **Naming Convention**
- Use kebab-case: `product-search-filters.png`
- Include page prefix: `inventory-stock-status.png`  
- Be descriptive: `checkout-customer-selection.png`

## 📁 **Folder Structure**
```
public/images/tutorials/
├── welcome-dashboard.png
├── welcome/
├── inventory/
├── variants/
├── add-product/
├── checkout/
├── sales/
├── customers/
├── preorders/
└── consignors/
```

## ⚡ **Quick Start**
1. Take screenshots of your FootVault interface
2. Save them in the appropriate folders
3. Update the image paths in `lib/tutorial-content.ts`
4. Test the tutorials to ensure images display correctly