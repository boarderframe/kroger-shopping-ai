// API Response Types

export interface Store {
  locationId: string
  name: string
  address?: {
    city?: string
    state?: string
  }
}

export interface Product {
  productId: string
  description: string
  brand?: string
  items?: Array<{
    price?: {
      regular?: number
      promo?: number
    }
  }>
  categories?: string[]
  images?: Array<{
    sizes: Array<{
      size: string
      url: string
    }>
  }>
}

export interface ShoppingList {
  id: string
  name: string
  items: ShoppingListItem[]
  createdAt: string
  updatedAt: string
}

export interface ShoppingListItem {
  id: string
  productId?: string
  description: string
  brand?: string
  price?: number
  quantity: number
  checked?: boolean
}

export interface CartItem {
  id: string
  productId: string
  description: string
  brand?: string
  price?: number
  quantity: number
}

export interface Cart {
  items: CartItem[]
  total: number
}

// API Error Response
export interface ApiError {
  error: string
  message?: string
}