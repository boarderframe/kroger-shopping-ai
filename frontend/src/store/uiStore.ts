import { create } from 'zustand'

export type ThemeName = 'indigo' | 'slate'

type CartItem = {
  id: string
  description: string
  brand?: string
  price?: number | null
  qty: number
}

type ListItem = CartItem

type UIState = {
  theme: ThemeName
  setTheme: (t: ThemeName) => void
  isCartOpen: boolean
  setCartOpen: (o: boolean) => void
  isListsOpen: boolean
  setListsOpen: (o: boolean) => void
  cart: CartItem[]
  addToCart: (item: Omit<CartItem,'qty'>, qty?: number) => void
  removeFromCart: (id: string) => void
  lists: Record<string, ListItem[]>
  addToList: (listName: string, item: Omit<ListItem,'qty'>, qty?: number) => void
}

export const useUIStore = create<UIState>((set, get) => ({
  theme: (localStorage.getItem('theme') as ThemeName) || 'indigo',
  setTheme: (t) => {
    localStorage.setItem('theme', t)
    set({ theme: t })
  },
  isCartOpen: false,
  setCartOpen: (o) => set({ isCartOpen: o }),
  isListsOpen: false,
  setListsOpen: (o) => set({ isListsOpen: o }),
  cart: [],
  addToCart: (item, qty = 1) => {
    set((state) => {
      const existing = state.cart.find(c => c.id === item.id)
      if (existing) {
        return { cart: state.cart.map(c => c.id === item.id ? { ...c, qty: c.qty + qty } : c) }
      }
      return { cart: [...state.cart, { ...item, qty }] }
    })
  },
  removeFromCart: (id) => set((state) => ({ cart: state.cart.filter(c => c.id !== id) })),
  lists: {},
  addToList: (listName, item, qty = 1) => {
    set((state) => {
      const current = state.lists[listName] || []
      const existing = current.find(c => c.id === item.id)
      const next = existing
        ? current.map(c => c.id === item.id ? { ...c, qty: c.qty + qty } : c)
        : [...current, { ...item, qty }]
      return { lists: { ...state.lists, [listName]: next } }
    })
  },
}))


