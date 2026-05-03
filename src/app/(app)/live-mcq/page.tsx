'use client'
import { useState, useEffect, useRef } from 'react'
import { getLiveExams, registerForExam, submitExamResult, getExamLeaderboard } from '@/lib/db'
import { useAuthStore } from '@/store/auth'
import { useToast } from '@/components/ui/Toast'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import ProgressBar from '@/components/ui/Progressbar'
import { formatDate, formatTime, formatRelativeTime, getInitials } from '@/lib/utils'
import type { LiveExam, ExamResult, ExamQuestion } from '@/types'
import { cn } from '@/lib/utils'
import { Trophy, Clock, Users, ArrowLeft, Zap } from 'lucide-react'

type View = 'list' | 'exam' | 'leaderboard'

export default function LiveMCQPage() {
  const { profile } = useAuthStore()
  const { add: toast } = useToast()
  const [view, setView] = useState<View>('list')
  const [exams, setExams] = useState<LiveExam[]>([])
  const [loading, setLoading] = useState(true)
  const [activeExam, setActiveExam] = useState<LiveExam | null>(null)
  const [questions, setQuestions] = useState<ExamQuestion[]>([])
  const [qIdx, setQIdx] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [showAns, setShowAns] = useState(false)
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [leaderboard, setLeaderboard] = useState<ExamResult[]>([])
  const [registering, setRegistering] = useState<string | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

    const finishExam = async () => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (!profile || !activeExam) { setView('leaderboard'); return }

    await submitExamResult({
      exam_id: activeExam.id,
      user_id: profile.id,
      score,
      total_questions: questions.length,
      percentage: Math.round((score / questions.length) * 100),
      time_taken_seconds: elapsed,
      answers: null,
    })

    const { data } = await getExamLeaderboard(activeExam.id)
    setLeaderboard(data ?? [])
    setView('leaderboard')
  }
  useEffect(() => {
    getLiveExams().then(({ data }) => {
      setExams(data ?? [])
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (view === 'exam' && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) { clearInterval(timerRef.current!); finishExam(); return 0 }
          return t - 1
        })
        setElapsed(e => e + 1)
      }, 1000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [view])

  const handleRegister = async (exam: LiveExam) => {
    if (!profile) return
    setRegistering(exam.id)
    await registerForExam(exam.id, profile.id)
    setExams(prev => prev.map(e => e.id === exam.id ? { ...e, registration: { exam_id: e.id, user_id: profile.id, registered_at: new Date().toISOString() } } : e))
    toast('Registered! You can now enter the exam.', 'success')
    setRegistering(null)
  }

  const enterExam = (exam: LiveExam) => {
    if (!exam.questions?.length) {
      toast('Exam questions not ready yet', 'error'); return
    }
    setActiveExam(exam)
    setQuestions(exam.questions)
    setQIdx(0); setPicked(null); setShowAns(false); setScore(0)
    setTimeLeft(exam.duration_minutes * 60); setElapsed(0)
    setView('exam')
  }

  const pickAns = (optText: string) => {
    if (picked) return
    setPicked(optText)
    setShowAns(true)
    const q = questions[qIdx]
    const correct = q.options.find(o => o.is_correct)?.text
    if (optText === correct) setScore(s => s + 1)
  }

  const nextQ = () => {
    setPicked(null); setShowAns(false)
    if (qIdx + 1 >= questions.length) { finishExam(); return }
    setQIdx(i => i + 1)
  }



  const viewLeaderboard = async (exam: LiveExam) => {
    setActiveExam(exam)
    const { data } = await getExamLeaderboard(exam.id)
    setLeaderboard(data ?? [])
    setView('leaderboard')
  }

  // ── LIST ──
  if (view === 'list') return (
    <div className="animate-fade-up">
      <PageHeader
        title="Live MCQ Exams"
        subtitle="Join scheduled vocabulary exams and compete on the leaderboard"
        action={profile?.role === 'admin' ? (
          <Button onClick={() => toast('Create exam in Admin Panel', 'info')}>+ Create Exam</Button>
        ) : undefined}
      />
      <div className="p-8 max-w-2xl space-y-4">
        {loading ? (
          Array(3).fill(0).map((_, i) => <div key={i} className="skeleton h-40 rounded-2xl" />)
        ) : exams.length === 0 ? (
          <div className="text-center py-20 text-[#5a5a72]">
            <Zap className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No exams scheduled yet</p>
          </div>
        ) : (
          exams.map(exam => {
            const upcoming = exam.status === 'upcoming' || exam.status === 'live'
            const d = new Date(exam.scheduled_at)
            return (
              <Card key={exam.id} className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {exam.status === 'live' ? (
                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400 live-dot" />
                          LIVE NOW
                        </span>
                      ) : upcoming ? (
                        <Badge variant="purple">UPCOMING</Badge>
                      ) : (
                        <Badge variant="blue">COMPLETED</Badge>
                      )}
                    </div>
                    <h3 className="font-playfair text-xl font-bold">{exam.title}</h3>
                    {exam.description && <p className="text-sm text-[#9090a8] mt-1">{exam.description}</p>}
                    <div className="flex items-center gap-4 mt-3 text-xs text-[#5a5a72]">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{exam.duration_minutes} min</span>
                      <span>❓ {exam.question_count} questions</span>
                      <span>📅 {formatDate(exam.scheduled_at)} {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {upcoming && !exam.registration && (
                      <Button
                        size="sm"
                        loading={registering === exam.id}
                        onClick={() => handleRegister(exam)}
                      >
                        Register
                      </Button>
                    )}
                    {upcoming && exam.registration && (
                      <Button size="sm" onClick={() => enterExam(exam)}>
                        Enter Exam →
                      </Button>
                    )}
                    {!upcoming && (
                      <Button variant="secondary" size="sm" onClick={() => viewLeaderboard(exam)}>
                        <Trophy className="w-3.5 h-3.5" />
                        Leaderboard
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )

  // ── EXAM ──
  if (view === 'exam' && activeExam) {
    const q = questions[qIdx]
    const correctText = q?.options.find(o => o.is_correct)?.text
    const pct = timeLeft / (activeExam.duration_minutes * 60) * 100
    return (
      <div className="animate-fade-up">
        <div className="flex items-start justify-between px-8 pt-8 pb-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 live-dot" />LIVE
              </span>
            </div>
            <h1 className="font-playfair text-xl font-black">{activeExam.title}</h1>
          </div>
          <div className="text-right">
            <div className={cn(
              'font-mono text-3xl font-black',
              timeLeft < 60 ? 'text-red-400' : 'text-[#a78bfa]'
            )}>
              {formatTime(timeLeft)}
            </div>
            <p className="text-xs text-[#5a5a72]">{qIdx + 1}/{questions.length}</p>
          </div>
        </div>

        <div className="p-8 max-w-2xl">
          <ProgressBar value={pct} color={timeLeft < 60 ? '#f8706a' : '#7c6af7'} className="mb-6" />

          <Card className="p-7">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#5a5a72] mb-2">Question {qIdx + 1}</p>
            <h2 className="font-playfair text-4xl font-black">`{q?.word}`</h2>
            <div className="grid grid-cols-2 gap-3 mt-7">
              {q?.options.map(opt => (
                <button
                  key={opt.text}
                  onClick={() => pickAns(opt.text)}
                  className={cn(
                    'p-4 rounded-xl text-left text-sm font-medium border transition-all',
                    !showAns && 'bg-[#1a1a26] border-white/10 hover:border-[#7c6af7]/50',
                    showAns && opt.is_correct && 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300',
                    showAns && opt.text === picked && !opt.is_correct && 'bg-red-500/10 border-red-500/40 text-red-300',
                    showAns && !opt.is_correct && opt.text !== picked && 'opacity-40 bg-[#1a1a26] border-white/10',
                  )}
                >
                  {opt.text}
                </button>
              ))}
            </div>
            {showAns && (
              <Button className="w-full mt-6" size="lg" onClick={nextQ}>
                {qIdx + 1 < questions.length ? 'Next →' : 'Finish & Submit →'}
              </Button>
            )}
          </Card>
        </div>
      </div>
    )
  }

  // ── LEADERBOARD ──
  if (view === 'leaderboard') {
    const myResult = leaderboard.find(r => r.user_id === profile?.id)
    return (
      <div className="animate-fade-up">
        <div className="flex items-center gap-4 px-8 pt-8 pb-0">
          <Button variant="secondary" size="sm" onClick={() => setView('list')}>
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </Button>
          <div>
            <h1 className="font-playfair text-2xl font-black flex items-center gap-2">
              <Trophy className="w-6 h-6 text-[#f5c842]" />
              Leaderboard
            </h1>
            <p className="text-sm text-[#9090a8] mt-0.5">{activeExam?.title}</p>
          </div>
        </div>

        <div className="p-8 max-w-xl">
          {myResult && (
            <Card accent="#7c6af7" className="p-5 mb-5">
              <p className="text-xs font-bold uppercase tracking-widest text-[#a78bfa] mb-2">Your Result</p>
              <div className="flex items-center gap-4">
                <div className="text-3xl font-playfair font-black text-[#a78bfa]">{myResult.score}/{myResult.total_questions}</div>
                <div>
                  <p className="font-semibold">{myResult.percentage.toFixed(0)}%</p>
                  <p className="text-xs text-[#5a5a72]">Rank #{myResult.rank ?? '—'} · {formatTime(myResult.time_taken_seconds ?? 0)}</p>
                </div>
              </div>
            </Card>
          )}

          <Card className="overflow-hidden">
            <div className="p-4 border-b border-white/[0.06]">
              <p className="text-sm font-semibold">Top Performers</p>
            </div>
            {leaderboard.length === 0 ? (
              <div className="p-8 text-center text-[#5a5a72] text-sm">No results yet</div>
            ) : (
              leaderboard.map((r, i) => {
                const rankEmoji = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null
                const isMe = r.user_id === profile?.id
                return (
                  <div
                    key={r.id}
                    className={cn(
                      'flex items-center gap-4 px-5 py-3.5 border-b border-white/[0.04] last:border-0',
                      isMe && 'bg-[#7c6af7]/5'
                    )}
                  >
                    <div className="w-8 text-center">
                      {rankEmoji ? (
                        <span className="text-xl">{rankEmoji}</span>
                      ) : (
                        <span className="font-mono text-sm text-[#5a5a72]">{i + 1}</span>
                      )}
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7c6af7] to-[#60a5fa] flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {getInitials(r.profile?.full_name)}
                    </div>
                    <div className="flex-1">
                      <p className={cn('font-semibold text-sm', isMe && 'text-[#a78bfa]')}>
                        {r.profile?.full_name ?? 'Unknown'} {isMe && '(You)'}
                      </p>
                      <p className="text-xs text-[#5a5a72]">Finished in {formatTime(r.time_taken_seconds ?? 0)}</p>
                    </div>
                    <div className="font-mono font-bold text-[#a78bfa]">{r.score}</div>
                  </div>
                )
              })
            )}
          </Card>
        </div>
      </div>
    )
  }

  return null
}