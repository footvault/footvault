// Existing types (assuming they are already here)
export type Product = {
  consignor: any
  id: number
  name: string
  brand: string
  category: string
  sku: string
  original_price: number // Added original_price
  sale_price: number
  status: string
  image: string | null
  size_category: string
  created_at: string
  updated_at: string
  user_id: string
  isArchived?: boolean
  archived?: boolean
  is_consignment?: boolean
  consignor_id?: string
}

export type Variant = {
  costPrice: any
  productName: any
  productBrand: any
  serialNumber: any
  date_added: string
  variant_sku: string
  serial_number: string
  id: string
  product_id: number
  size: string
  color: string
  quantity: number
  location: string
  status: string
  qr_code_url: string | null
  cost_price: number
  created_at: string
  updated_at: string
  // Simple owner fields
  owner_type: 'store' | 'consignor' // Who owns this variant
  consignor_id?: number // If owner_type is 'consignor', this is the consignor
  user_id: string
  isArchived: boolean
  size_label: string
  // Relationship for consignor data
  consignor?: {
    id: number
    name: string
  }
}

export type CustomLocation = {
  id: string
  name: string
  created_at: string
  updated_at: string
}

export type Avatar = {
  image: string
  id: string
  name: string
  default_percentage: number
  created_at: string
  updated_at: string
}

export type ProfitDistributionTemplate = {
  id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

export type Sale = {
  [x: string]: any
  profitDistribution: any
  id: string
  sales_no?: number | null // Added sales_no field
  sale_date: string
  total_amount: number
  total_discount: number
  net_profit: number
  customer_name?: string | null // Added customer name
  customer_phone?: string | null // Added customer phone
  status?: string // Added status field
  payment_type?: any // Added payment type
  notes?: string | null // Added notes field (variant notes are displayed in detail modal)
  items?: SaleItem[] // Added items for compatibility
  created_at: string
  updated_at: string
  sale_items?: SaleItem[]
  sale_profit_distributions?: SaleProfitDistribution[]
}

export type SaleItem = {
  id: string
  sale_id: string
  variant_id: string
  sold_price: number
  cost_price: number
  quantity: number
  created_at: string
  updated_at: string
  variant?: Variant // Optional: to include variant details if joined
}

export type SaleProfitDistribution = {
  id: string
  sale_id: string
  avatar_id: string
  amount: number
  percentage: number
  created_at: string
  updated_at: string
  avatar?: Avatar // Optional: to include avatar details if joined
}

export type SalesStats = {
  totalSalesAmount: number
  totalNetProfit: number
  numberOfSales: number
}

export type ProfitDistributionEntry = {
  avatarId: string
  avatarName: string
  percentage: number
  amount: number
}

export type ProfitDistributionTemplateDetail = {
  id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
  distributions: { avatar_id: string; percentage: number }[]
}

export type ProfitDistributionTemplateFormValues = {
  name: string
  description: string
  distributions: { avatarId: string; percentage: number }[]
}

export type AvatarFormValues = {
  name: string
  default_percentage: number
}

// New ProductVariant type, moved from components and updated
export type ProductVariant = {
  id: string
  productId: number
  size: string
  sizeLabel: string
  variantSku: string
  location: string
  status: string
  dateAdded: string
  condition: string
  serialNumber: string
  costPrice: number
  productName: string
  productBrand: string
  productSku: string
  productImage: string
  productSalePrice: number
  productOriginalPrice: number // Added for new profit calculation
}
