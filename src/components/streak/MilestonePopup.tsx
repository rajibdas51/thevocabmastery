'use client'
/**
 * FILE: src/components/streak/MilestonePopup.tsx
 * Shown after a milestone is unlocked. Pops up automatically.
 * Queue is managed in streakStore.pendingMilestones.
 */
import { useStreakStore } from '@/store/streak'
import { MILESTONE_MAP } from '@/types/streak'
import Button from '@/components/ui/Button'
import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'

export default function MilestonePopup() {
  const { pendingMilestones, dismissMilestone } = useStreakStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])
  if (!mounted || pendingMilestones.length === 0) return null

  const key = pendingMilestones[0]
  const def = MILESTONE_MAP[key as keyof typeof MILESTONE_MAP]
  if (!def) { dismissMilestone(key); return null }

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="relative w-full max-w-sm text-center rounded-3xl p-8 animate-fade-up"
        style={{
          background:  `linear-gradient(135deg, ${def.badge_color}18, var(--card-bg))`,
          border:      `2px solid ${def.badge_color}50`,
          boxShadow:   `0 0 60px ${def.badge_color}25`,
        }}
      >
        {/* Confetti-like background circles */}
        <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full opacity-20"
              style={{
                background: def.badge_color,
                left:  `${10 + i * 11}%`,
                top:   `${5  + (i % 3) * 30}%`,
                transform: `scale(${0.5 + Math.random()})`,
              }}
            />
          ))}
        </div>

        {/* Badge */}
        <div
          className="w-24 h-24 rounded-full mx-auto flex items-center justify-center text-5xl mb-4 relative"
          style={{
            background:  `radial-gradient(circle, ${def.badge_color}30, ${def.badge_color}10)`,
            border:      `3px solid ${def.badge_color}60`,
            boxShadow:   `0 0 30px ${def.badge_color}30`,
          }}
        >
          {def.icon}
          {/* Pulse ring */}
          <div
            className="absolute inset-0 rounded-full animate-ping opacity-20"
            style={{ border: `2px solid ${def.badge_color}` }}
          />
        </div>

        <p className="text-xs font-bold uppercase tracking-widest mb-1"
          style={{ color: def.badge_color }}>
          Achievement Unlocked!
        </p>
        <h2 className="font-playfair text-2xl font-black mb-1" style={{ color: 'var(--text)' }}>
          {def.label}
        </h2>
        <p className="text-sm mb-5" style={{ color: 'var(--text2)' }}>
          {def.description}
        </p>

        {/* Rewards */}
        <div className="flex justify-center gap-3 mb-6">
          {def.xp_reward > 0 && (
            <div className="px-3 py-2 rounded-xl text-xs font-bold"
              style={{ background: 'var(--accent)' + '18', color: 'var(--accent2)', border: '1px solid var(--accent)' + '30' }}>
              +{def.xp_reward} XP
            </div>
          )}
          {def.freeze_reward > 0 && (
            <div className="px-3 py-2 rounded-xl text-xs font-bold"
              style={{ background: '#60a5fa18', color: '#60a5fa', border: '1px solid #60a5fa30' }}>
              🧊 +{def.freeze_reward} Freeze{def.freeze_reward > 1 ? 's' : ''}
            </div>
          )}
        </div>

        <Button
          className="w-full"
          size="lg"
          onClick={() => dismissMilestone(key)}
          style={{ background: def.badge_color, border: 'none' } as any}
        >
          Awesome! 🎉
        </Button>

        {pendingMilestones.length > 1 && (
          <p className="text-xs mt-2" style={{ color: 'var(--text3)' }}>
            +{pendingMilestones.length - 1} more achievement{pendingMilestones.length > 2 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}