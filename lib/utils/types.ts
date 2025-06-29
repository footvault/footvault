export interface Variant {
  productOriginalPrice: number
  id: string
  productId: string
  size: string
  sizeLabel?: string
  variantSku: string
  location: string
  status: string
  dateAdded: string
  condition: string
  serialNumber: string
  costPrice: number
  createdAt: string
  updatedAt: string
}

export interface Product {
  id: string
  name: string
  brand: string
  sku: string
  category: string
  originalPrice: number
  salePrice: number
  status: string
  image: string
  sizeCategory: string
  createdAt: string
  updatedAt: string
  variants: Variant[]
}
