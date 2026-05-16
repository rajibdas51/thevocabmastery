'use client'
/**
 * FILE: src/components/streak/StreakWidget.tsx
 *
 * Shows the flame streak counter.
 * Variants: 'full' for dashboard, 'compact' for sidebar/header.
 */
import { cn } from '@/lib/utils'
import { useStreakStore } from '@/store/streak'

interface StreakWidgetProps {
  variant?: 'full' | 'compact'
  className?: string
}

export default function StreakWidget({ variant = 'compact', className }: StreakWidgetProps) {
  const { streak, status } = useStreakStore()
  if (!streak) return null

  const isActive  = status?.isActive
  const isDanger  = status?.isDanger
  const isFrozen  = streak.streak_frozen_today
  const noStreak  = streak.current_streak === 0

  // Flame color based on state
  const flameColor = noStreak
    ? '#5a5a72'
    : isDanger
    ? '#f8706a'
    : isFrozen
    ? '#60a5fa'
    : isActive
    ? '#fb923c'
    : '#f5c842'

  const flameEmoji = isFrozen ? '🧊' : '🔥'

  if (variant === 'compact') {
    return (
      <div
        className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border', className)}
        style={{
          background:  flameColor + '12',
          borderColor: flameColor + '35',
        }}
        title={`${streak.current_streak} day streak`}
      >
        <span className={cn('text-base leading-none', noStreak && 'grayscale opacity-40')}>
          {flameEmoji}
        </span>
        <span
          className="text-sm font-black font-mono"
          style={{ color: noStreak ? 'var(--text3)' : flameColor }}
        >
          {streak.current_streak}
        </span>
      </div>
    )
  }

  // Full variant
  return (
    <div
      className={cn('p-5 rounded-2xl border text-center relative overflow-hidden', className)}
      style={{
        background:  `linear-gradient(135deg, ${flameColor}10, ${flameColor}05)`,
        borderColor: flameColor + '30',
      }}
    >
      {/* Background glow */}
      <div
        className="absolute -top-4 left-1/2 -translate-x-1/2 w-24 h-24 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ background: flameColor }}
      />

      <div className="text-5xl mb-2 relative">
        {flameEmoji}
        {isDanger && (
          <span className="absolute -top-1 -right-1 text-xs bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center font-black">
            !
          </span>
        )}
      </div>

      <div
        className="font-playfair text-4xl font-black relative"
        style={{ color: noStreak ? 'var(--text3)' : flameColor }}
      >
        {streak.current_streak}
      </div>

      <p className="text-xs mt-1 font-semibold" style={{ color: 'var(--text3)' }}>
        {noStreak ? 'Start your streak!' : `day streak`}
      </p>

      {/* State messages */}
      {isActive && !noStreak && (
        <div className="mt-3 text-[11px] px-2.5 py-1 rounded-full inline-block font-semibold"
          style={{ background: '#22d3a012', color: '#22d3a0', border: '1px solid #22d3a030' }}>
          ✓ Streak safe today
        </div>
      )}
      {isDanger && (
        <div className="mt-3 text-[11px] px-2.5 py-1 rounded-full inline-block font-semibold animate-pulse"
          style={{ background: '#f8706a12', color: '#f8706a', border: '1px solid #f8706a30' }}>
          ⚠ Complete a lesson!
        </div>
      )}
      {isFrozen && (
        <div className="mt-3 text-[11px] px-2.5 py-1 rounded-full inline-block font-semibold"
          style={{ background: '#60a5fa12', color: '#60a5fa', border: '1px solid #60a5fa30' }}>
          🧊 Streak frozen today
        </div>
      )}

      {/* Longest streak */}
      {streak.longest_streak > 0 && (
        <p className="text-[10px] mt-3" style={{ color: 'var(--text3)' }}>
          Best: {streak.longest_streak} days
        </p>
      )}

      {/* Freezes available */}
      {streak.freeze_count > 0 && (
        <p className="text-[10px] mt-1" style={{ color: '#60a5fa' }}>
          🧊 {streak.freeze_count} freeze{streak.freeze_count !== 1 ? 's' : ''} available
        </p>
      )}
    </div>
  )
}
