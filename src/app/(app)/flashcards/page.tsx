'use client'
import { useState, useEffect } from 'react'
import { getWords, getCategories } from '@/lib/db'
import { useAuthStore } from '@/store/auth'
import { useToast } from '@/components/ui/Toast'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import Card from '@/components/ui/Card'
import ProgressBar from '@/components/ui/Progressbar'
import { shuffle } from '@/lib/utils'
import type { Category, Word } from '@/types'
import { RotateCcw, ChevronLeft, ChevronRight, Check, X } from 'lucide-react'
import { recordActivity } from '@/lib/streak'
import { useStreakStore } from '@/store/streak'

type FlashMode = 'eng_to_bangla' | 'bangla_to_eng' | 'eng_to_meaning'

const modeLabels: Record<FlashMode, { front: string; back: string }> = {
  eng_to_bangla:  { front: 'English', back: 'বাংলা'   },
  bangla_to_eng:  { front: 'বাংলা',   back: 'English' },
  eng_to_meaning: { front: 'English', back: 'Meaning'  },
}

export default function FlashcardsPage() {
  const { profile }    = useAuthStore()
  const { refresh }    = useStreakStore()
  const { add: toast } = useToast()

  const [categories, setCategories] = useState<Category[]>([])
  const [catId,  setCatId]  = useState('')
  const [mode,   setMode]   = useState<FlashMode>('eng_to_bangla')
  const [started, setStarted] = useState(false)
  const [words,  setWords]  = useState<Word[]>([])
  const [idx,    setIdx]    = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [known,  setKnown]  = useState(0)
  const [unknown, setUnknown] = useState(0)
  const [loading, setLoading] = useState(false)
  const [done,   setDone]   = useState(false)

  useEffect(() => {
    if (!profile) return
    getCategories(profile.id).then(({ data }) => {
      setCategories(data ?? [])
      if (data?.[0]) setCatId(data[0].id)
    })
  }, [profile])

  const start = async () => {
    setLoading(true)
    const { data } = await getWords({ categoryId: catId, pageSize: 100 })
    if (!data?.length) { toast('No words in this category', 'error'); setLoading(false); return }
    setWords(shuffle(data))
    setIdx(0); setFlipped(false); setKnown(0); setUnknown(0); setDone(false)
    setStarted(true); setLoading(false)
  }

  const card   = words[idx]
  const labels = modeLabels[mode]

  const frontText = () => {
    if (!card) return ''
    return mode === 'bangla_to_eng' ? (card.bangla_meaning ?? card.word) : card.word
  }

  const backText = () => {
    if (!card) return ''
    if (mode === 'eng_to_meaning') return card.english_meaning
    if (mode === 'bangla_to_eng')  return card.word
    return card.bangla_meaning ?? card.english_meaning
  }

  const handleKnow = (knows: boolean) => {
    if (knows) setKnown(k => k + 1)
    else       setUnknown(u => u + 1)
    setFlipped(false)
    if (idx + 1 >= words.length) {
      setDone(true)
      if (profile) {
        recordActivity(profile.id, 'flashcard_session', words.length).then(() => refresh(profile.id))
      }
      return
    }
    setTimeout(() => setIdx(i => i + 1), 150)
  }

  // ── SETUP SCREEN ─────────────────────────────────────────
  if (!started) return (
    <div className="animate-fade-up">
      <PageHeader title="Flashcards" subtitle="Test your vocabulary with flip cards" />
      <div className="p-4 sm:p-8 max-w-md">
        <Card className="p-5 sm:p-6 space-y-5">
          <Select
            label="Select Category"
            value={catId}
            onChange={setCatId}
            options={categories.map(c => ({ value: c.id, label: `${c.name} (${c.word_count} words)` }))}
          />
          <Select
            label="Card Mode"
            value={mode}
            onChange={v => setMode(v as FlashMode)}
            options={[
              { value: 'eng_to_bangla',  label: 'English → Bangla'  },
              { value: 'bangla_to_eng',  label: 'Bangla → English'  },
              { value: 'eng_to_meaning', label: 'English → Meaning' },
            ]}
          />
          <Button onClick={start} loading={loading} className="w-full" size="lg">
            Start Flashcards →
          </Button>
        </Card>
      </div>
    </div>
  )

  // ── DONE / RESULTS SCREEN ────────────────────────────────
  if (done) {
    const total = known + unknown
    const pct   = total ? Math.round((known / total) * 100) : 0
    return (
      <div className="animate-fade-up">
        <PageHeader title="Session Complete!" />
        <div className="p-4 sm:p-8 max-w-md">
          <Card className="p-6 sm:p-8 text-center space-y-4">
            <div
              className="font-playfair text-6xl font-black"
              style={{ color: 'var(--accent2)' }}
            >
              {pct}%
            </div>
            <p className="text-lg font-semibold text-[var(--text)]">
              {pct >= 70 ? 'Great session! 🎉' : 'Keep practicing! 💪'}
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/20">
                <div className="text-2xl font-black text-emerald-500">{known}</div>
                <div className="text-xs text-[var(--text3)] mt-1">Knew it ✓</div>
              </div>
              <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/20">
                <div className="text-2xl font-black text-red-400">{unknown}</div>
                <div className="text-xs text-[var(--text3)] mt-1">Still learning ✗</div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setStarted(false)}>
                Change Deck
              </Button>
              <Button className="flex-1" onClick={start}>
                <RotateCcw className="w-3.5 h-3.5" /> Retry
              </Button>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  // ── ACTIVE FLASHCARD SCREEN ──────────────────────────────
  return (
    <div className="animate-fade-up">
      {/* Header */}
      <div className="flex items-start justify-between px-4 sm:px-8 pt-6 sm:pt-8 pb-0">
        <div>
          <h1 className="font-playfair text-xl sm:text-2xl font-black text-[var(--text)]">
            Flashcards
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text2)' }}>
            {categories.find(c => c.id === catId)?.name}
          </p>
        </div>
        <Button variant="secondary" onClick={() => setStarted(false)}>Change Deck</Button>
      </div>

      <div className="p-4 sm:p-8 flex flex-col items-center">

        {/* Progress bar */}
        <div className="w-full max-w-lg mb-6">
          <div className="flex justify-between text-xs mb-2">
            <span style={{ color: 'var(--text3)' }}>{idx + 1} / {words.length}</span>
            <span style={{ color: 'var(--accent2)' }}>Click card to flip</span>
          </div>
          <ProgressBar value={((idx + 1) / words.length) * 100} />
        </div>

        {/* ── FLASHCARD ── */}
        <div className="flashcard-container w-full max-w-lg" style={{ height: '280px' }}>
          <div
            className={`flashcard-inner ${flipped ? 'flipped' : ''}`}
            style={{ height: '280px' }}
            onClick={() => setFlipped(f => !f)}
          >

            {/* FRONT FACE */}
            <div
              className="flashcard-face rounded-2xl flex flex-col items-center justify-center p-8 cursor-pointer select-none border"
              style={{
                backgroundColor: 'var(--card-bg)',
                borderColor: 'var(--border2)',
              }}
            >
              <p
                className="text-[10px] font-bold uppercase tracking-widest mb-4"
                style={{ color: 'var(--text3)' }}
              >
                {labels.front}
              </p>
              <p
                className="font-playfair text-4xl font-black text-center"
                style={{ color: 'var(--text)' }}
              >
                {frontText()}
              </p>
              <p className="text-sm mt-5" style={{ color: 'var(--text3)' }}>
                tap to reveal
              </p>
            </div>

            {/* BACK FACE */}
            <div
              className="flashcard-face flashcard-back rounded-2xl flex flex-col items-center justify-center p-8 cursor-pointer select-none border"
              style={{
                background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 12%, var(--card-bg)), color-mix(in srgb, var(--accent2) 6%, var(--card-bg)))',
                borderColor: 'color-mix(in srgb, var(--accent) 30%, transparent)',
              }}
            >
              <p
                className="text-[10px] font-bold uppercase tracking-widest mb-4"
                style={{ color: 'var(--accent2)' }}
              >
                {labels.back}
              </p>

              {/* Main back text */}
              <p
                className="font-playfair font-black text-center"
                style={{
                  fontSize:  mode === 'eng_to_meaning' ? '1.25rem' : '2rem',
                  color:     mode === 'eng_to_meaning' ? 'var(--text)' : 'var(--gold)',
                  lineHeight: 1.3,
                }}
              >
                {backText()}
              </p>

              {/* English meaning sub-text (on bangla/meaning modes) */}
              {mode !== 'eng_to_meaning' && (
                <p
                  className="text-sm mt-3 text-center max-w-xs leading-relaxed"
                  style={{ color: 'var(--text2)' }}
                >
                  {card?.english_meaning}
                </p>
              )}

              {/* Example sentence */}
              {card?.example && (
                <p
                  className="text-xs italic mt-4 text-center max-w-xs pt-3"
                  style={{
                    color: 'var(--text3)',
                    borderTop: '1px solid var(--border)',
                  }}
                >
                  `{card.example}` 
                </p>
              )}
            </div>

          </div>
        </div>

        {/* ── ACTION BUTTONS ── */}

        {/* After flip: Knew it / Still learning */}
        {flipped && (
          <div className="flex gap-4 mt-8 animate-fade-in">
            <Button
              variant="danger"
              size="lg"
              className="w-36"
              onClick={() => handleKnow(false)}
            >
              <X className="w-4 h-4" /> Still Learning
            </Button>
            <Button
              size="lg"
              className="w-36 !bg-emerald-600 hover:!bg-emerald-500"
              onClick={() => handleKnow(true)}
            >
              <Check className="w-4 h-4" /> Knew It!
            </Button>
          </div>
        )}

        {/* Before flip: Prev / Next navigation */}
        {!flipped && (
          <div className="flex gap-4 mt-8">
            <Button
              variant="secondary"
              onClick={() => { setFlipped(false); setIdx(i => Math.max(0, i - 1)) }}
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </Button>
            <Button
              variant="secondary"
              onClick={() => { setFlipped(false); setIdx(i => Math.min(words.length - 1, i + 1)) }}
            >
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Score tracker */}
        <div className="flex gap-6 mt-6 text-sm">
          <span className="text-emerald-500">✓ {known} knew it</span>
          <span className="text-red-400">✗ {unknown} still learning</span>
        </div>

      </div>
    </div>
  )
}
