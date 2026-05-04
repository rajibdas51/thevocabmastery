'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SidebarStore {
  collapsed: boolean
  mobileOpen: boolean
  toggleCollapsed: () => void
  setCollapsed: (v: boolean) => void
  setMobileOpen: (v: boolean) => void
}

export const useSidebarStore = create<SidebarStore>()(
  persist(
    (set) => ({
      collapsed: false,
      mobileOpen: false,
      toggleCollapsed: () => set((s) => ({ collapsed: !s.collapsed })),
      setCollapsed: (collapsed) => set({ collapsed }),
      setMobileOpen: (mobileOpen) => set({ mobileOpen }),
    }),
    { name: 'vocabmaster-sidebar', partialize: (s) => ({ collapsed: s.collapsed }) }
  )
)