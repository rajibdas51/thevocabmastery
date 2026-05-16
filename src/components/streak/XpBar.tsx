'use client'
/**
 * FILE: src/components/streak/XpBar.tsx
 * Shows total XP, weekly XP, league badge, and progress to next league.
 */
import { useStreakStore } from '@/store/streak'
import { LEAGUE_CONFIG } from '@/types/streak'
import { cn } from '@/lib/utils'

interface XpBarProps { compact?: boolean; className?: string }

export default function XpBar({ compact, className }: XpBarProps) {
  const { streak, status } = useStreakStore()
  if (!streak) return null

  const leagueCfg  = LEAGUE_CONFIG[streak.league]
  const nextLeague = status?.nextLeague
  const nextCfg    = nextLeague ? LEAGUE_CONFIG[nextLeague] : null
  const xpToNext   = status?.xpToNextLeague ?? 0
  const pct        = nextCfg
    ? Math.round(((streak.weekly_xp - leagueCfg.min_weekly_xp) /
        Math.max(1, nextCfg.min_weekly_xp - leagueCfg.min_weekly_xp)) * 100)
    : 100

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <span className="text-base" title={leagueCfg.label}>{leagueCfg.icon}</span>
        <span className="text-xs font-bold font-mono" style={{ color: leagueCfg.color }}>
          {streak.total_xp.toLocaleString()} XP
        </span>
      </div>
    )
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* League badge + XP */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{leagueCfg.icon}</span>
          <div>
            <p className="text-sm font-bold" style={{ color: leagueCfg.color }}>
              {leagueCfg.label} League
            </p>
            <p className="text-[10px]" style={{ color: 'var(--text3)' }}>
              {streak.weekly_xp} XP this week
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-playfair font-black" style={{ color: 'var(--text)' }}>
            {streak.total_xp.toLocaleString()}
          </p>
          <p className="text-[10px]" style={{ color: 'var(--text3)' }}>total XP</p>
        </div>
      </div>

      {/* Progress to next league */}
      {nextCfg && (
        <div>
          <div className="flex justify-between text-[10px] mb-1" style={{ color: 'var(--text3)' }}>
            <span>→ {nextCfg.label} {nextCfg.icon}</span>
            <span className="font-mono">{xpToNext} XP needed</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg3)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(100, pct)}%`,
                background: `linear-gradient(90deg, ${leagueCfg.color}, ${nextCfg.color})`,
              }}
            />
          </div>
        </div>
      )}

      {!nextCfg && (
        <div className="text-center text-xs font-semibold py-1"
          style={{ color: leagueCfg.color }}>
          💠 Maximum League Reached!
        </div>
      )}
    </div>
  )
}
