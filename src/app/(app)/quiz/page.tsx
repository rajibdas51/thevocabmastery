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

type Step = 'setup' | 'quiz' | 'result'

const COUNT_OPTIONS = [
  { value: '10', label: '10 Questions' },
  { value: '20', label: '20 Questions' },
  { value: '50', label: '50 Questions' },
  { value: '100', label: '100 Questions' },
]

const TYPE_OPTIONS = [
  { value: 'meaning',  label: '📖 Word Meaning' },
  { value: 'synonym',  label: '≈ Synonyms' },
  { value: 'antonym',  label: '≠ Antonyms' },
  { value: 'mixed',    label: '🎲 Mixed (All Types)' },
]

export default function QuizPage() {
  const { profile } = useAuthStore()
  const { add: toast } = useToast()
  const [step, setStep]           = useState<Step>('setup')
  const [categories, setCategories] = useState<Category[]>([])
  const [catId, setCatId]         = useState('')
  const [count, setCount]         = useState('10')
  const [quizType, setQuizType]   = useState<QuizType>('meaning')
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [current, setCurrent]     = useState(0)
  const [answers, setAnswers]     = useState<{ selected: string; correct: string; word: string; isCorrect: boolean }[]>([])
  const [selected, setSelected]   = useState<string | null>(null)
  const [showAns, setShowAns]     = useState(false)
  const [loading, setLoading]     = useState(false)
  const [elapsed, setElapsed]     = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (profile) {
      getCategories(profile.id).then(({ data }) => {
        setCategories(data ?? [])
        if (data?.[0]) setCatId(data[0].id)
      })
    }
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
    setLoading(true)
    const { data, error } = await getQuizQuestions(catId, parseInt(count), quizType)
    if (error || !data?.length) {
      toast(error ?? 'No words in this category', 'error')
      setLoading(false); return
    }
    setQuestions(data)
    setAnswers([]); setCurrent(0); setSelected(null); setShowAns(false); setElapsed(0)
    setStep('quiz'); setLoading(false)
  }

  const pick = (opt: string) => {
    if (showAns) return
    setSelected(opt)
    setShowAns(true)
  }

  const next = async () => {
    const q = questions[current]
    const isCorrect = selected === q.correct_answer
    const newAnswers = [...answers, { selected: selected!, correct: q.correct_answer, word: q.word, isCorrect }]
    setAnswers(newAnswers)
    setSelected(null); setShowAns(false)

    if (current + 1 >= questions.length) {
      if (profile) {
        const score = newAnswers.filter(a => a.isCorrect).length
        await saveQuizAttempt({
          user_id: profile.id,
          category_id: catId,
          quiz_type: quizType,
          score,
          total_questions: questions.length,
          percentage: Math.round((score / questions.length) * 100),
          time_taken_seconds: elapsed,
          answers: newAnswers.map((a, i) => ({
            word_id: questions[i].word_id,
            word: a.word,
            selected: a.selected,
            correct: a.correct,
            is_correct: a.isCorrect,
          })),
        })
      }
      setStep('result')
    } else {
      setCurrent(c => c + 1)
    }
  }

  // ── SETUP ──────────────────────────────────────────────────
  if (step === 'setup') return (
    <div className="animate-fade-up">
      <PageHeader title="Take a Quiz" subtitle="Test your vocabulary knowledge" />
      <div className="p-4 sm:p-8 max-w-lg">
        <Card className="p-5 sm:p-6 space-y-5">
          <Select
            label="Category / List"
            value={catId}
            onChange={setCatId}
            options={categories.map(c => ({ value: c.id, label: c.name }))}
          />

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--text2)] mb-3">Quiz Type</p>
            <div className="grid grid-cols-2 gap-2">
              {TYPE_OPTIONS.map(o => (
                <button
                  key={o.value}
                  onClick={() => setQuizType(o.value as QuizType)}
                  className={cn(
                    'px-4 py-3 rounded-xl text-sm font-semibold border transition-all text-left',
                    quizType === o.value
                      ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                      : 'bg-[var(--bg3)] border-[var(--border2)] text-[var(--text2)] hover:border-[var(--accent)]/40 hover:text-[var(--text)]'
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--text2)] mb-3">Number of Questions</p>
            <div className="flex flex-wrap gap-2">
              {COUNT_OPTIONS.map(o => (
                <button
                  key={o.value}
                  onClick={() => setCount(o.value)}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-semibold border transition-all',
                    count === o.value
                      ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                      : 'bg-[var(--bg3)] border-[var(--border2)] text-[var(--text2)] hover:border-[var(--accent)]/40 hover:text-[var(--text)]'
                  )}
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

  // ── RESULT ─────────────────────────────────────────────────
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
              <p className="text-xl font-semibold mt-3 text-[var(--text)]">{scoreLabel(pct)}</p>
              <p className="text-[var(--text3)] text-sm mt-1">{score} correct out of {questions.length}</p>
              <div className="flex items-center justify-center gap-2 text-sm text-[var(--text3)] mt-1">
                <Timer className="w-3.5 h-3.5" /><span>{formatTime(elapsed)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/20 text-center">
                <div className="text-3xl font-black text-emerald-500">{score}</div>
                <div className="text-xs text-[var(--text3)] mt-1">✓ Correct</div>
              </div>
              <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/20 text-center">
                <div className="text-3xl font-black text-red-400">{questions.length - score}</div>
                <div className="text-xs text-[var(--text3)] mt-1">✗ Wrong</div>
              </div>
            </div>

            {/* Answer review */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--text3)] mb-3">Answer Review</p>
              {answers.map((a, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-xl text-sm border',
                    a.isCorrect
                      ? 'bg-emerald-500/8 border-emerald-500/20'
                      : 'bg-red-500/8 border-red-500/20'
                  )}
                >
                  {a.isCorrect
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    : <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  }
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[var(--text)]">{a.word}</p>
                    <p className={cn('text-xs mt-0.5', a.isCorrect ? 'text-emerald-500' : 'text-[var(--text3)]')}>
                      Your answer: {a.selected}
                    </p>
                    {!a.isCorrect && (
                      <p className="text-xs text-emerald-500 mt-0.5">Correct: {a.correct}</p>
                    )}
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

  // ── ACTIVE QUIZ ────────────────────────────────────────────
  const q = questions[current]

  const qTypeBadge =
    q?.quiz_type === 'synonym' ? { label: '≈ SYNONYM',  cls: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' }
    : q?.quiz_type === 'antonym' ? { label: '≠ ANTONYM', cls: 'text-red-400 bg-red-500/10 border-red-500/20' }
    : { label: '📖 MEANING', cls: 'text-[var(--accent2)] bg-[var(--accent)]/10 border-[var(--accent)]/20' }

  return (
    <div className="animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-8 pt-6 sm:pt-8 pb-0">
        <div>
          <h1 className="font-playfair text-xl sm:text-2xl font-black text-[var(--text)]">Quiz</h1>
          <p className="text-sm text-[var(--text2)] mt-0.5">Question {current + 1} of {questions.length}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn('text-[10px] font-bold px-2.5 py-1 rounded-full border', qTypeBadge.cls)}>
            {qTypeBadge.label}
          </span>
          <div className="flex items-center gap-1.5 text-sm text-[var(--text2)]">
            <Timer className="w-3.5 h-3.5" />
            <span className="font-mono">{formatTime(elapsed)}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setStep('setup')}>✕ Exit</Button>
        </div>
      </div>

      <div className="p-4 sm:p-8 max-w-2xl">
        <ProgressBar value={((current + 1) / questions.length) * 100} className="mb-6" />

        <Card className="p-5 sm:p-7">
          <p className="text-xs text-[var(--text3)] mb-2">{q?.question_label}</p>
          <h2 className="font-playfair text-3xl sm:text-4xl font-black text-[var(--text)]">`{q?.word}`</h2>
          {q?.bangla_meaning && (
            <p className="text-sm mt-1" style={{ color: 'var(--gold)' }}>{q.bangla_meaning}</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 sm:mt-7">
            {q?.options.map((opt, oi) => {
              const isCorrect  = opt === q.correct_answer
              const isSelected = opt === selected
              const reveal     = showAns

              // ── Option state styles — theme-aware ──────────────
              let optStyle = ''
              if (reveal && isCorrect) {
                // Always green for correct, regardless of theme
                optStyle = 'bg-emerald-500/15 border-emerald-500/60 text-emerald-600 dark:text-emerald-300 shadow-md shadow-emerald-500/10'
              } else if (reveal && isSelected && !isCorrect) {
                // Always red for wrong
                optStyle = 'bg-red-500/15 border-red-500/60 text-red-600 dark:text-red-300 shadow-md shadow-red-500/10'
              } else if (reveal) {
                // Dim other options
                optStyle = 'opacity-40 bg-[var(--bg3)] border-[var(--border)] text-[var(--text2)]'
              } else {
                // Default idle state — fully theme-aware
                optStyle = 'bg-[var(--bg3)] border-[var(--border2)] text-[var(--text)] hover:border-[var(--accent)]/50 hover:bg-[var(--accent)]/8 hover:text-[var(--text)]'
              }

              return (
                <button
                  key={opt}
                  onClick={() => pick(opt)}
                  className={cn(
                    'p-4 rounded-xl text-left text-sm font-medium border transition-all duration-200 relative cursor-pointer',
                    optStyle
                  )}
                >
                  <span className="flex items-start gap-2.5">
                    {/* Option letter badge */}
                    <span className={cn(
                      'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5 border',
                      reveal && isCorrect  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-300'
                      : reveal && isSelected ? 'border-red-500 text-red-600 dark:text-red-300'
                      : 'border-current'
                    )}>
                      {String.fromCharCode(65 + oi)}
                    </span>
                    <span className="flex-1">{opt}</span>
                  </span>

                  {/* Tick / Cross icons */}
                  {reveal && isCorrect && (
                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                  )}
                  {reveal && isSelected && !isCorrect && (
                    <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Show correct answer explanation if wrong */}
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

        {/* Live score tracker */}
        <div className="flex items-center justify-center gap-6 mt-4 text-sm">
          <span className="text-emerald-500">✓ {answers.filter(a => a.isCorrect).length} correct</span>
          <span className="text-red-400">✗ {answers.filter(a => !a.isCorrect).length} wrong</span>
          <span className="text-[var(--text3)]">{questions.length - current - 1} remaining</span>
        </div>
      </div>
    </div>
  )
}