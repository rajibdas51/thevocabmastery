import { create } from 'zustand'
import type { Profile } from '@/types'

interface AuthStore {
  profile: Profile | null
  setProfile: (p: Profile | null) => void
  isAdmin: () => boolean
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),
  isAdmin: () => get().profile?.role === 'admin',
}))