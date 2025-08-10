import React, { useEffect } from 'react'
import { useUIStore } from '../store/uiStore'

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useUIStore(s => s.theme)

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme
  }, [theme])

  return <>{children}</>
}




