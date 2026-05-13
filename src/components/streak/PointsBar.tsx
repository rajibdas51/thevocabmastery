'use client'
/**
 * FILE: src/components/streak/PointsBar.tsx
 *
 * Shows current points like Duolingo hearts.
 * Used in: quiz header, fill-blank header, top of app on mobile.
 */
import { cn } from '@/lib/utils'
import { useStreakStore } from '@/store/streak'
import { isPremiumPlan } from '@/lib/streak'
import { Zap } from 'lucide-react'

interface PointsBarProps {
  compact?: boolean   // true = just icon + number, no bar
  className?: string
}

export default function PointsBar({ compact, className }: PointsBarProps) {
  const { streak } = useStreakStore()
  if (!streak) return null

  const isPremium = isPremiumPlan(streak.subscription_plan)
  const pct = Math.round((streak.current_points / Math.max(1, streak.max_points)) * 100)
  const isEmpty = streak.current_points <= 0

  // Premium = infinite
  if (isPremium) {
    return (
      <div className={cn('flex items-center gap-1.5', className)}>
        <span className="text-base">⚡</span>
        <span className="text-xs font-bold" style={{ color: 'var(--accent2)' }}>
          Unlimited
        </span>
      </div>
    )
  }

  if (compact) {
    return (
      <div className={cn('flex items-center gap-1.5', className)}>
        <span className={cn('text-base', isEmpty && 'grayscale opacity-50')}>
          {isEmpty ? '🖤' : '❤️'}
        </span>
        <span
          className="text-sm font-bold font-mono"
          style={{ color: isEmpty ? 'var(--text3)' : 'var(--red)' }}
        >
          {streak.current_points}
        </span>
        <span className="text-xs" style={{ color: 'var(--text3)' }}>
          /{streak.max_points}
        </span>
      </div>
    )
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <span className={isEmpty ? 'grayscale opacity-50' : ''}>❤️</span>
          <span className="font-semibold" style={{ color: 'var(--text)' }}>
            Daily Points
          </span>
        </div>
        <span
          className="font-mono font-bold"
          style={{ color: isEmpty ? 'var(--text3)' : 'var(--red)' }}
        >
          {streak.current_points}/{streak.max_points}
        </span>
      </div>

      {/* Point dots — Duolingo-style */}
      <div className="flex gap-1 flex-wrap">
        {Array.from({ length: streak.max_points }).map((_, i) => (
          <div
            key={i}
            className="w-3 h-3 rounded-full transition-all duration-300"
            style={{
              background: i < streak.current_points
                ? '#f8706a'
                : 'var(--bg3)',
              border: `1px solid ${i < streak.current_points ? '#f8706a' : 'var(--border2)'}`,
              transform: i < streak.current_points ? 'scale(1)' : 'scale(0.8)',
            }}
          />
        ))}
      </div>
    </div>
  )
}