import React, { useEffect, useMemo, useState } from 'react'
import type { Product } from './ProductCard'
import { Dialog, DialogTitle, DialogContent, Box, Typography, Stack, Button, Chip, IconButton, Divider, Tooltip, Paper } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined'
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined'

function getImageUrls(product: Product): string[] {
  const urls: string[] = []
  const images = Array.isArray(product.images) ? product.images : []
  images.forEach(entry => {
    const sizes = Array.isArray(entry?.sizes) ? entry.sizes : []
    sizes.forEach(s => { if (s?.url) urls.push(s.url) })
  })
  // unique preserve order
  return Array.from(new Set(urls))
}

function getPrimaryImageUrl(product: Product): string | null {
  const images = Array.isArray(product.images) ? product.images : []
  if (images.length === 0) return null
  const byPerspective = (p?: string) => images.find(e => (e as any).perspective && String((e as any).perspective).toLowerCase() === String(p || '').toLowerCase())
  const preferred = byPerspective('front') || images[0]
  const sizes = Array.isArray((preferred as any)?.sizes) ? (preferred as any).sizes : []
  if (sizes.length === 0) return null
  const order = ['xxlarge', 'xlarge', 'large', 'medium', 'small', 'thumbnail']
  const sorted = [...sizes].sort((a: any, b: any) => order.indexOf(String(a?.size || '').toLowerCase()) - order.indexOf(String(b?.size || '').toLowerCase()))
  const best = sorted.find((s: any) => !!s?.url) || sizes[sizes.length - 1]
  return (best as any)?.url || null
}

function fmt(n?: number): string | null {
  return typeof n === 'number' ? `$${n.toFixed(2)}` : null
}

export default function ProductDetailModal({
  product,
  onClose,
  currentQuantity = 0,
  onAddToCart,
  onRemoveFromCart,
  onUpdateQuantity,
  selectedStoreId,
}: {
  product: Product | null
  onClose: () => void
  currentQuantity?: number
  onAddToCart?: (product: Product) => void
  onRemoveFromCart?: (productId: string) => void
  onUpdateQuantity?: (productId: string, quantity: number) => void
  selectedStoreId?: string
}) {
  const open = !!product
  const urls = useMemo(() => product ? getImageUrls(product) : [], [product])
  const primaryUrl = useMemo(() => product ? getPrimaryImageUrl(product) : null, [product])
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null)
  useEffect(() => {
    setSelectedImageUrl(primaryUrl || urls[0] || null)
  }, [primaryUrl, urls])
  const [details, setDetails] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const rawReg = product?.items?.[0]?.price?.regular as any
  const rawPromo = product?.items?.[0]?.price?.promo as any
  const baseReg = typeof rawReg === 'number' ? rawReg : (typeof rawReg === 'string' ? parseFloat(rawReg) : undefined)
  const basePro = typeof rawPromo === 'number' ? rawPromo : (typeof rawPromo === 'string' ? parseFloat(rawPromo) : undefined)
  const categories: string[] = Array.isArray((product as any)?.categories) ? ((product as any).categories as string[]).filter(Boolean) : []
  // Prefer detailed price if available
  const detReg = typeof details?.items?.[0]?.price?.regular === 'number' ? details.items[0].price.regular : undefined
  const detPro = typeof details?.items?.[0]?.price?.promo === 'number' ? details.items[0].price.promo : undefined
  const priceRegular = (typeof detReg === 'number' ? detReg : baseReg)
  const pricePromo = (typeof detPro === 'number' ? detPro : basePro)
  const onSale = typeof pricePromo === 'number' && pricePromo < (priceRegular ?? Number.POSITIVE_INFINITY)
  const discountPct = onSale && priceRegular ? Math.round(((priceRegular - (pricePromo || 0)) / priceRegular) * 100) : 0

  useEffect(() => {
    let aborted = false
    async function load() {
      if (!product) return
      setLoading(true)
      setError(null)
      setDetails(null)
      try {
        const paramsObj: Record<string, string> = { productId: product.productId }
        if (selectedStoreId) paramsObj.locationId = selectedStoreId
        const params = new URLSearchParams(paramsObj)
        const r = await fetch(`/api/products/details?${params.toString()}`)
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const d = await r.json()
        if (!aborted) setDetails(d)
      } catch (e: any) {
        if (!aborted) setError(e?.message || 'Failed to load details')
      } finally {
        if (!aborted) setLoading(false)
      }
    }
    load()
    return () => { aborted = true }
  }, [product])

  if (!open) return null
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { height: '84vh' } }}>
      <DialogTitle sx={{ pb: 1, position: 'relative', pr: 8 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" color="text.secondary">{product!.brand || '—'}</Typography>
          <Typography variant="caption" color="text.secondary">• UPC {(details?.upc || (product as any)?.upc || product!.productId) as string}</Typography>
        </Box>
        <Typography variant="h6">{product!.description}</Typography>
        {onSale && (
          <Box sx={{ position: 'absolute', top: '50%', right: 12, transform: 'translateY(-50%)' }}>
            <Paper elevation={6} sx={{ bgcolor: 'error.main', color: 'error.contrastText', px: 2.5, py: 1, borderRadius: 2 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <LocalOfferOutlinedIcon sx={{ fontSize: 28 }} />
                <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: 1 }}>SALE</Typography>
              </Stack>
            </Paper>
          </Box>
        )}
      </DialogTitle>
      <DialogContent dividers sx={{ maxHeight: 'calc(84vh - 64px)' }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
          <Box>
            <Box sx={{ aspectRatio: '1 / 1', bgcolor: 'grey.50', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', mb: 0.5 }}>
              {selectedImageUrl ? (
                <img src={selectedImageUrl} alt={product!.description} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 16 }} />
              ) : (
                <Typography variant="caption" color="text.secondary">No image</Typography>
              )}
            </Box>
            {/* UPC moved to title */}
            {/* Optional thumbnail strip removed to avoid duplicates and clutter */}
          </Box>
          <Box>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5, flexWrap: 'wrap' }}>
              <Typography variant="h3" color={onSale ? 'error.main' : 'text.primary'} fontWeight={800}>
                {fmt(pricePromo) || fmt(priceRegular) || 'Price unavailable'}
              </Typography>
              {onSale && (
                <Typography variant="h6" color="text.disabled" sx={{ textDecoration: 'line-through' }}>
                  {fmt(priceRegular)}
                </Typography>
              )}
              {onSale && discountPct > 0 && (
                <Paper sx={{ bgcolor: 'secondary.main', color: 'secondary.contrastText', px: 1.25, py: 0.25, borderRadius: 1.5 }}>
                  <Typography variant="h5" fontWeight={900} sx={{ lineHeight: 1 }}>{`-${discountPct}%`}</Typography>
                </Paper>
              )}
            </Stack>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
              <Box sx={{ bgcolor: 'grey.50', borderRadius: 1, p: 1.5 }}>
                <Typography variant="caption" color="text.secondary">Product ID</Typography>
                <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>{product!.productId}</Typography>
              </Box>
              <Box sx={{ bgcolor: 'grey.50', borderRadius: 1, p: 1.5 }}>
                <Typography variant="caption" color="text.secondary">Size</Typography>
                <Typography variant="body2">{(details?.items?.[0]?.size || details?.items?.[0]?.itemSize || product && (product as any).size) ?? '—'}</Typography>
              </Box>
            </Box>
            {!!categories.length && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" color="text.secondary">Categories</Typography>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 0.5 }}>
                  {categories.map((c) => (
                    <Chip key={c} size="small" variant="outlined" label={c} />
                  ))}
                </Stack>
              </Box>
            )}
            <Divider sx={{ my: 2 }} />
            {/* Fulfillment and inventory chips */}
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 1 }}>
              {details?.fulfillment?.instore && <Chip size="small" variant="outlined" label="In-Store" />}
              {details?.fulfillment?.curbside && <Chip size="small" variant="outlined" label="Curbside" />}
              {details?.fulfillment?.delivery && <Chip size="small" variant="outlined" label="Delivery" />}
              {details?.fulfillment?.shiptohome && <Chip size="small" variant="outlined" label="Ship to Home" />}
              {details?.items?.[0]?.inventory?.stockLevel && <Chip size="small" color="info" label={`Stock: ${details.items[0].inventory.stockLevel}`} />}
            </Stack>
            {/* Additional details from API when available */}
            {details && (
              <Box sx={{ mb: 6 }}>
                <Stack spacing={1}>
                  {Array.isArray(details?.items) && Array.isArray(details.items[0]?.aisleLocations) && details.items[0].aisleLocations[0] && (
                    <Typography variant="body2" color="text.secondary">
                      {details.items[0].aisleLocations.map((loc: any, i: number) => `Aisle ${loc.aisleNumber}` + (loc.shelfNumber?` Shelf ${loc.shelfNumber}`:'') + (loc.bayNumber?` Bay ${loc.bayNumber}`:'')).join(' • ')}
                    </Typography>
                  )}
                  {details?.nationalPrice && (
                    <Typography variant="body2" color="text.secondary">National Price: {typeof details.nationalPrice.promo==='number' ? `$${details.nationalPrice.promo.toFixed(2)}` : (typeof details.nationalPrice.regular==='number' ? `$${details.nationalPrice.regular.toFixed(2)}` : '-')}</Typography>
                  )}
                </Stack>
              </Box>
            )}
            {/* Bottom action bar */}
            <Box sx={{ position: 'sticky', bottom: 0, bgcolor: 'background.paper', pt: 2 }}>
              <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
                <Stack direction="row" spacing={1} alignItems="center">
                  {details?.productPageUrl && (
                    <Button href={details.productPageUrl} target="_blank" rel="noopener noreferrer" variant="contained" size="large">
                      View product page on kroger.com
                    </Button>
                  )}
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Tooltip title="Decrease quantity">
                    <IconButton color="primary" onClick={() => onUpdateQuantity && onUpdateQuantity(product!.productId, Math.max(1, (currentQuantity || 1) - 1))}>
                      <RemoveIcon />
                    </IconButton>
                  </Tooltip>
                  <Typography variant="subtitle1" sx={{ minWidth: 32, textAlign: 'center' }}>{currentQuantity || 1}</Typography>
                  <Tooltip title="Increase quantity">
                    <IconButton color="primary" onClick={() => onUpdateQuantity && onUpdateQuantity(product!.productId, (currentQuantity || 1) + 1)}>
                      <AddIcon />
                    </IconButton>
                  </Tooltip>
                  {currentQuantity > 0 && (
                    <Button variant="outlined" color="error" onClick={() => onRemoveFromCart && onRemoveFromCart(product!.productId)}>
                      Remove from Cart
                    </Button>
                  )}
                  <Button startIcon={<ShoppingCartOutlinedIcon />} size="large" variant="contained" onClick={() => onAddToCart && onAddToCart(product!)} sx={{ px: 3 }}>
                    Add to Cart
                  </Button>
                  <Button variant="outlined" onClick={onClose}>Close</Button>
                </Stack>
              </Stack>
            </Box>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  )
}


