'use client'
import { useState, useEffect, useRef } from 'react'
import { getCategories, getQuizQuestions, saveQuizAttempt, countWordsWithExamples } from '@/lib/db'
import { useAuthStore } from '@/store/auth'
import { useToast } from '@/components/ui/Toast'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import Card from '@/components/ui/Card'
import ProgressBar from '@/components/ui/Progressbar'
import { formatTime, scoreColor, scoreLabel } from '@/lib/utils'
import type { Category, QuizQuestion } from '@/types'
import { cn } from '@/lib/utils'
import { Timer, RotateCcw, Home, CheckCircle2, XCircle, PenLine, Sparkles, AlertCircle } from 'lucide-react'
import HintButton from '@/components/quiz/HintButton'
import Link from 'next/link'

type Step = 'setup' | 'quiz' | 'result'

const COUNT_OPTIONS = [
  { value: '5',  label: '5 Questions'  },
  { value: '10', label: '10 Questions' },
  { value: '20', label: '20 Questions' },
  { value: '50', label: '50 Questions' },
]

export default function FillBlankPage() {
  const { profile }    = useAuthStore()
  const { add: toast } = useToast()
  const isAdmin        = profile?.role === 'admin'

  const [step,       setStep]       = useState<Step>('setup')
  const [categories, setCategories] = useState<Category[]>([])
  const [catId,      setCatId]      = useState('')
  const [count,      setCount]      = useState('10')
  const [coverage,   setCoverage]   = useState<number | null>(null)   // words with examples
  const [questions,  setQuestions]  = useState<QuizQuestion[]>([])
  const [current,    setCurrent]    = useState(0)
  const [answers,    setAnswers]    = useState<{
    selected: string; correct: string; word: string; sentence: string; isCorrect: boolean
  }[]>([])
  const [selected,  setSelected]  = useState<string | null>(null)
  const [showAns,   setShowAns]   = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [elapsed,   setElapsed]   = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (profile) getCategories(profile.id).then(({ data }) => {
      setCategories(data ?? [])
      if (data?.[0]) setCatId(data[0].id)
    })
  }, [profile])

  // Check coverage whenever category changes
  useEffect(() => {
    if (!catId) return
    setCoverage(null)
    countWordsWithExamples(catId).then(n => setCoverage(n))
  }, [catId])

  useEffect(() => {
    if (step === 'quiz') {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [step])

  const startQuiz = async () => {
    if ((coverage ?? 0) < 4) {
      toast('Not enough example sentences. Admin needs to generate them first.', 'error')
      return
    }
    setLoading(true)
    // Fetch more than needed since blanks need the word in the sentence
    const { data, error } = await getQuizQuestions(catId, parseInt(count) * 2, 'fill_blank')
    if (error || !data?.length) {
      toast(error ?? 'Failed to load questions', 'error')
      setLoading(false); return
    }
    const trimmed = data.slice(0, parseInt(count))
    setQuestions(trimmed)
    setAnswers([]); setCurrent(0); setSelected(null); setShowAns(false); setElapsed(0)
    setStep('quiz'); setLoading(false)
  }

  const pick = (opt: string) => {
    if (showAns) return
    setSelected(opt); setShowAns(true)
  }

  const next = async () => {
    const q = questions[current]
    const isCorrect  = selected === q.correct_answer
    const newAnswers = [
      ...answers,
      { selected: selected!, correct: q.correct_answer, word: q.word, sentence: q.sentence ?? '', isCorrect },
    ]
    setAnswers(newAnswers)
    setSelected(null); setShowAns(false)

    if (current + 1 >= questions.length) {
      if (profile) {
        const score = newAnswers.filter(a => a.isCorrect).length
        await saveQuizAttempt({
          user_id: profile.id, category_id: catId, quiz_type: 'fill_blank',
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
  if (step === 'setup') {
    const hasEnough = (coverage ?? 0) >= 4
    const requested = parseInt(count)
    const canStart  = hasEnough && (coverage ?? 0) >= 4

    return (
      <div className="animate-fade-up">
        <PageHeader
          title="Fill in the Blank"
          subtitle="Complete the sentence by choosing the correct word"
        />
        <div className="p-4 sm:p-8 max-w-lg">
          <Card className="p-5 sm:p-6 space-y-5">

            {/* How it works */}
            <div className="p-4 rounded-xl border"
              style={{ background: 'var(--accent)' + '0d', borderColor: 'var(--accent)' + '30' }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--accent2)' }}>
                How it works
              </p>
              <p className="text-sm" style={{ color: 'var(--text2)' }}>
                A real example sentence appears with one word replaced by <strong style={{ color: 'var(--text)' }}>___</strong>.
                Choose the correct word from 4 options.
              </p>
            </div>

            <Select
              label="Category / List"
              value={catId} onChange={setCatId}
              options={categories.map(c => ({ value: c.id, label: c.name }))}
            />

            {/* Coverage indicator */}
            {catId && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: 'var(--text2)' }}>Example sentences available</span>
                  <span className="font-mono font-bold" style={{ color: hasEnough ? 'var(--green)' : 'var(--gold)' }}>
                    {coverage === null ? '…' : coverage} words
                  </span>
                </div>
                <ProgressBar
                  value={coverage === null ? 0 : Math.min(100, (coverage / Math.max(requested, 1)) * 100)}
                  color={hasEnough ? 'var(--green)' : 'var(--gold)'}
                />

                {/* Not enough — show why + how to fix */}
                {coverage !== null && !hasEnough && (
                  <div className="flex items-start gap-2.5 p-3 rounded-xl border"
                    style={{ background: 'rgba(245,200,66,0.08)', borderColor: 'rgba(245,200,66,0.3)' }}>
                    <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="text-xs space-y-1.5" style={{ color: 'var(--text2)' }}>
                      <p>
                        <strong style={{ color: 'var(--text)' }}>Not enough example sentences yet.</strong>
                        {' '}Fill-in-the-blank needs at least 4 words with example sentences in this category.
                      </p>
                      {isAdmin ? (
                        <p>
                          Go to{' '}
                          <Link href="/admin" className="font-semibold underline" style={{ color: 'var(--accent2)' }}>
                            Admin Panel → Generate Examples
                          </Link>{' '}
                          to auto-generate sentences using Gemini AI — takes ~1 minute, saved permanently.
                        </p>
                      ) : (
                        <p>Ask the admin to generate example sentences for this category.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Ready */}
                {coverage !== null && hasEnough && (
                  <p className="text-xs text-emerald-500 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Ready! {coverage} sentences available.
                    {coverage < requested && ` (You asked for ${requested}, quiz will use ${coverage})`}
                  </p>
                )}
              </div>
            )}

            {/* Question count */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text2)' }}>
                Number of Questions
              </p>
              <div className="flex flex-wrap gap-2">
                {COUNT_OPTIONS.map(o => (
                  <button key={o.value} onClick={() => setCount(o.value)}
                    className="px-4 py-2 rounded-lg text-sm font-semibold border transition-all"
                    style={{
                      background:  count === o.value ? 'var(--accent)' : 'var(--bg3)',
                      borderColor: count === o.value ? 'var(--accent)' : 'var(--border2)',
                      color:       count === o.value ? '#fff'          : 'var(--text2)',
                    }}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={startQuiz}
              loading={loading}
              disabled={!canStart}
              className="w-full"
              size="lg"
            >
              <PenLine className="w-4 h-4" />
              {!hasEnough ? 'Examples needed — see above' : 'Start Fill in the Blank →'}
            </Button>

            {/* Admin shortcut */}
            {isAdmin && (
              <Link href="/admin">
                <Button variant="outline" className="w-full" size="sm">
                  <Sparkles className="w-3.5 h-3.5" />
                  Admin: Generate Example Sentences
                </Button>
              </Link>
            )}
          </Card>
        </div>
      </div>
    )
  }

  // ── RESULT ────────────────────────────────────────────────
  if (step === 'result') {
    const score = answers.filter(a => a.isCorrect).length
    const pct   = Math.round((score / questions.length) * 100)
    return (
      <div className="animate-fade-up">
        <PageHeader title="Results" />
        <div className="p-4 sm:p-8 max-w-2xl">
          <Card className="p-6 sm:p-8">
            <div className="text-center mb-6">
              <div className={cn('font-playfair text-7xl font-black', scoreColor(pct))}>{pct}%</div>
              <p className="text-xl font-semibold mt-3" style={{ color: 'var(--text)' }}>{scoreLabel(pct)}</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text3)' }}>
                {score} correct out of {questions.length}
              </p>
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

            {/* Sentence review */}
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text3)' }}>
                Sentence Review
              </p>
              {answers.map((a, i) => (
                <div key={i} className={cn('p-3.5 rounded-xl text-sm border',
                  a.isCorrect ? 'bg-emerald-500/8 border-emerald-500/20' : 'bg-red-500/8 border-red-500/20')}>
                  <div className="flex items-center gap-2 mb-2">
                    {a.isCorrect
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      : <XCircle     className="w-4 h-4 text-red-400 flex-shrink-0" />}
                    <p className="font-semibold font-playfair" style={{ color: 'var(--text)' }}>{a.word}</p>
                  </div>
                  {/* Full sentence with word filled in */}
                  <p className="text-xs italic leading-relaxed" style={{ color: 'var(--text2)' }}>
                    {a.sentence.replace('___', `[${a.correct}]`)}
                  </p>
                  {!a.isCorrect && (
                    <p className="text-xs mt-1.5" style={{ color: 'var(--text3)' }}>
                      Your answer: <span className="text-red-400 font-semibold">{a.selected}</span>
                      {' '}→ Correct: <span className="text-emerald-500 font-semibold">{a.correct}</span>
                    </p>
                  )}
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
  const q = questions[current]

  const renderSentence = (sentence: string) => {
    const parts = sentence.split('___')
    if (parts.length < 2) return <span>{sentence}</span>
    return (
      <span>
        {parts[0]}
        <span
          className="inline-flex items-center justify-center min-w-[80px] mx-1 px-3 py-0.5 rounded-lg font-black border-b-2"
          style={{
            fontSize:    '1.1em',
            background:  'var(--accent)' + '18',
            borderColor: 'var(--accent)',
            color:       showAns ? 'var(--green)' : 'var(--accent2)',
            fontFamily:  'var(--font-mono)',
          }}
        >
          {showAns ? q?.correct_answer : '___'}
        </span>
        {parts[1]}
      </span>
    )
  }

  return (
    <div className="animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-8 pt-6 sm:pt-8 pb-0">
        <div>
          <h1 className="font-playfair text-xl sm:text-2xl font-black flex items-center gap-2"
            style={{ color: 'var(--text)' }}>
            <PenLine className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            Fill in the Blank
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text2)' }}>
            Question {current + 1} of {questions.length}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border"
            style={{ color: 'var(--accent2)', background: 'var(--accent)' + '12', borderColor: 'var(--accent)' + '30' }}>
            ✏️ FILL BLANK
          </span>
          <div className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text2)' }}>
            <Timer className="w-3.5 h-3.5" />
            <span className="font-mono">{formatTime(elapsed)}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setStep('setup')}>✕ Exit</Button>
        </div>
      </div>

      <div className="p-4 sm:p-8 max-w-2xl">
        <ProgressBar value={((current + 1) / questions.length) * 100} className="mb-6" />

        <Card className="p-5 sm:p-7">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--text3)' }}>
            Choose the word that best completes the sentence
          </p>

          {/* Sentence */}
          <div className="text-base sm:text-lg leading-[2.2] mb-4 p-4 rounded-xl"
            style={{ background: 'var(--bg3)', color: 'var(--text)' }}>
            {q?.sentence ? renderSentence(q.sentence) : '…'}
          </div>

          {/* Hint resets on each new question via key={current} */}
          {q?.bangla_meaning && (
            <HintButton key={current} hint={q.bangla_meaning} />
          )}

          {/* Options */}
          <div className="grid grid-cols-2 gap-3">
            {q?.options.map((opt, oi) => {
              const isCorrect  = opt === q.correct_answer
              const isSelected = opt === selected
              const reveal     = showAns

              let bg     = 'var(--bg3)'
              let border = 'var(--border2)'
              let color  = 'var(--text)'
              let opacity = 1
              if (reveal && isCorrect)        { bg = 'rgba(34,211,160,0.15)';  border = 'rgba(34,211,160,0.6)';  color = '#059669' }
              else if (reveal && isSelected)  { bg = 'rgba(248,112,106,0.15)'; border = 'rgba(248,112,106,0.6)'; color = '#ef4444' }
              else if (reveal)                { opacity = 0.4 }

              return (
                <button
                  key={opt} onClick={() => pick(opt)}
                  className="p-4 rounded-xl text-left font-semibold border transition-all duration-200 relative"
                  style={{ background: bg, borderColor: border, color, opacity }}
                >
                  <span className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 border border-current">
                      {String.fromCharCode(65 + oi)}
                    </span>
                    <span className="font-playfair text-lg">{opt}</span>
                  </span>
                  {reveal && isCorrect  && <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />}
                  {reveal && isSelected && !isCorrect && <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400" />}
                </button>
              )
            })}
          </div>

          {/* Correct answer callout */}
          {showAns && selected !== q?.correct_answer && (
            <div className="mt-4 p-3 rounded-xl bg-emerald-500/8 border border-emerald-500/20">
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                ✓ The correct word is: <span className="font-bold text-sm">{q?.correct_answer}</span>
              </p>
              <p className="text-xs mt-1 italic" style={{ color: 'var(--text3)' }}>
                {q?.sentence?.replace('___', `[${q.correct_answer}]`)}
              </p>
            </div>
          )}

          {showAns && (
            <Button className="w-full mt-4" size="lg" onClick={next}>
              {current + 1 < questions.length ? 'Next Question →' : 'See Results →'}
            </Button>
          )}
        </Card>

        {/* Score */}
        <div className="flex items-center justify-center gap-6 mt-4 text-sm">
          <span className="text-emerald-500">✓ {answers.filter(a => a.isCorrect).length} correct</span>
          <span className="text-red-400">✗ {answers.filter(a => !a.isCorrect).length} wrong</span>
          <span style={{ color: 'var(--text3)' }}>{questions.length - current - 1} remaining</span>
        </div>
      </div>
    </div>
  )
}
