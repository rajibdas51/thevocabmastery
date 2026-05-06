'use client'
import { useState, useEffect, useRef } from 'react'
import {
  getLiveExams, registerForExam, submitExamResult,
  getExamLeaderboard, getQuizQuestions,
} from '@/lib/db'
import { useAuthStore } from '@/store/auth'
import { useToast } from '@/components/ui/Toast'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import ProgressBar from '@/components/ui/Progressbar'
import { formatDate, formatTime, formatRelativeTime, getInitials } from '@/lib/utils'
import type { LiveExam, ExamResult, QuizQuestion } from '@/types'
import { cn } from '@/lib/utils'
import { Trophy, Clock, ArrowLeft, Zap, CheckCircle2, XCircle } from 'lucide-react'

type View = 'list' | 'exam' | 'leaderboard'

export default function LiveMCQPage() {
  const { profile }    = useAuthStore()
  const { add: toast } = useToast()

  const [view, setView]             = useState<View>('list')
  const [exams, setExams]           = useState<LiveExam[]>([])
  const [loading, setLoading]       = useState(true)
  const [activeExam, setActiveExam] = useState<LiveExam | null>(null)

  // ── Exam state ──
  const [questions, setQuestions]   = useState<QuizQuestion[]>([])
  const [qIdx, setQIdx]             = useState(0)
  const [picked, setPicked]         = useState<string | null>(null)
  const [showAns, setShowAns]       = useState(false)
  const [score, setScore]           = useState(0)
  const [timeLeft, setTimeLeft]     = useState(0)
  const [elapsed, setElapsed]       = useState(0)
  const [entering, setEntering]     = useState<string | null>(null)
  const [registering, setRegistering] = useState<string | null>(null)
  const [leaderboard, setLeaderboard] = useState<ExamResult[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    getLiveExams().then(({ data }) => { setExams(data ?? []); setLoading(false) })
  }, [])

  // Countdown while exam is running
  useEffect(() => {
    if (view !== 'exam') {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!)
          handleFinishExam()
          return 0
        }
        return t - 1
      })
      setElapsed(e => e + 1)
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [view])

  // ── Register ──────────────────────────────────────────────
  const handleRegister = async (exam: LiveExam) => {
    if (!profile) return
    setRegistering(exam.id)
    const { error } = await registerForExam(exam.id, profile.id)
    if (error && !error.includes('duplicate')) {
      toast(error, 'error'); setRegistering(null); return
    }
    setExams(prev => prev.map(e =>
      e.id === exam.id
        ? { ...e, registration: { exam_id: e.id, user_id: profile.id, registered_at: new Date().toISOString() } }
        : e
    ))
    toast('Registered! You can now enter the exam.', 'success')
    setRegistering(null)
  }

  // ── Enter exam — generate questions on-the-fly if not pre-set ──
  const enterExam = async (exam: LiveExam) => {
    setEntering(exam.id)

    let qs: QuizQuestion[] = []

    // Case 1: Admin pre-loaded questions in the DB
    if (exam.questions && exam.questions.length > 0) {
      qs = exam.questions.map((q: any) => ({
        word_id:        q.word_id ?? q.id,
        word:           q.word,
        bangla_meaning: q.bangla_meaning ?? null,
        correct_answer: q.options?.find((o: any) => o.is_correct)?.text ?? '',
        options:        q.options?.map((o: any) => o.text) ?? [],
        question_label: 'What does this word mean?',
        quiz_type:      'meaning' as const,
      }))
    }

    // Case 2: Fetch dynamically from the exam's category (or all global words)
    if (qs.length === 0) {
      const catId = exam.category_id
      if (catId) {
        const { data, error } = await getQuizQuestions(catId, exam.question_count, 'meaning')
        if (error || !data?.length) {
          toast('No words found for this exam\'s category. Ask admin to add words first.', 'error')
          setEntering(null); return
        }
        qs = data
      } else {
        // No category — pick from all global words (first category found)
        toast('This exam has no category set. Ask admin to assign a category.', 'error')
        setEntering(null); return
      }
    }

    if (qs.length === 0) {
      toast('No questions available for this exam.', 'error')
      setEntering(null); return
    }

    setActiveExam(exam)
    setQuestions(qs)
    setQIdx(0); setPicked(null); setShowAns(false); setScore(0)
    setTimeLeft(exam.duration_minutes * 60); setElapsed(0)
    setEntering(null)
    setView('exam')
  }

  // ── Answer pick ───────────────────────────────────────────
  const pickAns = (opt: string) => {
    if (picked) return
    setPicked(opt)
    setShowAns(true)
    if (opt === questions[qIdx]?.correct_answer) setScore(s => s + 1)
  }

  // ── Next question / finish ────────────────────────────────
  const nextQ = () => {
    setPicked(null); setShowAns(false)
    if (qIdx + 1 >= questions.length) { handleFinishExam(); return }
    setQIdx(i => i + 1)
  }

  // ── Finish & submit ───────────────────────────────────────
  const handleFinishExam = async () => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (!profile || !activeExam) { setView('leaderboard'); return }

    // Use current score from state (closure) or recompute
    await submitExamResult({
      exam_id:          activeExam.id,
      user_id:          profile.id,
      score,
      total_questions:  questions.length,
      percentage:       Math.round((score / (questions.length || 1)) * 100),
      time_taken_seconds: elapsed,
      answers: null,
    })

    const { data } = await getExamLeaderboard(activeExam.id)
    setLeaderboard(data ?? [])
    setView('leaderboard')
  }

  // ── View leaderboard for a completed exam ─────────────────
  const viewLeaderboard = async (exam: LiveExam) => {
    setActiveExam(exam)
    const { data } = await getExamLeaderboard(exam.id)
    setLeaderboard(data ?? [])
    setView('leaderboard')
  }

  // ══════════════════════════════════════════════════════════
  // ── LIST VIEW ────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════
  if (view === 'list') return (
    <div className="animate-fade-up">
      <PageHeader
        title="Live MCQ Exams"
        subtitle="Join scheduled vocabulary exams and compete on the leaderboard"
        action={profile?.role === 'admin' ? (
          <Button onClick={() => toast('Create exams in the Admin Panel → Live Exams tab', 'info')}>
            + Create Exam
          </Button>
        ) : undefined}
      />
      <div className="p-4 sm:p-8 max-w-2xl space-y-4">
        {loading
          ? Array(3).fill(0).map((_, i) => <div key={i} className="skeleton h-40 rounded-2xl" />)
          : exams.length === 0
            ? (
              <div className="text-center py-20 text-[var(--text3)]">
                <Zap className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-semibold">No exams scheduled yet</p>
                <p className="text-sm mt-1">Check back later or ask the admin to create one</p>
              </div>
            )
            : exams.map(exam => {
              const d        = new Date(exam.scheduled_at)
              const upcoming = exam.status === 'upcoming' || exam.status === 'live'
              const isLive   = exam.status === 'live'

              return (
                <Card key={exam.id} className="p-5 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Status badge */}
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        {isLive ? (
                          <span className="flex items-center gap-1.5 text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400 live-dot" />LIVE NOW
                          </span>
                        ) : upcoming ? (
                          <Badge variant="purple">UPCOMING</Badge>
                        ) : (
                          <Badge variant="blue">COMPLETED</Badge>
                        )}
                        {exam.registration && upcoming && (
                          <Badge variant="green">✓ Registered</Badge>
                        )}
                      </div>

                      <h3 className="font-playfair text-xl font-bold text-[var(--text)]">{exam.title}</h3>
                      {exam.description && (
                        <p className="text-sm text-[var(--text2)] mt-1">{exam.description}</p>
                      )}

                      <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-[var(--text3)]">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />{exam.duration_minutes} min
                        </span>
                        <span>❓ {exam.question_count} questions</span>
                        <span>
                          📅 {d.toLocaleDateString('en-BD', { weekday:'short', month:'short', day:'numeric' })}
                          {' '}at {d.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}
                        </span>
                        {upcoming && (
                          <span className="text-[var(--accent2)]">{formatRelativeTime(exam.scheduled_at)}</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex sm:flex-col gap-2 flex-shrink-0">
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
                        <Button
                          size="sm"
                          loading={entering === exam.id}
                          onClick={() => enterExam(exam)}
                        >
                          {entering === exam.id ? 'Loading…' : 'Enter Exam →'}
                        </Button>
                      )}
                      {!upcoming && (
                        <Button variant="secondary" size="sm" onClick={() => viewLeaderboard(exam)}>
                          <Trophy className="w-3.5 h-3.5" /> Leaderboard
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })
        }
      </div>
    </div>
  )

  // ══════════════════════════════════════════════════════════
  // ── EXAM VIEW ────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════
  if (view === 'exam' && questions.length > 0) {
    const q           = questions[qIdx]
    const timePct     = (timeLeft / ((activeExam?.duration_minutes ?? 1) * 60)) * 100
    const timeWarning = timeLeft < 60

    return (
      <div className="animate-fade-up">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-8 pt-6 sm:pt-8 pb-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 live-dot" />LIVE
              </span>
            </div>
            <h1 className="font-playfair text-xl font-black text-[var(--text)]">{activeExam?.title}</h1>
          </div>
          <div className="text-right">
            <div className={cn(
              'font-mono text-3xl font-black',
              timeWarning ? 'text-red-400' : 'text-[var(--accent2)]'
            )}>
              {formatTime(timeLeft)}
            </div>
            <p className="text-xs text-[var(--text3)]">{qIdx + 1}/{questions.length}</p>
          </div>
        </div>

        <div className="p-4 sm:p-8 max-w-2xl">
          {/* Timer bar */}
          <ProgressBar
            value={timePct}
            color={timeWarning ? 'var(--red)' : 'var(--accent)'}
            className="mb-6"
          />

          <Card className="p-5 sm:p-7">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text3)] mb-2">
              Question {qIdx + 1} of {questions.length}
            </p>
            <h2 className="font-playfair text-3xl sm:text-4xl font-black text-[var(--text)]">
              `{q?.word}`
            </h2>
            {q?.bangla_meaning && (
              <p className="text-sm mt-1" style={{ color: 'var(--gold)' }}>{q.bangla_meaning}</p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
              {q?.options.map((opt, oi) => {
                const isCorrect  = opt === q.correct_answer
                const isSelected = opt === picked
                const reveal     = showAns

                let optStyle = 'bg-[var(--bg3)] border-[var(--border2)] text-[var(--text)] hover:border-[var(--accent)]/50 hover:bg-[var(--accent)]/8'
                if (reveal && isCorrect)              optStyle = 'bg-emerald-500/15 border-emerald-500/60 text-emerald-600 dark:text-emerald-300'
                else if (reveal && isSelected)        optStyle = 'bg-red-500/15 border-red-500/60 text-red-600 dark:text-red-300'
                else if (reveal)                      optStyle = 'opacity-40 bg-[var(--bg3)] border-[var(--border)] text-[var(--text2)]'

                return (
                  <button
                    key={opt}
                    onClick={() => pickAns(opt)}
                    className={cn(
                      'p-4 rounded-xl text-left text-sm font-medium border transition-all duration-200 relative',
                      optStyle
                    )}
                  >
                    <span className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5 border border-current">
                        {String.fromCharCode(65 + oi)}
                      </span>
                      <span className="flex-1">{opt}</span>
                    </span>
                    {reveal && isCorrect  && <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />}
                    {reveal && isSelected && !isCorrect && <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400" />}
                  </button>
                )
              })}
            </div>

            {picked && (
              <Button className="w-full mt-5" size="lg" onClick={nextQ}>
                {qIdx + 1 < questions.length ? 'Next →' : 'Finish & Submit →'}
              </Button>
            )}
          </Card>

          {/* Mini score */}
          <div className="flex items-center justify-center gap-6 mt-4 text-sm">
            <span className="text-emerald-500">✓ {score} correct</span>
            <span className="text-[var(--text3)]">{questions.length - qIdx - 1} remaining</span>
          </div>
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════
  // ── LEADERBOARD ──────────────────────────────────────────
  // ══════════════════════════════════════════════════════════
  if (view === 'leaderboard') {
    const myResult = leaderboard.find(r => r.user_id === profile?.id)
    return (
      <div className="animate-fade-up">
        <div className="flex items-center gap-4 px-4 sm:px-8 pt-6 sm:pt-8 pb-0">
          <Button variant="secondary" size="sm" onClick={() => setView('list')}>
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </Button>
          <div>
            <h1 className="font-playfair text-xl sm:text-2xl font-black text-[var(--text)] flex items-center gap-2">
              <Trophy className="w-5 h-5 text-[var(--gold)]" /> Leaderboard
            </h1>
            <p className="text-sm text-[var(--text2)] mt-0.5">{activeExam?.title}</p>
          </div>
        </div>

        <div className="p-4 sm:p-8 max-w-xl">
          {/* My result */}
          {myResult && (
            <Card accent="var(--accent)" className="p-5 mb-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent2)] mb-2">Your Result</p>
              <div className="flex items-center gap-4">
                <div className="font-playfair text-3xl font-black text-[var(--accent2)]">
                  {myResult.score}/{myResult.total_questions}
                </div>
                <div>
                  <p className="font-semibold text-[var(--text)]">{myResult.percentage.toFixed(0)}%</p>
                  <p className="text-xs text-[var(--text3)]">
                    {myResult.rank ? `Rank #${myResult.rank}` : 'Unranked'} · {formatTime(myResult.time_taken_seconds ?? 0)}
                  </p>
                </div>
              </div>
            </Card>
          )}

          <Card className="overflow-hidden">
            <div className="p-4 border-b border-[var(--border)]">
              <p className="text-sm font-semibold text-[var(--text)]">Top Performers</p>
            </div>
            {leaderboard.length === 0 ? (
              <div className="p-8 text-center text-[var(--text3)] text-sm">No results yet</div>
            ) : (
              leaderboard.map((r, i) => {
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null
                const isMe  = r.user_id === profile?.id
                return (
                  <div
                    key={r.id}
                    className={cn(
                      'flex items-center gap-4 px-5 py-3.5 border-b border-[var(--border)] last:border-0 transition-colors',
                      isMe && 'bg-[var(--accent)]/5'
                    )}
                  >
                    <div className="w-8 text-center flex-shrink-0">
                      {medal
                        ? <span className="text-xl">{medal}</span>
                        : <span className="font-mono text-sm text-[var(--text3)]">{i + 1}</span>
                      }
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent)] to-[var(--blue)] flex items-center justify-center text-xs font-bold flex-shrink-0 text-white">
                      {getInitials(r.profile?.full_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn('font-semibold text-sm', isMe ? 'text-[var(--accent2)]' : 'text-[var(--text)]')}>
                        {r.profile?.full_name ?? 'Unknown'}{isMe ? ' (You)' : ''}
                      </p>
                      <p className="text-xs text-[var(--text3)]">
                        Finished in {formatTime(r.time_taken_seconds ?? 0)}
                      </p>
                    </div>
                    <div className="font-mono font-bold text-[var(--accent2)]">{r.score}</div>
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