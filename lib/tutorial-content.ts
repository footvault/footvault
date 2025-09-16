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
    title: "Inventory Management Tutorial",
    description: "Learn how to manage your sneaker and collectible inventory effectively",
    steps: [
      {
        id: "inventory-overview",
        title: "Your Inventory Hub",
        description: "This is where all your products are displayed. You can view, search, filter, and manage your entire inventory from this central location.",
        tips: [
          "Each row represents a product variant (specific size/condition)",
          "Use the search bar to quickly find items",
          "Status colors help identify availability at a glance"
        ]
      },
      {
        id: "search-filter",
        title: "Search & Filter Products",
        description: "Use powerful search and filtering options to quickly find what you're looking for. Search by name, brand, SKU, or use advanced filters.",
        tips: [
          "Search works across product names, brands, and SKUs",
          "Use filters for size, condition, location, and status",
          "Combine multiple filters for precise results"
        ]
      },
      {
        id: "qr-scanner",
        title: "QR Code Scanner",
        description: "Quickly find products using the built-in QR code scanner. Perfect for fast lookups during inventory checks or sales.",
        tips: [
          "Click the QR icon in the search bar",
          "Allow camera permissions for scanning",
          "Generate QR codes for your products in the print view"
        ]
      },
      {
        id: "bulk-actions",
        title: "Bulk Operations",
        description: "Select multiple items to perform bulk actions like changing locations, updating status, or archiving products.",
        tips: [
          "Use checkboxes to select multiple items",
          "Bulk actions appear when items are selected",
          "Great for organizing large inventories"
        ]
      }
    ]
  },

  // Add more page tutorials here...
  "add-product": {
    page: "Add Product",
    title: "Adding Products Tutorial",
    description: "Learn how to add new products to your inventory",
    steps: [
      {
        id: "product-search",
        title: "Search Existing Products",
        description: "First, search our database of existing products. If found, you can quickly add variants without entering all details manually.",
        tips: [
          "Search by product name or brand",
          "Most popular sneakers are in our database",
          "This saves time on data entry"
        ]
      },
      {
        id: "manual-entry",
        title: "Manual Product Entry",
        description: "If a product isn't in our database, you can add it manually with all the details including images, pricing, and specifications.",
        tips: [
          "Include clear product images",
          "Set accurate cost and sale prices",
          "Choose the correct size category"
        ]
      }
    ]
  }
}

export const getWelcomeTutorial = (): TutorialData => tutorialContent.welcome
export const getTutorialForPage = (page: string): TutorialData | null => {
  return tutorialContent[page] || null
}