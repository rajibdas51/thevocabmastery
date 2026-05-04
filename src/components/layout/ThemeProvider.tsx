'use client'
import { useEffect } from 'react'
import { useThemeStore } from '@/store/theme'

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useThemeStore()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Also apply on mount immediately (before paint)
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', theme)
  }

  return <>{children}</>
}