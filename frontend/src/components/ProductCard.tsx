import React from 'react'
import { Card, CardMedia, CardContent, Typography, Button, Box, Chip, Stack, IconButton } from '@mui/material'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'

type ImageSize = { size?: string; url?: string }
type ImageEntry = { perspective?: string; sizes?: ImageSize[] }

export type Product = {
  productId: string
  description: string
  brand?: string
  images?: ImageEntry[]
  items?: Array<{ price?: { regular?: number; promo?: number } }>
}

function getBestImageUrl(product: Product): string | null {
  const entries = Array.isArray(product.images) ? product.images : []
  if (entries.length === 0) return null
  const byPerspective = (p?: string) => entries.find(e => (e.perspective || '').toLowerCase() === (p || '').toLowerCase())
  const preferred = byPerspective('front') || entries[0]
  const sizes = Array.isArray(preferred?.sizes) ? preferred?.sizes : []
  if (sizes.length === 0) return null
  const order = ['xxlarge', 'xlarge', 'large', 'medium', 'small', 'thumbnail']
  const sorted = [...sizes].sort((a, b) => order.indexOf((a.size || '').toLowerCase()) - order.indexOf((b.size || '').toLowerCase()))
  const best = sorted.find(s => !!s.url) || sizes[sizes.length - 1]
  return best?.url || null
}

function formatPrice(n?: number): string | null {
  if (typeof n !== 'number') return null
  return `$${n.toFixed(2)}`
}

function toNumber(n: unknown): number | undefined {
  if (typeof n === 'number') return n
  if (typeof n === 'string') {
    const v = parseFloat(n)
    return Number.isFinite(v) ? v : undefined
  }
  return undefined
}

export default function ProductCard({ product, onAdd, onOpen }: { product: Product; onAdd?: (p: Product) => void; onOpen?: (p: Product) => void }) {
  const img = getBestImageUrl(product)

  function pickBestPrice(p: Product): { regular?: number; promo?: number } {
    const items = p.items || []
    let chosenRegular: number | undefined
    let chosenPromo: number | undefined
    // Prefer any item entry that has a valid promo < regular
    for (const it of items) {
      const pr = it?.price || {}
      const reg = toNumber((pr as any).regular)
      const pro = toNumber((pr as any).promo)
      if (typeof reg === 'number' && typeof pro === 'number' && pro > 0 && reg > 0 && pro < reg) {
        return { regular: reg, promo: pro }
      }
      if (chosenRegular === undefined && typeof reg === 'number' && reg > 0) {
        chosenRegular = reg
      }
    }
    if (chosenRegular !== undefined) {
      return { regular: chosenRegular, promo: undefined }
    }
    // Fallback to nationalPrice if provided
    const np = (p as any).nationalPrice || {}
    const nReg = toNumber(np.regular)
    const nPro = toNumber(np.promo)
    return { regular: nReg, promo: nPro }
  }

  const { regular: regNum, promo: promoNum } = pickBestPrice(product)
  const regular = formatPrice(regNum)
  const onSale = typeof promoNum === 'number' && typeof regNum === 'number' && promoNum > 0 && promoNum < regNum
  const discountPct = onSale && regNum! > 0 && promoNum! > 0 ? Math.round(((regNum! - promoNum!) / regNum!) * 100) : 0
  return (
    <Card 
      variant="outlined" 
      sx={{ 
        overflow: 'hidden',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.2s',
        '&:hover': {
          boxShadow: 3,
          transform: 'translateY(-2px)',
        },
      }}
    >
      <Box sx={{ position: 'relative', cursor: 'pointer' }} onClick={() => onOpen?.(product)}>
        {onSale && (
          <Chip 
            size="small" 
            color="error" 
            label="SALE" 
            sx={{ 
              position: 'absolute', 
              top: 8, 
              left: 8,
              zIndex: 1,
              fontWeight: 600,
            }} 
          />
        )}
        {img ? (
          <CardMedia 
            component="img" 
            image={img} 
            alt={product.description} 
            sx={{ 
              aspectRatio: '1 / 1', 
              objectFit: 'contain', 
              p: 2, 
              bgcolor: 'background.default',
            }} 
          />
        ) : (
          <Box 
            sx={{ 
              aspectRatio: '1 / 1', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              bgcolor: 'background.default',
            }}
          >
            <Typography variant="caption" color="text.disabled">
              No image available
            </Typography>
          </Box>
        )}
      </Box>
      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Typography 
          variant="caption" 
          color="text.secondary" 
          sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}
        >
          {product.brand || 'Generic'}
        </Typography>
        <Typography 
          variant="body2" 
          fontWeight={600} 
          sx={{ mt: 0.5, minHeight: '2.4em' }} 
          title={product.description}
        >
          {product.description}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Stack direction="row" spacing={1} alignItems="baseline" sx={{ mt: 2, flexWrap: 'wrap' }}>
          {onSale ? (
            <>
              <Typography variant="h6" color="error.main" fontWeight={700}>
                {formatPrice(promoNum)!}
              </Typography>
              {regular && (
                <Typography 
                  variant="body2" 
                  color="text.disabled" 
                  sx={{ textDecoration: 'line-through' }}
                >
                  {regular}
                </Typography>
              )}
              <Chip size="small" color={discountPct >= 20 ? 'success' : 'default'} label={`-${discountPct}%`} sx={{ ml: 0.5, height: 22 }} />
            </>
          ) : regular ? (
            <Typography variant="h6" fontWeight={600}>
              {regular}
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Price unavailable
            </Typography>
          )}
        </Stack>
        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <Button 
            fullWidth 
            variant="contained" 
            size="small" 
            onClick={() => onAdd?.(product)}
            sx={{ fontWeight: 600 }}
          >
            Add to Cart
          </Button>
          <IconButton 
            size="small" 
            color="primary" 
            onClick={() => onOpen?.(product)}
            sx={{ border: 1, borderColor: 'divider' }}
          >
            <InfoOutlinedIcon fontSize="small" />
          </IconButton>
        </Stack>
      </CardContent>
    </Card>
  )
}


