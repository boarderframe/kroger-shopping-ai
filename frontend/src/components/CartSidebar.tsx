import React from 'react'
import { useUIStore } from '../store/uiStore'
import { Drawer, Box, Typography, IconButton, Divider, Button } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'

export default function CartSidebar() {
  const { isCartOpen, setCartOpen, cart, removeFromCart } = useUIStore()
  const total = cart.reduce((sum, c) => sum + (c.price ?? 0) * c.qty, 0)
  return (
    <Drawer anchor="right" open={isCartOpen} onClose={()=>setCartOpen(false)}>
      <Box sx={{ width: 360, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2 }}>
          <Typography fontWeight={600}>Cart</Typography>
          <IconButton onClick={()=>setCartOpen(false)}><CloseIcon /></IconButton>
        </Box>
        <Divider />
        <Box sx={{ p: 2, gap: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', flex: 1 }}>
          {cart.length === 0 && <Typography variant="body2" color="text.secondary">Your cart is empty</Typography>}
          {cart.map(item => (
            <Box key={item.id} sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
              <Box>
                <Typography variant="body2" fontWeight={600}>{item.description}</Typography>
                <Typography variant="caption" color="text.secondary">{item.brand || '—'} · x{item.qty}</Typography>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="body2">${((item.price ?? 0) * item.qty).toFixed(2)}</Typography>
                <Button size="small" variant="text" color="error" onClick={()=>removeFromCart(item.id)}>Remove</Button>
              </Box>
            </Box>
          ))}
        </Box>
        <Divider />
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography fontWeight={600}>Total</Typography>
          <Typography fontWeight={700}>${total.toFixed(2)}</Typography>
        </Box>
      </Box>
    </Drawer>
  )
}


