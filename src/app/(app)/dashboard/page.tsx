'use client'
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/auth'
import { getDashboardStats } from '@/lib/db'
import StatCard from '@/components/dashboard/StatCard'
import WordOfDayCard from '@/components/dashboard/WordOfDayCard'
import WordCard from '@/components/words/WordCard'
import ProgressBar from '@/components/ui/Progressbar'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { useRouter } from 'next/navigation'
import { formatDate, formatRelativeTime } from '@/lib/utils'
import type { DashboardStats } from '@/types'
import { Zap, BookOpen, TrendingUp } from 'lucide-react'

export default function DashboardPage() {
  const { profile } = useAuthStore()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    getDashboardStats(profile.id).then(({ data }) => {
      setStats(data)
      setLoading(false)
    })
  }, [profile])

  const greetingTime = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const name = profile?.full_name?.split(' ')[0] ?? 'there'
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <div className="animate-fade-up">
      {/* Header */}
      <div className="flex items-start justify-between px-8 pt-8 pb-0">
        <div>
          <h1 className="font-playfair text-2xl font-black">{greetingTime()}, {name} 👋</h1>
          <p className="text-sm text-[#9090a8] mt-1">{today}</p>
        </div>
        <Button onClick={() => router.push('/add-word')}>+ Add Word</Button>
      </div>

      <div className="p-8 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard
            label="Words Learned"
            value={loading ? '...' : (stats?.words_learned ?? 0)}
            sub="personal progress"
            icon="📚"
            accent="#7c6af7"
          />
          <StatCard
            label="Tests Taken"
            value={loading ? '...' : (profile?.tests_taken ?? 0)}
            sub={`avg: ${(profile?.avg_score ?? 0).toFixed(1)}%`}
            icon="✏️"
            accent="#22d3a0"
          />
          <StatCard
            label="Avg. Score"
            value={loading ? '...' : `${(profile?.avg_score ?? 0).toFixed(0)}%`}
            sub="across all quizzes"
            icon="📊"
            accent="#f5c842"
          />
          <StatCard
            label="Streak"
            value={loading ? '...' : `${profile?.streak_days ?? 0} days`}
            sub="keep it up! 🔥"
            icon="🔥"
            accent="#fb923c"
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Word of the Day */}
          <WordOfDayCard wotd={stats?.word_of_day ?? null} />

          {/* Category Progress */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="font-semibold text-sm">Learning Progress</p>
              <Button variant="ghost" size="sm" onClick={() => router.push('/categories')}>
                View All →
              </Button>
            </div>
            <div className="space-y-4">
              {loading
                ? Array(4).fill(0).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <div className="skeleton h-3 w-2/3" />
                      <div className="skeleton h-1.5 w-full" />
                    </div>
                  ))
                : stats?.category_progress.map(cp => (
                    <div key={cp.category.id}>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-[#9090a8]">{cp.category.name}</span>
                        <span className="text-[#5a5a72] font-mono">{cp.percentage}%</span>
                      </div>
                      <ProgressBar value={cp.percentage} color={cp.category.color} />
                    </div>
                  ))
              }
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Recent Words */}
          <div className="col-span-2">
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="font-semibold text-sm">Recently Added Words</p>
                <Button variant="ghost" size="sm" onClick={() => router.push('/words')}>
                  View All →
                </Button>
              </div>
              <div className="space-y-2.5">
                {loading
                  ? Array(4).fill(0).map((_, i) => <div key={i} className="skeleton h-14 rounded-lg" />)
                  : stats?.recent_words.map(w => (
                      <div key={w.id} className="flex items-center justify-between p-3 bg-[#1a1a26] rounded-xl">
                        <div>
                          <p className="font-semibold text-sm">{w.word}</p>
                          <p className="text-xs text-[#5a5a72] mt-0.5 line-clamp-1">{w.english_meaning}</p>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#7c6af7]/10 text-[#a78bfa] border border-[#7c6af7]/20 flex-shrink-0">
                          {formatDate(w.created_at)}
                        </span>
                      </div>
                    ))
                }
              </div>
            </Card>
          </div>

          {/* Upcoming Exams */}
          <div>
            <Card className="p-5 h-full">
              <div className="flex items-center justify-between mb-4">
                <p className="font-semibold text-sm flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-[#7c6af7]" />
                  Live Exams
                </p>
                <Button variant="ghost" size="sm" onClick={() => router.push('/live-mcq')}>
                  View →
                </Button>
              </div>
              {loading ? (
                <div className="skeleton h-24 rounded-xl" />
              ) : stats?.upcoming_exams.length === 0 ? (
                <p className="text-xs text-[#5a5a72] text-center py-6">No upcoming exams</p>
              ) : (
                <div className="space-y-3">
                  {stats?.upcoming_exams.map(exam => (
                    <div key={exam.id} className="p-3 bg-[#1a1a26] rounded-xl border border-white/[0.06]">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 live-dot" />
                        <span className="text-[10px] font-bold text-red-400">UPCOMING</span>
                      </div>
                      <p className="font-semibold text-xs">{exam.title}</p>
                      <p className="text-[11px] text-[#5a5a72] mt-1">
                        {formatRelativeTime(exam.scheduled_at)} · {exam.question_count} Qs
                      </p>
                      <Button
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => router.push('/live-mcq')}
                      >
                        Register
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: '🃏', label: 'Flashcards', sub: 'Flip & Learn', href: '/flashcards', color: '#7c6af7' },
            { icon: '✏️', label: 'Take Quiz', sub: 'Test your knowledge', href: '/quiz', color: '#22d3a0' },
            { icon: '✍️', label: 'Focus Writing', sub: 'Essay topics & answers', href: '/focus-writing', color: '#f5c842' },
          ].map(a => (
            <Card
              key={a.label}
              hover
              onClick={() => router.push(a.href)}
              accent={a.color}
              className="p-5"
            >
              <span className="text-2xl">{a.icon}</span>
              <p className="font-semibold mt-2.5">{a.label}</p>
              <p className="text-xs text-[#5a5a72] mt-0.5">{a.sub}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}