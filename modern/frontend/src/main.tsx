import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { indigoTheme, slateTheme } from './theme'
import { useUIStore } from './store/uiStore'
import React from 'react'

function Root() {
  // Inline hook wrapper to bridge Zustand theme into MUI ThemeProvider
  const themeName = useUIStore(s => s.theme)
  const theme = themeName === 'slate' ? slateTheme : indigoTheme
  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </ErrorBoundary>
  )
}

createRoot(document.getElementById('root')!).render(<Root />)

