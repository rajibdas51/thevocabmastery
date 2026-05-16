'use client'
import { useEffect, useState } from 'react'
import { getDashboardStats } from '@/lib/db'
import { useAuthStore } from '@/store/auth'
import { useStreakStore } from '@/store/streak'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import StreakWidget from '@/components/streak/StreakWidget'
import XpBar from '@/components/streak/XpBar'
import PointsBar from '@/components/streak/PointsBar'
import ActivityCalendar from '@/components/streak/ActivityCalendar'
import WordOfDayCard from '@/components/dashboard/WordOfDayCard'
import StatCard from '@/components/dashboard/StatCard'
import Link from 'next/link'
import type { DashboardStats } from '@/types'
import { BookOpen, PenSquare, Zap, PenLine, Trophy, Crown } from 'lucide-react'
import { isPremiumPlan } from '@/lib/streak'

export default function DashboardPage() {
  const { profile }         = useAuthStore()
  const { streak, status }  = useStreakStore()
  const [stats, setStats]   = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    getDashboardStats(profile.id).then(({ data }) => {
      setStats(data)
      setLoading(false)
    })
  }, [profile])

  const isPremium   = streak ? isPremiumPlan(streak.subscription_plan) : false
  const streakDays  = streak?.current_streak ?? 0
  const isDanger    = status?.isDanger
  const isActive    = status?.isActive

  return (
    <div className="animate-fade-up">
      <PageHeader
        title={`Welcome back${profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}! 👋`}
        subtitle={
          isActive
            ? `Streak safe today 🔥 Keep the momentum going!`
            : isDanger
            ? `⚠️ Complete a lesson to keep your ${streakDays}-day streak alive!`
            : `Start today's lesson to keep your streak alive.`
        }
      />

      <div className="p-4 sm:p-8 space-y-6">

        {/* Streak danger banner */}
        {isDanger && streakDays > 0 && (
          <div className="p-4 rounded-2xl border animate-pulse-soft flex items-center justify-between gap-4 flex-wrap"
            style={{ background: 'rgba(248,112,106,0.08)', borderColor: 'rgba(248,112,106,0.35)' }}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="font-bold text-sm" style={{ color: '#f8706a' }}>
                  Your {streakDays}-day streak is in danger!
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text2)' }}>
                  Complete any lesson before midnight to save it.
                </p>
              </div>
            </div>
            <Link href="/quiz">
              <Button size="sm" style={{ background: '#f8706a', border: 'none' } as any}>
                Save My Streak 🔥
              </Button>
            </Link>
          </div>
        )}

        {/* Upgrade banner for free users with low points */}
        {!isPremium && streak && streak.current_points <= 3 && (
          <div className="p-4 rounded-2xl border flex items-center justify-between gap-4 flex-wrap"
            style={{ background: 'rgba(124,106,247,0.06)', borderColor: 'rgba(124,106,247,0.25)' }}>
            <div className="flex items-center gap-3">
              <Crown className="w-6 h-6 flex-shrink-0" style={{ color: 'var(--accent2)' }} />
              <div>
                <p className="font-bold text-sm" style={{ color: 'var(--text)' }}>
                  {streak.current_points === 0 ? 'No points left today!' : `Only ${streak.current_points} points remaining!`}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text2)' }}>
                  Upgrade to Premium for unlimited daily points — from ৳100/month.
                </p>
              </div>
            </div>
            <Link href="/premium">
              <Button size="sm" variant="primary">
                <Crown className="w-3.5 h-3.5" /> Go Premium
              </Button>
            </Link>
          </div>
        )}

        {/* Row 1: Streak + Points + XP */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StreakWidget variant="full" />
          <Card className="p-5 space-y-4">
            <PointsBar />
            {!isPremium && (
              <Link href="/premium" className="block">
                <div className="text-xs text-center py-1.5 px-3 rounded-lg font-semibold transition-all hover:opacity-80"
                  style={{ background: 'var(--accent)' + '15', color: 'var(--accent2)', border: '1px solid var(--accent)' + '30' }}>
                  ⚡ Get Unlimited Points
                </div>
              </Link>
            )}
          </Card>
          <Card className="p-5">
            <XpBar />
          </Card>
        </div>

        {/* Row 2: Stats */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Array(4).fill(0).map((_,i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Words Learned"  value={stats?.words_learned ?? 0}  icon="📖" accent="#7c6af7" />
            <StatCard label="Quizzes Taken"  value={stats?.tests_taken ?? 0}    icon="✏️" accent="#22d3a0" />
            <StatCard label="Avg Score"      value={`${stats?.avg_score ?? 0}%`} icon="🎯" accent="#f5c842" />
            <StatCard label="Day Streak"     value={streakDays}                  icon="🔥" accent="#fb923c" />
          </div>
        )}

        {/* Row 3: Quick actions */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text3)' }}>
            Quick Start
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { href:'/quiz',         label:'Take Quiz',          icon:<PenSquare className="w-5 h-5"/>,  color:'var(--accent)',  desc:'Test knowledge' },
              { href:'/flashcards',   label:'Flashcards',         icon:<BookOpen className="w-5 h-5"/>,   color:'#22d3a0',       desc:'Review words' },
              { href:'/fill-blank',   label:'Fill in Blank',      icon:<PenLine className="w-5 h-5"/>,    color:'#f5c842',       desc:'Sentence quiz' },
              { href:'/live-mcq',     label:'Live MCQ',           icon:<Zap className="w-5 h-5"/>,        color:'#f8706a',       desc:'Compete live' },
            ].map(a => (
              <Link key={a.href} href={a.href}>
                <div className="p-4 rounded-xl border transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg cursor-pointer"
                  style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                    style={{ background: a.color + '18', color: a.color }}>
                    {a.icon}
                  </div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{a.label}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--text3)' }}>{a.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Row 4: Activity calendar */}
        <Card className="p-5">
          <ActivityCalendar />
        </Card>

        {/* Row 5: Word of the day + upcoming exams */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {stats?.word_of_day && <WordOfDayCard wotd={stats.word_of_day} />}
          {(stats?.upcoming_exams?.length ?? 0) > 0 && (
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-4 h-4" style={{ color: '#f5c842' }} />
                <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Upcoming Exams</p>
              </div>
              <div className="space-y-3">
                {stats!.upcoming_exams.map(exam => (
                  <div key={exam.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{exam.title}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>
                        {new Date(exam.scheduled_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Link href="/live-mcq">
                      <Button size="sm" variant="secondary">Join</Button>
                    </Link>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

      </div>
    </div>
  )
}
