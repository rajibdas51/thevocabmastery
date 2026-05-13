'use client'
/**
 * FILE: src/components/streak/ActivityCalendar.tsx
 * GitHub-style heatmap. Shows 3 months of daily activity.
 * Used on: dashboard, profile/streak page.
 */
import { useEffect, useState } from 'react'
import { getActivityCalendar } from '@/lib/streak'
import { useAuthStore } from '@/store/auth'
import { cn } from '@/lib/utils'

interface DayData { date: string; xp: number; count: number }

function getColor(xp: number): string {
  if (xp === 0)    return 'var(--bg3)'
  if (xp < 20)     return 'rgba(124,106,247,0.25)'
  if (xp < 50)     return 'rgba(124,106,247,0.45)'
  if (xp < 100)    return 'rgba(124,106,247,0.70)'
  return 'rgba(124,106,247,0.95)'
}

function getLast90Days(): string[] {
  const days: string[] = []
  for (let i = 89; i >= 0; i--) {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() - i)
    days.push(d.toISOString().split('T')[0])
  }
  return days
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAY_LABELS  = ['','M','','W','','F','']

export default function ActivityCalendar() {
  const { profile }   = useAuthStore()
  const [data, setData] = useState<DayData[]>([])
  const [tooltip, setTooltip] = useState<{ date: string; xp: number; count: number } | null>(null)

  useEffect(() => {
    if (!profile) return
    getActivityCalendar(profile.id, 3).then(setData)
  }, [profile])

  const days = getLast90Days()
  const dataMap = new Map(data.map(d => [d.date, d]))

  // Build grid: 13 weeks × 7 days
  const weeks: string[][] = []
  let week: string[] = []
  // Pad start so first day aligns to correct weekday
  const firstDay = new Date(days[0] + 'T00:00:00Z').getUTCDay()  // 0=Sun
  for (let i = 0; i < firstDay; i++) week.push('')
  for (const day of days) {
    week.push(day)
    if (week.length === 7) { weeks.push(week); week = [] }
  }
  if (week.length) {
    while (week.length < 7) week.push('')
    weeks.push(week)
  }

  // Month labels: find first occurrence of each month in weeks
  const monthLabels: { col: number; month: string }[] = []
  let lastMonth = -1
  weeks.forEach((w, wi) => {
    const first = w.find(d => d !== '')
    if (first) {
      const m = new Date(first + 'T00:00:00Z').getUTCMonth()
      if (m !== lastMonth) {
        monthLabels.push({ col: wi, month: MONTH_NAMES[m] })
        lastMonth = m
      }
    }
  })

  const totalXp    = data.reduce((sum, d) => sum + d.xp, 0)
  const activeDays = data.filter(d => d.xp > 0).length

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
          Activity Calendar
        </p>
        <div className="flex gap-4 text-xs" style={{ color: 'var(--text3)' }}>
          <span>{activeDays} active days</span>
          <span>{totalXp.toLocaleString()} XP earned</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div style={{ minWidth: `${weeks.length * 14}px` }}>
          {/* Month labels */}
          <div className="flex mb-1" style={{ marginLeft: '20px' }}>
            {weeks.map((_, wi) => {
              const ml = monthLabels.find(m => m.col === wi)
              return (
                <div key={wi} className="w-[14px] flex-shrink-0 text-[9px]"
                  style={{ color: 'var(--text3)', fontWeight: ml ? 600 : 400 }}>
                  {ml?.month ?? ''}
                </div>
              )
            })}
          </div>

          <div className="flex gap-0">
            {/* Day-of-week labels */}
            <div className="flex flex-col mr-1" style={{ gap: '2px' }}>
              {DAY_LABELS.map((l, i) => (
                <div key={i} className="h-[12px] text-[9px] w-[18px] leading-[12px]"
                  style={{ color: 'var(--text3)' }}>
                  {l}
                </div>
              ))}
            </div>

            {/* Grid */}
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col" style={{ gap: '2px' }}>
                {week.map((date, di) => {
                  const d = date ? dataMap.get(date) : null
                  const xp = d?.xp ?? 0
                  const count = d?.count ?? 0
                  const isToday = date === new Date().toISOString().split('T')[0]

                  return (
                    <div
                      key={di}
                      className="w-[12px] h-[12px] rounded-[2px] cursor-pointer transition-transform hover:scale-125 relative"
                      style={{
                        background:  date ? getColor(xp) : 'transparent',
                        border:      isToday ? '1px solid var(--accent)' : '1px solid transparent',
                        flexShrink:  0,
                      }}
                      onMouseEnter={() => date && setTooltip({ date, xp, count })}
                      onMouseLeave={() => setTooltip(null)}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div className="mt-2 text-xs px-2 py-1 rounded-lg inline-block"
          style={{ background: 'var(--bg4)', color: 'var(--text2)', border: '1px solid var(--border2)' }}>
          {tooltip.date}
          {tooltip.xp > 0
            ? ` — ${tooltip.xp} XP · ${tooltip.count} activities`
            : ' — No activity'}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-2 mt-3">
        <span className="text-[10px]" style={{ color: 'var(--text3)' }}>Less</span>
        {[0, 15, 40, 80, 120].map(xp => (
          <div key={xp} className="w-3 h-3 rounded-sm"
            style={{ background: getColor(xp), border: '1px solid var(--border)' }} />
        ))}
        <span className="text-[10px]" style={{ color: 'var(--text3)' }}>More</span>
      </div>
    </div>
  )
}