/**
 * FILE: src/store/streak.ts
 *
 * Client-side cache for streak/points data.
 * Components read from here — no repeated DB calls per render.
 * Hydrated once in AppShell, refreshed after any recordActivity() call.
 */
import { create } from 'zustand'
import type { UserStreak, DailyActivityLog, UserMilestone, StreakStatus, PointSystemConfig } from '@/types/streak'
import {
  getUserStreak, getTodayActivity, getUserMilestones,
  computeStreakStatus, getPointConfig,
} from '@/lib/streak'

interface StreakStore {
  // Data
  streak:      UserStreak | null
  todayLogs:   DailyActivityLog[]
  milestones:  UserMilestone[]
  status:      StreakStatus | null
  config:      PointSystemConfig | null

  // Pending milestone popup queue
  pendingMilestones: string[]   // milestone_key values to show as popups
  dismissMilestone:  (key: string) => void

  // Loading
  loading:     boolean

  // Actions
  hydrate:     (userId: string) => Promise<void>
  refresh:     (userId: string) => Promise<void>
  queueMilestones: (keys: string[]) => void
}

export const useStreakStore = create<StreakStore>((set, get) => ({
  streak:     null,
  todayLogs:  [],
  milestones: [],
  status:     null,
  config:     null,
  pendingMilestones: [],
  loading:    false,

  dismissMilestone: (key) => set(s => ({
    pendingMilestones: s.pendingMilestones.filter(k => k !== key)
  })),

  queueMilestones: (keys) => set(s => ({
    pendingMilestones: [...new Set([...s.pendingMilestones, ...keys])]
  })),

  hydrate: async (userId) => {
    if (get().loading) return
    set({ loading: true })
    const [streak, todayLogs, milestones, config] = await Promise.all([
      getUserStreak(userId),
      getTodayActivity(userId),
      getUserMilestones(userId),
      getPointConfig(),
    ])
    const status = streak ? computeStreakStatus(streak, todayLogs) : null
    set({ streak, todayLogs, milestones, status, config, loading: false })
  },

  refresh: async (userId) => {
    // Lightweight refresh — same as hydrate but doesn't set loading
    const [streak, todayLogs, milestones] = await Promise.all([
      getUserStreak(userId),
      getTodayActivity(userId),
      getUserMilestones(userId),
    ])
    const status = streak ? computeStreakStatus(streak, todayLogs) : null
    set({ streak, todayLogs, milestones, status })
  },
}))
