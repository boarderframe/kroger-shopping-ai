import type { Cart, CartItem } from '../types/api'

const apiBase = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:9000'

export const cartApi = {
  async getCart(): Promise<Cart> {
    const response = await fetch(`${apiBase}/api/cart`)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return response.json()
  },

  async addToCart(item: Omit<CartItem, 'id'>): Promise<Cart> {
    const response = await fetch(`${apiBase}/api/cart/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item)
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return response.json()
  },

  async removeFromCart(itemId: string): Promise<Cart> {
    const response = await fetch(`${apiBase}/api/cart/remove/${itemId}`, {
      method: 'DELETE'
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return response.json()
  },

  async updateCartItem(itemId: string, quantity: number): Promise<Cart> {
    const response = await fetch(`${apiBase}/api/cart/update/${itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity })
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return response.json()
  },

  async clearCart(): Promise<Cart> {
    // Clear cart by removing all items one by one or resetting
    // Since the backend might not have a clear endpoint, we'll get the cart
    // and remove all items
    try {
      const response = await fetch(`${apiBase}/api/cart/clear`, {
        method: 'POST'
      })
      if (!response.ok) {
        // If clear endpoint doesn't exist, fallback to getting cart and removing all items
        const cart = await cartApi.getCart()
        for (const item of cart.items) {
          await cartApi.removeFromCart(item.id)
        }
        return { items: [], total: 0 }
      }
      return response.json()
    } catch (error) {
      // Fallback: get cart and remove all items
      const cart = await cartApi.getCart()
      for (const item of cart.items) {
        await cartApi.removeFromCart(item.id)
      }
      return { items: [], total: 0 }
    }
  }
}