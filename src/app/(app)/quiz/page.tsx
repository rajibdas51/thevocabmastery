'use client'
import { useState, useEffect, useRef } from 'react'
import { getCategories, getQuizQuestions, saveQuizAttempt } from '@/lib/db'
import { useAuthStore } from '@/store/auth'
import { useToast } from '@/components/ui/Toast'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import Card from '@/components/ui/Card'
import ProgressBar from '@/components/ui/Progressbar'
import { formatTime, scoreColor, scoreLabel } from '@/lib/utils'
import type { Category, QuizQuestion, QuizType } from '@/types'
import { cn } from '@/lib/utils'
import { Timer, RotateCcw, Home, CheckCircle2, XCircle } from 'lucide-react'
import HintButton from '@/components/quiz/HintButton'
import OutOfPointsModal from '@/components/streak/OutOfPointsModal'
import PointsBar from '@/components/streak/PointsBar'
import { deductPoint, recordActivity, checkCanStartQuiz } from '@/lib/streak'
import { useStreakStore } from '@/store/streak'

type Step = 'setup' | 'quiz' | 'result'

const COUNT_OPTIONS = [
  { value: '10',  label: '10 Questions'  },
  { value: '20',  label: '20 Questions'  },
  { value: '50',  label: '50 Questions'  },
  { value: '100', label: '100 Questions' },
]

interface TypeOption {
  value: QuizType
  label: string
  desc: string
  color: string
  badge: string
}

const TYPE_OPTIONS: TypeOption[] = [
  { value: 'meaning_en', label: 'Word Meaning (English)', desc: 'Pick the correct English definition', color: 'var(--accent)',  badge: '📖 EN' },
  { value: 'meaning_bn', label: 'Word Meaning (Bangla)',  desc: 'বাংলা অর্থ বেছে নিন',                color: '#f5c842',       badge: '📖 বাং' },
  { value: 'synonym',    label: 'Synonyms',               desc: 'Find the correct synonym',            color: '#22d3a0',       badge: '≈ SYN'  },
  { value: 'antonym',    label: 'Antonyms',               desc: 'Find the correct antonym',            color: '#f8706a',       badge: '≠ ANT'  },
  { value: 'mixed',      label: 'Mixed',                  desc: 'Random mix of all types',             color: '#a78bfa',       badge: '🎲 MIX'  },
]

function typeBadgeStyle(qt: QuizType): { label: string; cls: string } {
  switch (qt) {
    case 'meaning_en': return { label: '📖 EN MEANING',  cls: 'text-[var(--accent2)] bg-[var(--accent)]/10 border-[var(--accent)]/25' }
    case 'meaning_bn': return { label: '📖 বাং অর্থ',    cls: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/25' }
    case 'synonym':    return { label: '≈ SYNONYM',       cls: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/25' }
    case 'antonym':    return { label: '≠ ANTONYM',       cls: 'text-red-400 bg-red-500/10 border-red-500/25' }
    default:           return { label: '🎲 MIXED',         cls: 'text-[var(--accent2)] bg-[var(--accent)]/10 border-[var(--accent)]/25' }
  }
}

export default function QuizPage() {
  const { profile }    = useAuthStore()
  const { add: toast } = useToast()

  const [step,      setStep]      = useState<Step>('setup')
  const [categories, setCategories] = useState<Category[]>([])
  const [catId,     setCatId]     = useState('')
  const [count,     setCount]     = useState('10')
  const [quizType,  setQuizType]  = useState<QuizType>('meaning_en')
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [current,   setCurrent]   = useState(0)
  const [answers,   setAnswers]   = useState<{ selected: string; correct: string; word: string; isCorrect: boolean }[]>([])
  const [selected,  setSelected]  = useState<string | null>(null)
  const [showAns,   setShowAns]   = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [elapsed,   setElapsed]   = useState(0)
  const { refresh, queueMilestones } = useStreakStore()
  const [outOfPoints, setOutOfPoints] = useState(false)
  const [pointsOk,    setPointsOk]    = useState(true)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (profile) getCategories(profile.id).then(({ data }) => {
      setCategories(data ?? [])
      if (data?.[0]) setCatId(data[0].id)
    })
  }, [profile])

  useEffect(() => {
    if (step === 'quiz') {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [step])

  const startQuiz = async () => {
    if (!profile) return
    const check = await checkCanStartQuiz(profile.id)
    if (!check.can_start) { setOutOfPoints(true); return }
    setLoading(true)
    const { data, error } = await getQuizQuestions(catId, parseInt(count), quizType)
    if (error || !data?.length) {
      toast(error ?? 'No words found', 'error')
      setLoading(false); return
    }
    setQuestions(data)
    setAnswers([]); setCurrent(0); setSelected(null); setShowAns(false); setElapsed(0)
    setStep('quiz'); setLoading(false)
  }

  const pick = (opt: string) => {
    if (showAns) return
    setSelected(opt); setShowAns(true)
  }

  const next = async () => {
    const q = questions[current]
    const isCorrect = selected === q.correct_answer
    const newAnswers = [...answers, { selected: selected!, correct: q.correct_answer, word: q.word, isCorrect }]
    // Deduct point on wrong answer
    if (!isCorrect && profile) {
      const result = await deductPoint(profile.id)
      if (result.out_of_points) { setOutOfPoints(true) }
      refresh(profile.id)
    }
    setAnswers(newAnswers)
    setSelected(null); setShowAns(false)

    if (current + 1 >= questions.length) {
      if (profile) {
        const score = newAnswers.filter(a => a.isCorrect).length
        await saveQuizAttempt({
          user_id: profile.id, category_id: catId, quiz_type: quizType,
          score, total_questions: questions.length,
          percentage: Math.round((score / questions.length) * 100),
          time_taken_seconds: elapsed,
          answers: newAnswers.map((a, i) => ({
            word_id: questions[i].word_id, word: a.word,
            selected: a.selected, correct: a.correct, is_correct: a.isCorrect,
          })),
        })
      }
      setStep('result')
    } else {
      setCurrent(c => c + 1)
    }
  }

  // ── SETUP ─────────────────────────────────────────────────
  if (step === 'setup') return (
    <div className="animate-fade-up">
      <PageHeader title="Take a Quiz" subtitle="Test your vocabulary knowledge" />
      <div className="p-4 sm:p-8 max-w-2xl">
        <Card className="p-5 sm:p-6 space-y-6">
          <Select
            label="Category / List"
            value={catId} onChange={setCatId}
            options={categories.map(c => ({ value: c.id, label: c.name }))}
          />

          {/* Quiz type grid */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text2)' }}>
              Quiz Type
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {TYPE_OPTIONS.map(o => (
                <button
                  key={o.value}
                  onClick={() => setQuizType(o.value)}
                  className="p-3.5 rounded-xl text-left border transition-all duration-150 group"
                  style={{
                    background:   quizType === o.value ? o.color + '18' : 'var(--bg3)',
                    borderColor:  quizType === o.value ? o.color + '60' : 'var(--border2)',
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-[10px] font-black px-2 py-0.5 rounded-full border"
                      style={{
                        color:       o.color,
                        borderColor: o.color + '40',
                        background:  o.color + '15',
                      }}
                    >
                      {o.badge}
                    </span>
                  </div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{o.label}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--text3)' }}>{o.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Question count */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text2)' }}>
              Number of Questions
            </p>
            <div className="flex flex-wrap gap-2">
              {COUNT_OPTIONS.map(o => (
                <button
                  key={o.value} onClick={() => setCount(o.value)}
                  className="px-4 py-2 rounded-lg text-sm font-semibold border transition-all"
                  style={{
                    background:  count === o.value ? 'var(--accent)' : 'var(--bg3)',
                    borderColor: count === o.value ? 'var(--accent)' : 'var(--border2)',
                    color:       count === o.value ? '#fff'          : 'var(--text2)',
                  }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <Button onClick={startQuiz} loading={loading} className="w-full" size="lg">
            Start Quiz →
          </Button>
        </Card>
      </div>
    </div>
  )

  // ── RESULT ────────────────────────────────────────────────
  if (step === 'result') {
    const score = answers.filter(a => a.isCorrect).length
    const pct   = Math.round((score / questions.length) * 100)
    return (
      <div className="animate-fade-up">
        <PageHeader title="Quiz Results" />
        <div className="p-4 sm:p-8 max-w-xl">
          <Card className="p-6 sm:p-8">
            <div className="text-center mb-6">
              <div className={cn('font-playfair text-7xl font-black', scoreColor(pct))}>{pct}%</div>
              <p className="text-xl font-semibold mt-3" style={{ color: 'var(--text)' }}>{scoreLabel(pct)}</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text3)' }}>{score} correct out of {questions.length}</p>
              <div className="flex items-center justify-center gap-2 text-sm mt-1" style={{ color: 'var(--text3)' }}>
                <Timer className="w-3.5 h-3.5" /><span>{formatTime(elapsed)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/20 text-center">
                <div className="text-3xl font-black text-emerald-500">{score}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--text3)' }}>✓ Correct</div>
              </div>
              <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/20 text-center">
                <div className="text-3xl font-black text-red-400">{questions.length - score}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--text3)' }}>✗ Wrong</div>
              </div>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text3)' }}>Answer Review</p>
              {answers.map((a, i) => (
                <div key={i} className={cn('flex items-start gap-3 p-3 rounded-xl text-sm border',
                  a.isCorrect ? 'bg-emerald-500/8 border-emerald-500/20' : 'bg-red-500/8 border-red-500/20')}>
                  {a.isCorrect
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    : <XCircle     className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold" style={{ color: 'var(--text)' }}>{a.word}</p>
                    <p className={cn('text-xs mt-0.5', a.isCorrect ? 'text-emerald-500' : 'text-[var(--text3)]')}>
                      Your answer: {a.selected}
                    </p>
                    {!a.isCorrect && <p className="text-xs text-emerald-500 mt-0.5">Correct: {a.correct}</p>}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="secondary" className="flex-1" onClick={() => setStep('setup')}>
                <Home className="w-3.5 h-3.5" /> Setup
              </Button>
              <Button className="flex-1" onClick={startQuiz}>
                <RotateCcw className="w-3.5 h-3.5" /> Try Again
              </Button>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  // ── ACTIVE QUIZ ───────────────────────────────────────────
  const q      = questions[current]
  const badge  = typeBadgeStyle(q?.quiz_type ?? quizType)
  const isBn   = q?.quiz_type === 'meaning_bn'

  return (
    <div className="animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-8 pt-6 sm:pt-8 pb-0">
        <div>
          <h1 className="font-playfair text-xl sm:text-2xl font-black" style={{ color: 'var(--text)' }}>Quiz</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text2)' }}>Question {current + 1} of {questions.length}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn('text-[10px] font-bold px-2.5 py-1 rounded-full border', badge.cls)}>{badge.label}</span>
          <div className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text2)' }}>
            <Timer className="w-3.5 h-3.5" />
            <span className="font-mono">{formatTime(elapsed)}</span>
          </div>
          <PointsBar compact />
          <Button variant="ghost" size="sm" onClick={() => setStep('setup')}>✕ Exit</Button>
        </div>
      </div>

      <div className="p-4 sm:p-8 max-w-2xl">
        <ProgressBar value={((current + 1) / questions.length) * 100} className="mb-6" />

        <Card className="p-5 sm:p-7">
          {/* Question prompt */}
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text3)' }}>
            {q?.question_label}
          </p>

          {/* The word / sentence */}
          <h2 className="font-playfair text-3xl sm:text-4xl font-black" style={{ color: 'var(--text)' }}>
            `{q?.word} `
          </h2>

          {/* Sub-labels */}
          {/* Hint resets on each new question via key={current} */}
          {q?.bangla_meaning && (
            <HintButton key={current} hint={q.bangla_meaning} />
          )}

          {/* Options grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
            {q?.options.map((opt, oi) => {
              const isCorrect  = opt === q.correct_answer
              const isSelected = opt === selected
              const reveal     = showAns

              let bg     = 'var(--bg3)'
              let border = 'var(--border2)'
              let color  = 'var(--text)'
              if (reveal && isCorrect)             { bg = 'rgba(34,211,160,0.15)';  border = 'rgba(34,211,160,0.6)';  color = '#059669' }
              else if (reveal && isSelected)        { bg = 'rgba(248,112,106,0.15)'; border = 'rgba(248,112,106,0.6)'; color = '#ef4444' }
              else if (reveal)                      { bg = 'var(--bg3)'; border = 'var(--border)'; color = 'var(--text3)' }

              return (
                <button
                  key={opt} onClick={() => pick(opt)}
                  className="p-4 rounded-xl text-left text-sm font-medium border transition-all duration-200 relative"
                  style={{ background: bg, borderColor: border, color, opacity: reveal && !isCorrect && !isSelected ? 0.4 : 1 }}
                >
                  <span className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5 border border-current">
                      {String.fromCharCode(65 + oi)}
                    </span>
                    <span className={cn('flex-1', isBn && 'text-base')}>{opt}</span>
                  </span>
                  {reveal && isCorrect  && <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />}
                  {reveal && isSelected && !isCorrect && <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400" />}
                </button>
              )
            })}
          </div>

          {/* Correct answer callout when wrong */}
          {showAns && selected !== q?.correct_answer && (
            <div className="mt-4 p-3 rounded-xl bg-emerald-500/8 border border-emerald-500/20">
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                ✓ Correct answer: <span className="font-bold">{q?.correct_answer}</span>
              </p>
            </div>
          )}

          {showAns && (
            <Button className="w-full mt-4" size="lg" onClick={next}>
              {current + 1 < questions.length ? 'Next Question →' : 'See Results →'}
            </Button>
          )}
        </Card>

        {/* Live score */}
        <div className="flex items-center justify-center gap-6 mt-4 text-sm">
          <span className="text-emerald-500">✓ {answers.filter(a => a.isCorrect).length} correct</span>
          <span className="text-red-400">✗ {answers.filter(a => !a.isCorrect).length} wrong</span>
          <span style={{ color: 'var(--text3)' }}>{questions.length - current - 1} remaining</span>
        </div>
      </div>
      <OutOfPointsModal
        open={outOfPoints}
        onClose={() => setOutOfPoints(false)}
        onAdWatched={() => setOutOfPoints(false)}
      />
    </div>
  )
}
