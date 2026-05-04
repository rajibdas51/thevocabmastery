'use client'
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/auth'
import { getDashboardStats } from '@/lib/db'
import StatCard from '@/components/dashboard/StatCard'
import WordOfDayCard from '@/components/dashboard/WordOfDayCard'
import ProgressBar from '@/components/ui/Progressbar'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { useRouter } from 'next/navigation'
import { formatDate, formatRelativeTime } from '@/lib/utils'
import type { DashboardStats } from '@/types'
import { Zap } from 'lucide-react'

export default function DashboardPage() {
  const { profile } = useAuthStore()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    getDashboardStats(profile.id).then(({ data }) => { setStats(data); setLoading(false) })
  }, [profile])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const name = profile?.full_name?.split(' ')[0] ?? 'there'
  const today = new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' })

  return (
    <div className="animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 px-4 sm:px-8 pt-6 sm:pt-8 pb-0">
        <div>
          <h1 className="font-playfair text-xl sm:text-2xl font-black text-[var(--text)]">{greeting}, {name} 👋</h1>
          <p className="text-sm text-[var(--text2)] mt-1">{today}</p>
        </div>
        <Button onClick={() => router.push('/add-word')} className="w-full sm:w-auto">+ Add Word</Button>
      </div>

      <div className="p-4 sm:p-8 space-y-5 sm:space-y-6">
        {/* Stats - 2x2 on mobile, 4 cols on desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard label="Words Learned" value={loading?'…':(stats?.words_learned??0)} sub="personal progress" icon="📚" accent="var(--accent)" />
          <StatCard label="Tests Taken" value={loading?'…':(profile?.tests_taken??0)} sub={`avg: ${(profile?.avg_score??0).toFixed(0)}%`} icon="✏️" accent="var(--green)" />
          <StatCard label="Avg. Score" value={loading?'…':`${(profile?.avg_score??0).toFixed(0)}%`} sub="across all quizzes" icon="📊" accent="var(--gold)" />
          <StatCard label="Streak" value={loading?'…':`${profile?.streak_days??0}d`} sub="keep it up! 🔥" icon="🔥" accent="var(--orange)" />
        </div>

        {/* WOTD + Progress - stacked on mobile */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <WordOfDayCard wotd={stats?.word_of_day ?? null} />
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="font-semibold text-sm text-[var(--text)]">Learning Progress</p>
              <Button variant="ghost" size="sm" onClick={() => router.push('/categories')}>View All →</Button>
            </div>
            <div className="space-y-4">
              {loading ? Array(4).fill(0).map((_,i) => <div key={i}><div className="skeleton h-3 w-2/3 mb-2"/><div className="skeleton h-1.5 w-full"/></div>)
                : stats?.category_progress.map(cp => (
                  <div key={cp.category.id}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-[var(--text2)] truncate mr-2">{cp.category.name}</span>
                      <span className="text-[var(--text3)] font-mono flex-shrink-0">{cp.percentage}%</span>
                    </div>
                    <ProgressBar value={cp.percentage} color={cp.category.color} />
                  </div>
                ))
              }
            </div>
          </Card>
        </div>

        {/* Recent + Exams - stacked on mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2">
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="font-semibold text-sm text-[var(--text)]">Recently Added Words</p>
                <Button variant="ghost" size="sm" onClick={() => router.push('/words')}>View All →</Button>
              </div>
              <div className="space-y-2.5">
                {loading ? Array(4).fill(0).map((_,i) => <div key={i} className="skeleton h-14 rounded-xl"/>)
                  : stats?.recent_words.map(w => (
                    <div key={w.id} className="flex items-center justify-between p-3 bg-[var(--bg3)] rounded-xl gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-[var(--text)]">{w.word}</p>
                        <p className="text-xs text-[var(--text3)] mt-0.5 line-clamp-1">{w.english_meaning}</p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent2)] border border-[var(--accent)]/20 flex-shrink-0 hidden sm:block">
                        {formatDate(w.created_at)}
                      </span>
                    </div>
                  ))
                }
              </div>
            </Card>
          </div>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="font-semibold text-sm text-[var(--text)] flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-[var(--accent)]"/>Live Exams
              </p>
              <Button variant="ghost" size="sm" onClick={() => router.push('/live-mcq')}>View →</Button>
            </div>
            {loading ? <div className="skeleton h-24 rounded-xl"/>
              : stats?.upcoming_exams.length === 0
              ? <p className="text-xs text-[var(--text3)] text-center py-6">No upcoming exams</p>
              : stats?.upcoming_exams.map(exam => (
                <div key={exam.id} className="p-3 bg-[var(--bg3)] rounded-xl border border-[var(--border)] mb-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 live-dot"/>
                    <span className="text-[10px] font-bold text-red-400">UPCOMING</span>
                  </div>
                  <p className="font-semibold text-xs text-[var(--text)]">{exam.title}</p>
                  <p className="text-[11px] text-[var(--text3)] mt-1">{formatRelativeTime(exam.scheduled_at)} · {exam.question_count} Qs</p>
                  <Button size="sm" className="w-full mt-2" onClick={() => router.push('/live-mcq')}>Register</Button>
                </div>
              ))
            }
          </Card>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {[
            {icon:'🃏',label:'Flashcards',sub:'Flip & Learn',href:'/flashcards',color:'var(--accent)'},
            {icon:'✏️',label:'Take Quiz',sub:'Test your knowledge',href:'/quiz',color:'var(--green)'},
            {icon:'✍️',label:'Focus Writing',sub:'Essay topics & answers',href:'/focus-writing',color:'var(--gold)'},
          ].map(a => (
            <Card key={a.label} hover onClick={() => router.push(a.href)} accent={a.color} className="p-5">
              <span className="text-2xl">{a.icon}</span>
              <p className="font-semibold mt-2.5 text-[var(--text)]">{a.label}</p>
              <p className="text-xs text-[var(--text3)] mt-0.5">{a.sub}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}