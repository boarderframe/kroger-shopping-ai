import React, { useEffect, useMemo, useState } from 'react'
import ProductCard, { type Product as ProductType } from './components/ProductCard'
import SearchBar from './components/SearchBar'
import SearchFiltersPanel from './components/SearchFiltersPanel'
import ProductDetailModal from './components/ProductDetailModal'
import Lists from './components/Lists'
import Toast from './components/Toast'
import { useUIStore } from './store/uiStore'
import { cartApi } from './services/cartApi'
import type { Store, Product, Cart, CartItem } from './types/api'
import { AppBar, Toolbar, Typography, Box, Button, Tabs, Tab, Container, Select, MenuItem, TextField, FormControl, InputLabel, FormControlLabel, Checkbox, Chip, Stack, Paper, Divider, IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress, Grid, Alert, AlertColor, Skeleton, Slider, ToggleButtonGroup, ToggleButton, Badge, Pagination, LinearProgress, Backdrop } from '@mui/material'
import ChatOutlinedIcon from '@mui/icons-material/ChatOutlined'
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined'
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined'
import ListAltOutlinedIcon from '@mui/icons-material/ListAltOutlined'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import SendIcon from '@mui/icons-material/Send'
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import ClearAllIcon from '@mui/icons-material/ClearAll'

// Types are imported from ./types/api.ts

// Use relative base so Vite dev proxy handles backend routing reliably
const apiBase = ''

function normalizeStore(raw: any): Store {
  const locationId = raw?.locationId || raw?.id || raw?.location?.id || ''
  const name = raw?.name || raw?.chain?.name || 'Store'
  const city = raw?.address?.city || raw?.address?.locality || raw?.address?.cityLine || raw?.address?.City || undefined
  const state = raw?.address?.state || raw?.address?.region || raw?.address?.State || undefined
  return { locationId: String(locationId), name: String(name), address: { city, state } }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'ai' | 'sales' | 'search' | 'lists' | 'cart' | 'settings'>('search')
  const [zip, setZip] = useState('43123')
  const [radius, setRadius] = useState(50)
  const [stores, setStores] = useState<Store[]>([])
  const [loadingStores, setLoadingStores] = useState(false)

  const [selectedStore, setSelectedStore] = useState<Store | null>(null)
  const [salesCache, setSalesCache] = useState<Record<string, Product[]>>({})
  const [loadingSales, setLoadingSales] = useState(false)
  const [salesError, setSalesError] = useState<string | null>(null)

  const [term, setTerm] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [sort, setSort] = useState<'discountDesc'|'relevance'|'priceAsc'|'priceDesc'|'brandAsc'|'nameAsc'|'nameDesc'>('discountDesc')
  const [brandFilter, setBrandFilter] = useState('')
  const [onSaleOnly, setOnSaleOnly] = useState(false)
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100])
  // Visible window is driven by pageStart/pageSize; we no longer expand a running visibleCount
  const [pageStart, setPageStart] = useState<number>(0)
  const [hasMore, setHasMore] = useState<boolean>(true)
  const [pageIndex, setPageIndex] = useState<number>(1) // 1-based for UI
  const pageSize = 50
  const [totalGuess, setTotalGuess] = useState<number>(0)
  const [prefetching, setPrefetching] = useState<boolean>(false)
  const [prefetchedStarts, setPrefetchedStarts] = useState<Set<number>>(new Set())
  const [activeProduct, setActiveProduct] = useState<Product | null>(null)
  const [selectedBrandChip, setSelectedBrandChip] = useState<string | null>(null)
  const [selectedCategoryChip, setSelectedCategoryChip] = useState<string | null>(null)
  const { theme, setTheme } = useUIStore()
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [lastSearchMeta, setLastSearchMeta] = useState<{term: string; count: number; when: string} | null>(null)
  const [backendCart, setBackendCart] = useState<Cart>({ items: [], total: 0 })
  const [cartLoading, setCartLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)
  
  // Toast state
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: AlertColor }>({
    open: false,
    message: '',
    severity: 'success'
  })
  
  const showToast = (message: string, severity: AlertColor = 'success') => {
    setToast({ open: true, message, severity })
  }

  // Placeholder AI Shopper chat state
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; role: 'assistant'|'user'; text: string }>>([
    { id: 'm1', role: 'assistant', text: 'Hi! I\'m your AI shopping assistant. Tell me what you\'re looking for.' }
  ])

  // Load persisted store and cart on mount; if none, try to auto-select Cemetery Rd (Hilliard)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('selectedStore')
      if (raw) {
        const persisted = JSON.parse(raw)
        // If we ever stored an invalid fallback, clear it
        if (persisted?.locationId === '01600425') {
          localStorage.removeItem('selectedStore')
          void autoSelectDefaultStore()
        } else {
          setSelectedStore(persisted)
          void validateSelectedStore(persisted as Store)
        }
      } else {
        void autoSelectDefaultStore()
      }
    } catch {}
    ;(window as any).__selectedStoreId = null
    loadCart()
  }, [])

  // Keep global selected store id in sync for details requests
  useEffect(() => {
    ;(window as any).__selectedStoreId = selectedStore?.locationId || ''
  }, [selectedStore])

  async function autoSelectDefaultStore() {
    try {
      const r = await fetch(`${apiBase}/api/locations/nearby?zipCode=43026&radius=10&limit=50`)
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const data = await r.json()
      const normalized = Array.isArray(data) ? data.map(normalizeStore) : []
      const cemetery = normalized.find(s => /cemetery/i.test(s.name))
      const hilliard = cemetery || normalized.find(s => /hilliard/i.test(`${s.address?.city || ''} ${s.name}`))
      const chosen = hilliard || normalized[0]
      if (chosen) {
        setSelectedStore(chosen)
        try { localStorage.setItem('selectedStore', JSON.stringify(chosen)) } catch {}
      } else {
        // Fallback hardcoded if API yields none
        const fallback = { locationId: '01600966', name: 'Kroger - Cemetery Road', address: { city: 'Hilliard', state: 'OH' } } as Store
        setSelectedStore(fallback)
        try { localStorage.setItem('selectedStore', JSON.stringify(fallback)) } catch {}
      }
    } catch {
      const fallback = { locationId: '01600966', name: 'Kroger - Cemetery Road', address: { city: 'Hilliard', state: 'OH' } } as Store
      setSelectedStore(fallback)
      try { localStorage.setItem('selectedStore', JSON.stringify(fallback)) } catch {}
    }
  }

  async function validateSelectedStore(storeToTest: Store) {
    try {
      const params = new URLSearchParams({ term: 'milk', locationId: storeToTest.locationId, limit: '1' })
      const r = await fetch(`${apiBase}/api/products/search?${params.toString()}`)
      if (!r.ok) {
        // Re-select if invalid
        await autoSelectDefaultStore()
      }
    } catch {
      await autoSelectDefaultStore()
    }
  }
  
  // Load cart from backend
  async function loadCart() {
    try {
      const cart = await cartApi.getCart()
      setBackendCart(cart)
    } catch (error) {
      console.error('Failed to load cart:', error)
    }
  }

  // Rotate friendly loading messages while aggregated search runs
  useEffect(() => {
    let timer: any
    if (loadingProducts) {
      setLoadingStep(0)
      timer = setInterval(() => {
        setLoadingStep(prev => (prev + 1) % 4)
      }, 900)
    }
    return () => { if (timer) clearInterval(timer) }
  }, [loadingProducts])
  
  // Add to cart with backend sync
  async function addToCart(product: Product) {
    setCartLoading(true)
    try {
      const cartItem = {
        productId: product.productId,
        description: product.description,
        brand: product.brand,
        price: product.items?.[0]?.price?.promo ?? product.items?.[0]?.price?.regular,
        quantity: 1
      }
      const updatedCart = await cartApi.addToCart(cartItem)
      setBackendCart(updatedCart)
      showToast(`Added ${product.description} to cart`)
    } catch (error) {
      showToast('Failed to add item to cart', 'error')
    } finally {
      setCartLoading(false)
    }
  }
  
  // Remove from cart with backend sync
  async function removeFromCart(itemId: string) {
    setCartLoading(true)
    try {
      const updatedCart = await cartApi.removeFromCart(itemId)
      setBackendCart(updatedCart)
      showToast('Item removed from cart')
    } catch (error) {
      showToast('Failed to remove item from cart', 'error')
    } finally {
      setCartLoading(false)
    }
  }
  
  // Update cart item quantity
  async function updateCartItemQuantity(itemId: string, quantity: number) {
    if (quantity < 1) return
    setCartLoading(true)
    try {
      const updatedCart = await cartApi.updateCartItem(itemId, quantity)
      setBackendCart(updatedCart)
    } catch (error) {
      showToast('Failed to update quantity', 'error')
    } finally {
      setCartLoading(false)
    }
  }
  
  // Clear cart
  async function clearCart() {
    if (!confirm('Are you sure you want to clear your cart?')) return
    setCartLoading(true)
    try {
      const updatedCart = await cartApi.clearCart()
      setBackendCart(updatedCart)
      showToast('Cart cleared')
    } catch (error) {
      showToast('Failed to clear cart', 'error')
    } finally {
      setCartLoading(false)
    }
  }

  // Persist store on change
  useEffect(() => {
    try {
      if (selectedStore) localStorage.setItem('selectedStore', JSON.stringify(selectedStore))
    } catch {}
  }, [selectedStore])

  async function loadAllSalesForStore(force: boolean = false) {
    if (!selectedStore) return
    setSalesError(null)
    const key = selectedStore.locationId
    if (!force) {
      const cached = salesCache[key]
      if (cached && cached.length) { setProducts(cached as any); return }
    }
    setLoadingSales(true)
    try {
      const r = await fetch(`${apiBase}/api/products/sales/all?locationId=${encodeURIComponent(key)}&max=200`)
      if (!r.ok) {
        const errorData = await r.text()
        throw new Error(errorData || `HTTP ${r.status}`)
      }
      const d = await r.json()
      setProducts(d)
      setSalesCache(prev => ({ ...prev, [key]: d }))
      showToast('Sales loaded successfully')
    } catch (e: any) {
      setSalesError(e?.message || 'Failed to load sales')
      showToast('Failed to load sales', 'error')
    } finally {
      setLoadingSales(false)
    }
  }

  // Load sales for a specific term (quick category chip)
  async function loadSalesForTerm(termForSales: string) {
    if (!selectedStore) return
    setSalesError(null)
    setLoadingSales(true)
    try {
      const url = `${apiBase}/api/products/sales?locationId=${encodeURIComponent(selectedStore.locationId)}&term=${encodeURIComponent(termForSales)}&limit=50`
      const r = await fetch(url)
      if (!r.ok) {
        const errorData = await r.text()
        throw new Error(errorData || `HTTP ${r.status}`)
      }
      const d = await r.json()
      setProducts(d)
      showToast(`Found ${d.length} ${termForSales} deals`)
    } catch (e: any) {
      setSalesError(e?.message || 'Failed to load sales')
      showToast('Failed to load sales', 'error')
    } finally {
      setLoadingSales(false)
    }
  }

  // Auto-load sales when entering Sales tab and a store is selected
  useEffect(() => {
    if (activeTab === 'sales' && selectedStore) {
      void loadAllSalesForStore(false)
    }
  }, [activeTab, selectedStore])

  const cartSubtotal = useMemo(() => {
    return backendCart.total || 0
  }, [backendCart])

  async function findStores() {
    setLoadingStores(true)
    try {
      const r = await fetch(`${apiBase}/api/locations/nearby?zipCode=${encodeURIComponent(zip)}&radius=${radius}`)
      if (!r.ok) {
        throw new Error(`HTTP ${r.status}`)
      }
      const data = await r.json()
      const normalized = Array.isArray(data) ? data.map(normalizeStore).filter(s=>s.locationId && s.name) : []
      setStores(normalized)
      showToast(`Found ${normalized.length} stores`)
    } catch (error) {
      showToast('Failed to find stores', 'error')
    } finally {
      setLoadingStores(false)
    }
  }

  function handleSendChat(e?: React.FormEvent) {
    if (e) e.preventDefault()
    const text = chatInput.trim()
    if (!text) return
    const userMsg = { id: `u-${Date.now()}`, role: 'user' as const, text }
    setChatMessages(prev => [...prev, userMsg])
    setChatInput('')
    // Placeholder assistant echo
    const storeNote = selectedStore ? ` at ${selectedStore.name}` : ''
    const reply = { id: `a-${Date.now()+1}`, role: 'assistant' as const, text: `Got it! I\'ll search for "${text}"${storeNote}. (Coming soon)` }
    setTimeout(() => setChatMessages(prev => [...prev, reply]), 300)
  }

  function chooseStore(s: Store) {
    try {
      const normalized = normalizeStore(s)
      setSelectedStore(normalized)
      ;(window as any).__selectedStoreId = normalized.locationId
    } catch {
      setSelectedStore(s as any)
      ;(window as any).__selectedStoreId = (s as any)?.locationId
    }
  }

  // default store removed

  async function searchProducts(input?: string) {
    const q = (typeof input === 'string' ? input : term).trim()
    if (!selectedStore || !q) {
      showToast('Please select a store and enter a search term', 'warning')
      return
    }
    // Reset to first page on a new term
    if (q !== (lastSearchMeta?.term || '')) {
      setPageStart(0)
      setPageIndex(1)
      setPrefetchedStarts(new Set())
    }
    setLoadingProducts(true)
    try {
      // Use aggregated endpoint to stabilize paging and reduce API calls
      const aggUrl = `${apiBase}/api/products/search/all?term=${encodeURIComponent(q)}&locationId=${encodeURIComponent(selectedStore.locationId)}&max=300&fresh=${pageStart===0 ? 'true' : 'false'}`
      let r = await fetch(aggUrl)
      let data: Product[] = []
      if (!r.ok) {
        // Fallback: try known-good Cemetery Rd store if current store fails (e.g., bad persisted ID)
        const fallbackId = '01600966'
        if (selectedStore.locationId !== fallbackId) {
          const r2 = await fetch(`${apiBase}/api/products/search/all?term=${encodeURIComponent(q)}&locationId=${encodeURIComponent(fallbackId)}&max=300&fresh=true`)
          if (r2.ok) {
            data = await r2.json()
            const fallbackStore: Store = { locationId: fallbackId, name: 'Kroger - Cemetery Road', address: { city: 'Hilliard', state: 'OH' } }
            setSelectedStore(fallbackStore)
            try { localStorage.setItem('selectedStore', JSON.stringify(fallbackStore)) } catch {}
          } else {
            throw new Error(`HTTP ${r.status}`)
          }
        } else {
          throw new Error(`HTTP ${r.status}`)
        }
      } else {
        data = await r.json()
      }
      // Since we fetched all at once, replace products fully
      const mergedRaw = data
      // Deduplicate by productId while preserving order
      const seen = new Set<string>()
      const merged: Product[] = []
      for (const item of mergedRaw) {
        const pid = (item as any).productId || (item as any).upc || JSON.stringify(item)
        if (seen.has(pid)) continue
        seen.add(pid)
        merged.push(item)
      }
      setProducts(merged)
      // Suppress toast for search results
      setLastSearchMeta({ term: q, count: merged.length, when: new Date().toLocaleTimeString() })
      const pageHasMore = data.length > pageStart + pageSize
      setHasMore(pageHasMore)
      setTotalGuess(data.length)
      // no toast on search
    } catch (error) {
      showToast('Failed to search products', 'error')
    } finally {
      setLoadingProducts(false)
    }
  }

  async function prefetchNextPage(q: string, locId: string, startOffset: number) {
    try {
      if (prefetching) return
      if (prefetchedStarts.has(startOffset)) return
      setPrefetching(true)
      setPrefetchedStarts(prev => new Set(prev).add(startOffset))
      // With aggregated endpoint, prefetch is unnecessary; keep as no-op for safety
      const r = await fetch(`${apiBase}/api/products/search/all?term=${encodeURIComponent(q)}&locationId=${encodeURIComponent(locId)}&max=300`)
      if (!r.ok) { setPrefetching(false); return }
      const next = await r.json()
      if (Array.isArray(next) && next.length > 0) {
        setProducts(next)
        setHasMore(next.length > pageStart + pageSize)
        setTotalGuess(next.length)
      }
    } catch {
      // ignore prefetch errors silently
    } finally {
      setPrefetching(false)
    }
  }

  function priceOf(p: Product) {
    const n = p.items?.[0]?.price?.promo ?? p.items?.[0]?.price?.regular
    return typeof n === 'number' ? n : Number.POSITIVE_INFINITY
  }

  function normalizedBrand(p: Product): string {
    const b = (p.brand || '').trim()
    if (b) return b
    // Heuristic fallback: take leading word(s) before comma or hyphen in description if looks like a brand
    const d = (p.description || '').trim()
    const candidate = d.split(/[-,]/)[0]?.trim() || ''
    if (candidate && /[A-Za-z]/.test(candidate)) return candidate
    return ''
  }

  function categoriesOf(p: Product): string[] {
    // If API provides categories array, use it; otherwise none
    // @ts-ignore
    const cats: string[] | undefined = (p as any).categories
    return Array.isArray(cats) ? cats.filter(Boolean) : []
  }

  // Price helpers (match ProductCard logic) for consistent sort behavior
  function pickBestPriceForSort(p: ProductType): { regular?: number; promo?: number } {
    const items = (p as any).items || []
    let chosenRegular: number | undefined
    for (const it of items) {
      const pr = (it?.price || {}) as any
      const reg = typeof pr.regular === 'number' ? pr.regular : Number(pr.regular)
      const pro = typeof pr.promo === 'number' ? pr.promo : Number(pr.promo)
      if (Number.isFinite(reg) && Number.isFinite(pro) && pro > 0 && reg > 0 && pro < reg) {
        return { regular: reg, promo: pro }
      }
      if (chosenRegular === undefined && Number.isFinite(reg) && reg > 0) {
        chosenRegular = reg
      }
    }
    if (chosenRegular !== undefined) return { regular: chosenRegular }
    const np = (p as any).nationalPrice || {}
    const nReg = Number((np as any).regular)
    const nPro = Number((np as any).promo)
    return { regular: Number.isFinite(nReg) ? nReg : undefined, promo: Number.isFinite(nPro) ? nPro : undefined }
  }

  function discountPercent(p: ProductType): number {
    const { regular, promo } = pickBestPriceForSort(p)
    if (typeof regular === 'number' && typeof promo === 'number' && regular > 0 && promo > 0 && promo < regular) {
      return ((regular - promo) / regular) * 100
    }
    return 0
  }

  const brandChips = useMemo(() => {
    const counts = new Map<string, number>()
    for (const p of products) {
      const b = normalizedBrand(p)
      if (!b) continue
      counts.set(b, (counts.get(b) || 0) + 1)
    }
    return [...counts.entries()]
      .sort((a,b)=> b[1]-a[1])
      .slice(0, 8)
      .map(([name]) => name)
  }, [products])

  const categoryChips = useMemo(() => {
    const counts = new Map<string, number>()
    for (const p of products) {
      for (const c of categoriesOf(p)) {
        counts.set(c, (counts.get(c) || 0) + 1)
      }
    }
    return [...counts.entries()]
      .sort((a,b)=> b[1]-a[1])
      .slice(0, 8)
      .map(([name]) => name)
  }, [products])

  // Determine if client-side filters are active (affects paging and totals)
  const filtersActive = useMemo(() => {
    const priceActive = !!priceRange && (priceRange[0] > 0 || priceRange[1] < 100)
    const brandActive = !!(selectedBrandChip || brandFilter)
    const categoryActive = !!selectedCategoryChip
    const saleActive = !!onSaleOnly
    return priceActive || brandActive || categoryActive || saleActive
  }, [priceRange, selectedBrandChip, brandFilter, selectedCategoryChip, onSaleOnly])

  const filteredSorted = useMemo(() => {
    let out = products as ProductType[]

    // Effective brand filter: chip overrides text if set
    const brandQuery = (selectedBrandChip || brandFilter).trim().toLowerCase()
    if (brandQuery) {
      out = out.filter(p => (
        normalizedBrand(p).toLowerCase().includes(brandQuery) ||
        (p.description || '').toLowerCase().includes(brandQuery)
      ))
    }

    // Category chip filter if available
    if (selectedCategoryChip) {
      out = out.filter(p => categoriesOf(p).includes(selectedCategoryChip!))
    }

    if (onSaleOnly) {
      out = out.filter(p => {
        const reg = p.items?.[0]?.price?.regular
        const promo = p.items?.[0]?.price?.promo
        return typeof promo === 'number' && promo < (reg ?? Number.POSITIVE_INFINITY)
      })
    }

    // Price range filter (only if changed from default)
    if (priceRange && (priceRange[0] > 0 || priceRange[1] < 100)) {
      out = out.filter(p => {
        const price = priceOf(p)
        if (!isFinite(price)) return false
        return price >= priceRange[0] && price <= priceRange[1]
      })
    }

    const byDescription = (a: ProductType, b: ProductType) => (a.description || '').localeCompare(b.description || '')
    switch (sort) {
      case 'priceAsc': {
        out = [...out].sort((a,b)=> {
          const da = priceOf(a)
          const db = priceOf(b)
          if (da === db) return byDescription(a,b)
          // Push items with no price to the end
          if (!isFinite(da)) return 1
          if (!isFinite(db)) return -1
          return da - db
        })
        break
      }
      case 'priceDesc': {
        out = [...out].sort((a,b)=> {
          const da = priceOf(a)
          const db = priceOf(b)
          if (da === db) return byDescription(a,b)
          if (!isFinite(da)) return 1
          if (!isFinite(db)) return -1
          return db - da
        })
        break
      }
      case 'discountDesc': {
        out = [...out].sort((a, b) => {
          const da = discountPercent(a)
          const db = discountPercent(b)
          const aOn = da > 0 ? 1 : 0
          const bOn = db > 0 ? 1 : 0
          if (aOn !== bOn) return bOn - aOn // sale items first
          if (db !== da) return db - da     // highest discount first
          return byDescription(a, b)
        })
        break
      }
      case 'brandAsc':
        out = [...out].sort((a,b)=> normalizedBrand(a).localeCompare(normalizedBrand(b)) || byDescription(a,b))
        break
      case 'nameAsc':
        out = [...out].sort((a,b)=> (a.description||'').localeCompare(b.description||''))
        break
      case 'nameDesc':
        out = [...out].sort((a,b)=> (b.description||'').localeCompare(a.description||''))
        break
      default:
        // relevance: keep API order
        break
    }
    return out
  }, [products, sort, brandFilter, selectedBrandChip, selectedCategoryChip, onSaleOnly, priceRange])

  function clearSearchFilters() {
    setBrandFilter('')
    setSelectedBrandChip(null)
    setSelectedCategoryChip(null)
    setOnSaleOnly(false)
    setPriceRange([0, 100])
    setSort('discountDesc')
    setPageStart(0)
    setPageIndex(1)
    setTotalGuess(0)
    if (selectedStore && term) { void searchProducts(term) }
  }

  function handlePageChange(p: number) {
    const newStart = (p - 1) * pageSize
    setPageIndex(p)
    setPageStart(newStart)
  if (filtersActive) return
    const needUpTo = newStart + pageSize
    if (products.length < needUpTo) {
      void searchProducts(term)
    }
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          background: (t)=> `linear-gradient(90deg, ${t.palette.primary.main} 0%, ${t.palette.primary.dark} 100%)`,
          color: (t)=> t.palette.primary.contrastText
        }}
      >
        <Toolbar variant="dense" sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: 1, minHeight: 56, px: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <img src="/kroger-logo.png" alt="Kroger" style={{ height: 24 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Shopping AI</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Tabs value={activeTab} onChange={(_,v)=>setActiveTab(v)} textColor="inherit" indicatorColor="secondary" variant="scrollable" allowScrollButtonsMobile sx={{ minHeight: 40, '& .MuiTab-root': { minHeight: 40, py: 0.5, px: 1.5 } }}>
              <Tab value="ai" icon={<ChatOutlinedIcon />} iconPosition="start" label="AI Shopper" />
              <Tab value="sales" icon={<LocalOfferOutlinedIcon />} iconPosition="start" label="Sales" />
              <Tab value="search" icon={<SearchOutlinedIcon />} iconPosition="start" label="Search" />
              <Tab value="lists" icon={<ListAltOutlinedIcon />} iconPosition="start" label="Lists" />
              <Tab value="cart" icon={<ShoppingCartOutlinedIcon />} iconPosition="start" label="Cart" />
              {/* Hidden tab to satisfy MUI when switching to settings via the button */}
              <Tab value="settings" sx={{ display: 'none' }} />
            </Tabs>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1, height: 40 }}>
            <Paper elevation={6} sx={{ display: 'flex', alignItems: 'center', height: 32, px: 1.25, borderRadius: 999, bgcolor: 'rgba(255,255,255,0.95)', color: 'primary.dark', boxShadow: '0 0 0 2px rgba(255,255,255,0.35), 0 0 14px rgba(255,255,255,0.55)' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, lineHeight: 1 }}>Total: ${cartSubtotal.toFixed(2)}</Typography>
            </Paper>
            <IconButton color="inherit" aria-label="Settings" size="small" onClick={()=>setActiveTab('settings')} sx={{ width: 32, height: 32 }}>
              <SettingsOutlinedIcon fontSize="small" />
            </IconButton>
          </Box>
        </Toolbar>
        {prefetching && (
          <LinearProgress color="secondary" sx={{ height: 2 }} />
        )}
      </AppBar>
        {activeTab === 'cart' && (
          <section>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Shopping Cart</Typography>
                {backendCart.items.length > 0 && (
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    startIcon={<ClearAllIcon />}
                    onClick={clearCart}
                    disabled={cartLoading}
                  >
                    Clear Cart
                  </Button>
                )}
              </Box>
              {cartLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                  <CircularProgress />
                </Box>
              )}
              {!cartLoading && (
                <TableContainer>
                  <Table size="small" aria-label="cart table">
                    <TableHead>
                      <TableRow>
                        <TableCell>Item</TableCell>
                        <TableCell>Brand</TableCell>
                        <TableCell align="right">Price</TableCell>
                        <TableCell align="center">Quantity</TableCell>
                        <TableCell align="right">Subtotal</TableCell>
                        <TableCell align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {backendCart.items.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6}>
                            <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                              Your cart is empty. Start shopping!
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                      {backendCart.items.map((item) => (
                        <TableRow key={item.id} hover>
                          <TableCell>{item.description}</TableCell>
                          <TableCell>{item.brand || '-'}</TableCell>
                          <TableCell align="right">
                            {typeof item.price === 'number' ? `$${item.price.toFixed(2)}` : '-'}
                          </TableCell>
                          <TableCell align="center">
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                              <IconButton
                                size="small"
                                onClick={() => updateCartItemQuantity(item.id, item.quantity - 1)}
                                disabled={item.quantity <= 1}
                              >
                                <RemoveIcon fontSize="small" />
                              </IconButton>
                              <Typography sx={{ minWidth: 30, textAlign: 'center' }}>
                                {item.quantity}
                              </Typography>
                              <IconButton
                                size="small"
                                onClick={() => updateCartItemQuantity(item.id, item.quantity + 1)}
                              >
                                <AddIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          </TableCell>
                          <TableCell align="right">
                            {typeof item.price === 'number' ? `$${(item.price * item.quantity).toFixed(2)}` : '-'}
                          </TableCell>
                          <TableCell align="center">
                            <IconButton
                              color="error"
                              size="small"
                              aria-label="remove"
                              onClick={() => removeFromCart(item.id)}
                            >
                              <DeleteOutlineIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                      {backendCart.items.length > 0 && (
                        <TableRow>
                          <TableCell colSpan={4} align="right" sx={{ fontWeight: 600 }}>
                            Total
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600 }}>
                            ${backendCart.total.toFixed(2)}
                          </TableCell>
                          <TableCell />
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          </section>
        )}

      <Container maxWidth="lg" sx={{ py: 3, display: 'flex', justifyContent: 'center' }}>
        <Box sx={{ width: '100%', maxWidth: 1100 }}>
        {activeTab === 'ai' && (
          <section>
            <Stack spacing={2}>
              {/* Store Selection for AI */}
              {selectedStore && (
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Shopping at: <strong>{selectedStore.name}</strong>
                  </Typography>
                </Paper>
              )}
              
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>AI Shopping Assistant</Typography>
                <Typography variant="body2" color="text.secondary">
                  Chat-assisted shopping is coming soon. Ask for items or meal plans and I\'ll build your cart.
                </Typography>
              </Paper>
              
              <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 420 }}>
                <Box sx={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {chatMessages.map(m => (
                    <Box key={m.id} sx={{ alignSelf: m.role==='user' ? 'flex-end' : 'flex-start', maxWidth: '75%' }}>
                      <Paper sx={{ p: 1.2, bgcolor: m.role==='user' ? 'primary.main' : 'background.paper', color: m.role==='user' ? 'primary.contrastText' : 'text.primary' }}>
                        <Typography variant="body2">{m.text}</Typography>
                      </Paper>
                    </Box>
                  ))}
                </Box>
                <Divider sx={{ my: 1 }} />
                <Box component="form" onSubmit={handleSendChat} sx={{ display: 'flex', gap: 1 }}>
                  <TextField 
                    size="small" 
                    fullWidth 
                    placeholder="e.g., find organic milk on sale" 
                    value={chatInput} 
                    onChange={e=>setChatInput(e.target.value)}
                    disabled={!selectedStore}
                  />
                  <IconButton 
                    color="primary" 
                    type="submit" 
                    aria-label="send"
                    disabled={!selectedStore}
                  >
                    <SendIcon />
                  </IconButton>
                </Box>
              </Paper>
            </Stack>
          </section>
        )}

        {activeTab === 'sales' && (
          <section>
            <Stack spacing={3}>
              {/* Store Selection Info */}
              {!selectedStore ? (
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="body1" color="text.secondary">
                    Please select a store in Settings to view current sales.
                  </Typography>
                  <Button
                    variant="contained"
                    size="small"
                    sx={{ mt: 1 }}
                    onClick={() => setActiveTab('settings')}
                    startIcon={<SettingsOutlinedIcon />}
                  >
                    Go to Settings
                  </Button>
                </Paper>
              ) : (
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="subtitle1" sx={{ mb: 2 }}>Sales at {selectedStore.name}</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      {loadingSales && <><CircularProgress size={18} /><Typography variant="body2">Loading sales…</Typography></>}
                      {salesError && <Typography variant="body2" color="error">{salesError}</Typography>}
                    </Box>
                    <Button 
                      variant="contained" 
                      disabled={!selectedStore || loadingSales} 
                      onClick={()=>loadAllSalesForStore(true)}
                      startIcon={<LocalOfferOutlinedIcon />}
                    >
                      {loadingSales ? 'Loading...' : 'Refresh Sales'}
                    </Button>
                  </Box>

                  {/* Quick sale categories */}
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
                    {[
                      { label: 'Chips', term: 'chips' },
                      { label: 'Dairy & Eggs', term: 'milk' },
                      { label: 'Cheese', term: 'cheese' },
                      { label: 'Beverages', term: 'drink' },
                      { label: 'Bread & Bakery', term: 'bread' },
                      { label: 'Produce', term: 'fruit' },
                    ].map(({ label, term }) => (
                      <Chip
                        key={term}
                        label={label}
                        variant="outlined"
                        onClick={() => void loadSalesForTerm(term)}
                      />
                    ))}
                    <Chip label="Clear" color="secondary" variant="outlined" onClick={()=>void loadAllSalesForStore(true)} />
                  </Stack>

                  {(brandChips.length>0) && (
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
                      {brandChips.map((b) => (
                        <Chip 
                          key={b} 
                          label={b} 
                          color={selectedBrandChip===b? 'primary':'default'} 
                          variant={selectedBrandChip===b? 'filled':'outlined'} 
                          onClick={()=> setSelectedBrandChip(selectedBrandChip===b?null:b)} 
                        />
                      ))}
                    </Stack>
                  )}
                </Paper>
              )}
            {loadingSales ? (
              <Grid container spacing={2}>
                {Array.from({ length: 12 }).map((_, idx) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={idx}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Skeleton variant="rectangular" height={160} sx={{ mb: 1 }} />
                      <Skeleton width="40%" />
                      <Skeleton width="80%" />
                      <Skeleton width="60%" />
                      <Skeleton variant="rounded" height={32} sx={{ mt: 1 }} />
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Grid container spacing={2}>
                {filteredSorted
                  .filter(p=>{ const reg=p.items?.[0]?.price?.regular; const promo=p.items?.[0]?.price?.promo; return typeof promo==='number' && (reg==null || promo<reg) })
                  .map(p => (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={p.productId}>
                      <ProductCard
                        product={p}
                        onAdd={() => addToCart(p)}
                        onOpen={(prod) => setActiveProduct(prod as any)}
                      />
                    </Grid>
                ))}
              </Grid>
            )}
            </Stack>
          </section>
        )}

        {activeTab === 'lists' && <Lists />}

        {activeTab === 'settings' && (
          <section className="space-y-4">
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>Appearance</Typography>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <FormControl size="small" sx={{ minWidth: 180 }}>
                  <InputLabel id="theme-label">Theme</InputLabel>
                  <Select labelId="theme-label" label="Theme" value={theme} onChange={(e)=>setTheme(e.target.value as any)}>
                    <MenuItem value="indigo">Indigo</MenuItem>
                    <MenuItem value="slate">Slate</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Paper>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr auto' }, gap: 2, alignItems: 'end' }}>
              <TextField label="ZIP Code" size="small" value={zip} onChange={(e)=>setZip(e.target.value)} />
              <TextField label="Radius (miles)" size="small" type="number" value={radius} onChange={(e)=>setRadius(parseInt(e.target.value||'0',10))} />
              <Button variant="contained" onClick={findStores} disabled={loadingStores}>{loadingStores?'Finding...':'Find Stores'}</Button>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
              <Box sx={{ p: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>Nearby Stores</Typography>
                <Box sx={{ maxHeight: 320, overflow: 'auto' }}>
                  {stores.map((s)=> (
                    <Button key={s.locationId} fullWidth variant={selectedStore?.locationId===s.locationId?'outlined':'text'} sx={{ justifyContent: 'flex-start', mb: 0.5 }} onClick={()=>chooseStore(s)}>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>{s.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{s.address?.city}, {s.address?.state}</Typography>
                      </Box>
                    </Button>
                  ))}
                  {(!loadingStores && stores.length===0) && <Typography variant="body2" color="text.secondary">No results yet</Typography>}
                </Box>
              </Box>
              <Box sx={{ p: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>Selected Store</Typography>
                {selectedStore ? (
                  <Box>
                    <Typography fontWeight={600}>{selectedStore.name}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>{selectedStore.address?.city}, {selectedStore.address?.state}</Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button variant="outlined" onClick={()=>setActiveTab('search')}>Go to Search</Button>
                    </Box>
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">No store selected</Typography>
                )}
              </Box>
            </Box>
          </section>
        )}

        {activeTab === 'search' && (
          <section className="space-y-4">
            <SearchBar
              value={term}
              onChange={setTerm}
              onSearch={(v)=>searchProducts(v)}
              placeholder="Search for products..."
              loading={loadingProducts}
              suggestions={["milk","eggs","bread","chips","coffee","yogurt","cereal","chicken"]}
              recentSearches={[]}
              trendingSearches={["chips","milk","bread"]}
              filters={{
                sort,
                priceRange,
                onSaleOnly,
                categories: selectedCategoryChip? [selectedCategoryChip] : [],
                brands: selectedBrandChip? [selectedBrandChip] : (brandFilter? [brandFilter] : []),
                dietary: [],
                inStockOnly: true,
              }}
              onFiltersChange={(f)=>{
                setSort(f.sort)
                setPriceRange(f.priceRange)
                setOnSaleOnly(f.onSaleOnly)
                setSelectedCategoryChip(f.categories[0] || null)
                if (f.brands.length>0) { setSelectedBrandChip(f.brands[0]); setBrandFilter(f.brands[0]) } else { setSelectedBrandChip(null); setBrandFilter('') }
                if (selectedStore && term) { void searchProducts(term) }
              }}
            />

            <Grid container spacing={2}>
              <Grid item xs={12} md={3} lg={3}>
                <SearchFiltersPanel
                  sort={sort}
                  onChangeSort={setSort as any}
                  brandFilter={brandFilter}
                  onChangeBrandFilter={setBrandFilter}
                  onSaleOnly={onSaleOnly}
                  onChangeOnSaleOnly={setOnSaleOnly}
                  priceRange={priceRange}
                  onChangePriceRange={setPriceRange}
                  categoryChips={categoryChips}
                  selectedCategory={selectedCategoryChip}
                  onChangeSelectedCategory={setSelectedCategoryChip}
                  onClearAll={clearSearchFilters}
                />
              </Grid>
              <Grid item xs={12} md={9} lg={9}>
                {!selectedStore && <Typography variant="body2" color="text.secondary">Select a store in Settings first.</Typography>}
                {selectedStore && (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      {products.length === 0 && !loadingProducts && term.trim() === '' && (
                        'Search for products to see results here'
                      )}
                      {term.trim() !== '' && (
                        loadingProducts ? 'Searching…' : (()=>{
                          const effectiveTotal = filtersActive ? filteredSorted.length : Math.max(totalGuess, products.length)
                          const first = effectiveTotal === 0 ? 0 : pageStart + 1
                          const last = Math.min(pageStart + pageSize, effectiveTotal)
                          const suffix = !filtersActive && hasMore ? '+' : ''
                          return effectiveTotal === 0 ? 'No results' : `Showing ${first}-${last} of ${effectiveTotal}${suffix} results`
                        })()
                      )}
                    </Typography>
                    <Button size="small" color="inherit" onClick={clearSearchFilters}>Clear Filters</Button>
                  </Box>
                )}
                {/* Sticky pagination overlay: only show after first search results */}
                {products.length > 0 && (
                  <Box sx={{ position: 'sticky', top: 72, zIndex: 2, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
                    <Paper elevation={3} sx={{ px: 1.5, py: 0.5, borderRadius: 999, pointerEvents: 'auto', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                      <Pagination
                        size="small"
                        count={Math.max(1, Math.ceil(Math.max(filtersActive ? filteredSorted.length : Math.max(totalGuess, products.length), filtersActive ? filteredSorted.length : 0) / pageSize))}
                        page={pageIndex}
                        onChange={(_, p)=> handlePageChange(p)}
                        color="primary"
                        showFirstButton
                        showLastButton
                        sx={{ px: 1 }}
                      />
                    </Paper>
                  </Box>
                )}
                {loadingProducts ? (
                  <Grid container spacing={2}>
                    {Array.from({ length: 12 }).map((_, idx) => (
                      <Grid item xs={12} sm={6} md={4} key={idx}>
                        <Paper variant="outlined" sx={{ p: 2 }}>
                          <Skeleton variant="rectangular" height={160} sx={{ mb: 1 }} />
                          <Skeleton width="40%" />
                          <Skeleton width="80%" />
                          <Skeleton width="60%" />
                          <Skeleton variant="rounded" height={32} sx={{ mt: 1 }} />
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  products.length === 0 && term.trim() === '' ? (
                    <Paper variant="outlined" sx={{ p: 6, textAlign: 'center', color: 'text.secondary' }}>
                      <Typography variant="h6" gutterBottom>Start your search</Typography>
                      <Typography variant="body2">Use the search box above to find products at {selectedStore?.name || 'your store'}.</Typography>
                    </Paper>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {filteredSorted.slice(pageStart, pageStart + pageSize).map(p => (
                        <ProductCard
                          key={p.productId}
                          product={p}
                          onAdd={() => addToCart(p)}
                          onOpen={(prod) => setActiveProduct(prod as any)}
                        />
                      ))}
                    </div>
                  )
                )}
                {/* Bottom pager removed to keep overlay persistent the primary control */}
              </Grid>
            </Grid>
          </section>
        )}
        </Box>
      </Container>
      {/* Global loading backdrop during aggregated search */}
      <Backdrop open={loadingProducts} sx={{ color: '#fff', zIndex: (t)=> t.zIndex.modal + 2 }}>
        <Paper sx={{ p: 3, borderRadius: 2, minWidth: 320, maxWidth: 420, bgcolor: 'rgba(0,0,0,0.72)', color: 'white' }} elevation={6}>
          <Stack spacing={2} alignItems="stretch">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <CircularProgress color="inherit" size={40} thickness={4} />
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {loadingStep === 0 && 'Searching products…'}
                  {loadingStep === 1 && 'Finding yummy deals for you 🛒🍎'}
                  {loadingStep === 2 && 'Loading more results you may like…'}
                  {loadingStep === 3 && 'Almost there… preparing results'}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.9 }}>
                  This may take a moment as we gather everything.
                </Typography>
              </Box>
            </Box>
            <LinearProgress color="secondary" sx={{ height: 6, borderRadius: 999 }} />
          </Stack>
        </Paper>
      </Backdrop>
      {/* Global product detail modal so it works from any tab */}
      <ProductDetailModal
        product={activeProduct}
        onClose={()=>setActiveProduct(null)}
        currentQuantity={activeProduct ? (backendCart.items.find(i => i.productId === activeProduct.productId)?.quantity || 0) : 0}
        onAddToCart={(p)=> addToCart(p)}
        onRemoveFromCart={(pid)=> removeFromCart(pid)}
        onUpdateQuantity={(pid, qty)=> updateCartItemQuantity(pid, qty)}
        selectedStoreId={selectedStore?.locationId}
      />
      {/* Toast notifications */}
      <Toast
        open={toast.open}
        message={toast.message}
        severity={toast.severity}
        onClose={() => setToast({ ...toast, open: false })}
      />
    </div>
  )
}


