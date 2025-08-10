import React from 'react'
import { Snackbar, Alert, AlertColor } from '@mui/material'

interface ToastProps {
  open: boolean
  message: string
  severity: AlertColor
  onClose: () => void
}

export default function Toast({ open, message, severity, onClose }: ToastProps) {
  const handleClose = (_e?: any, reason?: string) => {
    if (reason === 'clickaway') return
    onClose()
  }
  const sxColor = severity === 'info' ? { bgcolor: 'primary.main', color: 'primary.contrastText' } : {}
  return (
    <Snackbar
      open={open}
      autoHideDuration={2500}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      <Alert onClose={handleClose} severity={severity} variant="filled" sx={{ width: '100%', boxShadow: 3, ...sxColor }}>
        {message}
      </Alert>
    </Snackbar>
  )
}