import { TutorialData } from "@/components/tutorial-modal"

export const tutorialContent: Record<string, TutorialData> = {
  // Welcome tutorial for first-time users
  welcome: {
    page: "FootVault",
    title: "Welcome to FootVault",
    description: "Your complete inventory management solution for sneakers and collectibles",
    steps: [
      {
        id: "welcome",
        title: "Welcome to FootVault!",
        description: "FootVault is your all-in-one platform for managing sneaker inventory, sales, and customer relationships. Let's take a quick tour of the key features.",
        image: "/images/tutorials/welcome-dashboard.png", // Add your image here
        tips: [
          "Navigate using the sidebar on the left",
          "Access tutorials anytime by clicking the help icon",
          "Your data is automatically saved in real-time"
        ]
      },
      {
        id: "inventory-overview",
        title: "Inventory Management",
        description: "Track all your sneakers and collectibles in one place. Manage sizes, conditions, locations, and more with powerful filtering and search capabilities.",
        image: "/images/tutorials/welcome/inventory-overview.png", // Add this image
        tips: [
          "Use QR codes for quick product lookup",
          "Filter by size, condition, location, and status",
          "Bulk actions for efficient management"
        ]
      },
      {
        id: "sales-overview",
        title: "Sales & Checkout",
        description: "Process sales quickly with our streamlined checkout system. Generate receipts, track payments, and manage customer information.",
        image: "/images/tutorials/welcome/sales-overview.png", // Add this image
        tips: [
          "Scan QR codes for instant product addition",
          "Apply discounts and additional charges",
          "Generate professional receipts instantly"
        ]
      },
      {
        id: "customers-overview",
        title: "Customer Management",
        description: "Build and maintain relationships with your customers. Track purchase history, manage pre-orders, and grow your business.",
        image: "/images/tutorials/welcome/customers-overview.png", // Add this image
        tips: [
          "Track customer purchase history",
          "Manage pre-orders and down payments",
          "Export customer data for marketing"
        ]
      },
      {
        id: "get-started",
        title: "Ready to Get Started!",
        description: "You're all set! Start by adding your first product to inventory, or explore any section using the sidebar navigation.",
        image: "/images/tutorials/welcome/get-started.png", // Add this image
        tips: [
          "Start with adding products to inventory",
          "Set up your business settings",
          "Explore each section at your own pace"
        ]
      }
    ]
  },

  // Inventory page tutorial
  inventory: {
    page: "Inventory",
    title: "Inventory Management",
    description: "Master your inventory management with these powerful features",
    steps: [
      {
        id: "view-products",
        title: "📦 View All Products",
        description: "See all your products in one comprehensive view with detailed information about each item including stock levels and pricing.",
        image: "/images/tutorials/inventory/product-list.png", // Add this image
        tips: [
          "Each row shows product details with current stock",
          "Color-coded status indicators for quick identification",
          "Hover over items for additional quick actions"
        ]
      },
      {
        id: "size-tracking",
        title: "👟 Size Availability Tracking",
        description: "Track available sizes for each product with detailed size charts and availability status for every variant.",
        image: "/images/tutorials/inventory/size-tracking.png", // Add this image
        tips: [
          "Size charts adapted for different shoe types",
          "Real-time availability updates",
          "Easy size selection during checkout"
        ]
      },
      {
        id: "cost-price-tracking",
        title: "💰 Cost and Price Tracking",
        description: "Monitor your cost basis and sale prices to maintain healthy profit margins with automatic profit calculations.",
        image: "/images/tutorials/inventory/pricing.png", // Add this image
        tips: [
          "Set different prices for different conditions",
          "Track profit margins automatically",
          "Bulk price updates available"
        ]
      },
      {
        id: "stock-status",
        title: "📊 Stock Status Management",
        description: "Monitor stock levels and get notified when items are running low or out of stock with automated alerts.",
        image: "/images/tutorials/inventory/stock-status.png", // Add this image
        tips: [
          "Visual indicators for stock levels",
          "Automatic out-of-stock detection",
          "Low stock alerts and notifications"
        ]
      },
      {
        id: "search-filter",
        title: "🔍 Advanced Search & Filtering",
        description: "Use powerful search and filtering tools to quickly find exactly what you're looking for in your inventory.",
        image: "/images/tutorials/inventory/search-filters.png", // Add this image
        tips: [
          "Search by name, brand, SKU, or any field",
          "Multiple filter combinations",
          "Save frequently used filter presets"
        ]
      }
    ]
  },

  // Variants page tutorial
  variants: {
    page: "Variants",
    title: "Product Variants Management",
    description: "Efficiently manage all your product variants with advanced tools",
    steps: [
      {
        id: "variants-overview",
        title: "👀 View All Variants",
        description: "See all product variants with their specific stock numbers, sizes, and conditions in a detailed overview.",
        image: "/images/tutorials/variants/variants-overview.png", // Add this image
        tips: [
          "Each variant represents a specific size/condition",
          "Stock numbers updated in real-time",
          "Quick edit capabilities for each variant"
        ]
      },
      {
        id: "qr-search",
        title: "📱 QR Code Search",
        description: "Use your device camera to search through variants instantly by scanning QR codes for lightning-fast product lookup.",
        image: "/images/tutorials/variants/qr-search.png", // Add this image
        tips: [
          "Scan product QR codes for instant search",
          "Works with both product and variant codes",
          "Perfect for warehouse operations"
        ]
      },
      {
        id: "label-generation",
        title: "🏷️ Label Generation",
        description: "Generate professional labels for individual products or create bulk labels for efficient inventory management.",
        image: "/images/tutorials/variants/label-generation.png", // Add this image
        tips: [
          "Custom label templates available",
          "Include QR codes, prices, and product details",
          "Print-ready PDF format"
        ]
      },
      {
        id: "bulk-labels",
        title: "📄 Bulk Label Generation",
        description: "Create labels for multiple products at once to streamline your labeling process and save valuable time.",
        image: "/images/tutorials/variants/bulk-labels.png", // Add this image
        tips: [
          "Select multiple variants for bulk labeling",
          "Consistent formatting across all labels",
          "Batch printing capabilities"
        ]
      },
      {
        id: "advanced-filtering",
        title: "🎯 Advanced Filtering",
        description: "Filter variants by size, location, condition, and more criteria to find exactly what you need quickly.",
        image: "/images/tutorials/variants/advanced-filtering.png", // Add this image
        tips: [
          "Multi-criteria filtering options",
          "Location-based organization",
          "Size range selections"
        ]
      }
    ]
  },

  // Add Product page tutorial
  "add-product": {
    page: "Add Product",
    title: "Adding Products",
    description: "Learn the fastest ways to add products to your inventory",
    steps: [
      {
        id: "product-search",
        title: "🔍 Search Products Database",
        description: "Search our extensive database to add products instantly with pre-filled information, saving you time on data entry.",
        image: "/images/tutorials/add-product/product-search.png", // Add this image
        tips: [
          "Search by product name, brand, or model",
          "Most popular sneakers included in database",
          "Automatic price suggestions available"
        ]
      },
      {
        id: "instant-info",
        title: "⚡ Add Info Instantly",
        description: "When products are found in our database, all information is filled automatically including images, specifications, and market data.",
        image: "/images/tutorials/add-product/instant-info.png", // Add this image
        tips: [
          "Product images loaded automatically",
          "Specifications pre-filled from database",
          "Market pricing data included"
        ]
      },
      {
        id: "manual-entry",
        title: "✍️ Manual Product Entry",
        description: "For unique or unlisted products, add them manually with complete control over all product details and specifications.",
        image: "/images/tutorials/add-product/manual-entry.png", // Add this image
        tips: [
          "Upload custom product images",
          "Set your own specifications",
          "Create custom SKUs and categories"
        ]
      },
      {
        id: "size-categories",
        title: "📏 Robust Size Categories",
        description: "Comprehensive size category system with detailed labels and size numbers for accurate inventory tracking.",
        image: "/images/tutorials/add-product/size-categories.png", // Add this image
        tips: [
          "Multiple size systems supported",
          "Custom size labels available",
          "Conversion between size systems"
        ]
      },
      {
        id: "locations-preorders",
        title: "📍 Locations & Pre-orders",
        description: "Add location tracking and set up pre-orders with consignor information for complete inventory management.",
        image: "/images/tutorials/add-product/locations-preorders.png", // Add this image
        tips: [
          "Multiple storage location support",
          "Pre-order management system",
          "Consignor tracking and payouts"
        ]
      }
    ]
  },

  // Checkout page tutorial
  checkout: {
    page: "Checkout",
    title: "Checkout & Sales",
    description: "Process sales efficiently with our comprehensive checkout system",
    steps: [
      {
        id: "add-to-cart",
        title: "🛒 Add Products to Cart",
        description: "Quickly add shoes to your cart by scanning, searching, or browsing your inventory with real-time availability.",
        image: "/images/tutorials/checkout/add-to-cart.png", // Add this image
        tips: [
          "Scan QR codes for instant addition",
          "Search by name, brand, or SKU",
          "Real-time stock validation"
        ]
      },
      {
        id: "filter-types",
        title: "🏷️ Filter by Type & Size",
        description: "Filter products by in-stock or pre-order status and available sizes to show only relevant items to customers.",
        image: "/images/tutorials/checkout/filter-types.png", // Add this image
        tips: [
          "Toggle between in-stock and pre-order items",
          "Size availability shown in real-time",
          "Quick size selection tools"
        ]
      },
      {
        id: "customer-management",
        title: "👥 Customer Selection",
        description: "Select existing customers or add new ones during checkout with complete customer information management.",
        image: "/images/tutorials/checkout/customer-management.png", // Add this image
        tips: [
          "Search existing customer database",
          "Add new customers on-the-fly",
          "Customer history integration"
        ]
      },
      {
        id: "payment-types",
        title: "💳 Payment Types & Fees",
        description: "Create and manage different payment types with associated fees for accurate transaction tracking.",
        image: "/images/tutorials/checkout/payment-types.png", // Add this image
        tips: [
          "Multiple payment methods supported",
          "Automatic fee calculations",
          "Custom payment type creation"
        ]
      },
      {
        id: "discounts-charges",
        title: "💸 Discounts & Additional Charges",
        description: "Apply discounts and add additional charges like shipping, taxes, or handling fees to customize each transaction.",
        image: "/images/tutorials/checkout/discounts-charges.png", // Add this image
        tips: [
          "Percentage or fixed amount discounts",
          "Multiple discount types available",
          "Itemized additional charges"
        ]
      },
      {
        id: "payment-received",
        title: "💰 Payment Processing",
        description: "Record payments received with multiple payment methods and track partial payments for complete financial accuracy.",
        image: "/images/tutorials/checkout/payment-received.png", // Add this image
        tips: [
          "Multiple payment method support",
          "Partial payment tracking",
          "Change calculation included"
        ]
      },
      {
        id: "profit-distribution",
        title: "🎯 Profit Distribution",
        description: "Distribute profits through avatars and templates for partnership management and commission tracking.",
        image: "/images/tutorials/checkout/profit-distribution.png", // Add this image
        tips: [
          "Create custom distribution templates",
          "Avatar-based profit sharing",
          "Automatic percentage calculations"
        ]
      },
      {
        id: "print-receipts",
        title: "🖨️ Print Receipts",
        description: "Generate and print professional receipts with your business branding and complete transaction details.",
        image: "/images/tutorials/checkout/print-receipts.png", // Add this image
        tips: [
          "Custom receipt templates",
          "Business logo integration",
          "Digital and print options"
        ]
      }
    ]
  },

  // Sales page tutorial
  sales: {
    page: "Sales",
    title: "Sales Management",
    description: "Comprehensive sales tracking and management tools",
    steps: [
      {
        id: "view-sales",
        title: "📊 View All Sales",
        description: "Monitor all your sales transactions with detailed information including dates, amounts, and customer details.",
        image: "/images/tutorials/sales/view-sales.png", // Add this image
        tips: [
          "Chronological sales listing",
          "Detailed transaction information",
          "Quick access to customer details"
        ]
      },
      {
        id: "avatar-management",
        title: "👤 Add & Manage Avatars",
        description: "Create and manage avatars for profit distribution and partnership tracking across your sales operations.",
        image: "/images/tutorials/sales/avatar-management.png", // Add this image
        tips: [
          "Create custom avatars for partners",
          "Set default profit percentages",
          "Track individual performance"
        ]
      },
      {
        id: "template-creation",
        title: "📋 Create Distribution Templates",
        description: "Build reusable templates for profit distribution to streamline recurring partnership arrangements.",
        image: "/images/tutorials/sales/template-creation.png", // Add this image
        tips: [
          "Save time with reusable templates",
          "Multiple distribution scenarios",
          "Easy template modification"
        ]
      },
      {
        id: "refund-sales",
        title: "↩️ Process Refunds",
        description: "Handle refunds efficiently with proper inventory adjustments and financial tracking for accurate records.",
        image: "/images/tutorials/sales/refund-sales.png", // Add this image
        tips: [
          "Automatic inventory restoration",
          "Partial refund capabilities",
          "Complete audit trail"
        ]
      },
      {
        id: "sales-filtering",
        title: "🔍 Filter & Analyze Sales",
        description: "Use advanced filtering options to analyze sales performance and generate insights for business growth.",
        image: "/images/tutorials/sales/sales-filtering.png", // Add this image
        tips: [
          "Date range filtering",
          "Customer-based analysis",
          "Product performance tracking"
        ]
      }
    ]
  },

  // Customers page tutorial
  customers: {
    page: "Customers",
    title: "Customer Management",
    description: "Build and maintain strong customer relationships",
    steps: [
      {
        id: "add-customers",
        title: "👥 Add New Customers",
        description: "Easily add new customers with complete contact information and preferences for personalized service.",
        image: "/images/tutorials/customers/add-customers.png", // Add this image
        tips: [
          "Complete contact information",
          "Customer preferences tracking",
          "Quick customer creation during checkout"
        ]
      },
      {
        id: "purchase-history",
        title: "📜 View Purchase History",
        description: "Access complete purchase history for each customer including items bought, dates, and amounts spent.",
        image: "/images/tutorials/customers/purchase-history.png", // Add this image
        tips: [
          "Chronological purchase tracking",
          "Total spending calculations",
          "Favorite product identification"
        ]
      },
      {
        id: "customer-insights",
        title: "📈 Customer Insights",
        description: "Gain valuable insights into customer behavior, preferences, and purchasing patterns for better service.",
        image: "/images/tutorials/customers/customer-insights.png", // Add this image
        tips: [
          "Purchase frequency analysis",
          "Preferred brands and sizes",
          "Customer lifetime value"
        ]
      }
    ]
  },

  // Pre-orders page tutorial
  preorders: {
    page: "Pre-orders",
    title: "Pre-order Management",
    description: "Efficiently manage pre-orders and customer commitments",
    steps: [
      {
        id: "view-preorders",
        title: "👀 View Pre-order Variants",
        description: "See all your pre-order variants with status tracking, delivery dates, and customer information in one organized view.",
        image: "/images/tutorials/preorders/view-preorders.png", // Add this image
        tips: [
          "Status tracking for each pre-order",
          "Expected delivery date management",
          "Customer commitment tracking"
        ]
      },
      {
        id: "add-preorders",
        title: "➕ Add Pre-orders",
        description: "Create new pre-orders directly from the add product page with customer details and expected delivery information.",
        image: "/images/tutorials/preorders/add-preorders.png", // Add this image
        tips: [
          "Link to customer accounts",
          "Set expected delivery dates",
          "Down payment tracking"
        ]
      },
      {
        id: "update-preorders",
        title: "🔄 Update Pre-order Status",
        description: "Manage pre-order lifecycle with status updates, payment tracking, and delivery coordination.",
        image: "/images/tutorials/preorders/update-preorders.png", // Add this image
        tips: [
          "Track down payments received",
          "Update delivery status",
          "Customer communication tools"
        ]
      },
      {
        id: "payment-management",
        title: "💰 Down Payment Tracking",
        description: "Track down payments and remaining balances for accurate financial management of pre-order commitments.",
        image: "/images/tutorials/preorders/payment-management.png", // Add this image
        tips: [
          "Automatic balance calculations",
          "Payment reminder system",
          "Multiple payment installments"
        ]
      },
      {
        id: "status-management",
        title: "📋 Status Management",
        description: "Update pre-order status including cancelled and voided orders with proper inventory and financial adjustments.",
        image: "/images/tutorials/preorders/status-management.png", // Add this image
        tips: [
          "Cancel orders with inventory restoration",
          "Void orders for problematic transactions",
          "Maintain complete status history"
        ]
      }
    ]
  },

  // Consignors page tutorial
  consignors: {
    page: "Consignors",
    title: "Consignor Management",
    description: "Manage consignors and their inventory partnerships",
    steps: [
      {
        id: "create-consignors",
        title: "👤 Create Consignors",
        description: "Add new consignors with complete contact information and partnership terms for inventory consignment relationships.",
        image: "/images/tutorials/consignors/create-consignors.png", // Add this image
        tips: [
          "Complete consignor profiles",
          "Partnership terms and agreements",
          "Contact information management"
        ]
      },
      {
        id: "manage-consignors",
        title: "🛠️ Manage Consignor Relationships",
        description: "Maintain ongoing relationships with consignors including inventory tracking and performance monitoring.",
        image: "/images/tutorials/consignors/manage-consignors.png", // Add this image
        tips: [
          "Track consigned inventory levels",
          "Monitor sales performance",
          "Maintain communication history"
        ]
      },
      {
        id: "portal-sharing",
        title: "🌐 Share Consignor Portal",
        description: "Provide consignors with access to their dedicated portal page for real-time inventory and sales tracking.",
        image: "/images/tutorials/consignors/portal-sharing.png", // Add this image
        tips: [
          "Secure portal access",
          "Real-time inventory updates",
          "Sales performance tracking"
        ]
      },
      {
        id: "process-payouts",
        title: "💸 Process Payouts",
        description: "Calculate and process payouts to consignors based on sales performance and agreed-upon terms.",
        image: "/images/tutorials/consignors/process-payouts.png", // Add this image
        tips: [
          "Automatic payout calculations",
          "Multiple payout schedules",
          "Detailed payout reports"
        ]
      }
    ]
  }
}

export const getWelcomeTutorial = (): TutorialData => tutorialContent.welcome
export const getTutorialForPage = (page: string): TutorialData | null => {
  return tutorialContent[page] || null
}