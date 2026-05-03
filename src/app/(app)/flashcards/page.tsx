'use client'
import { useState } from 'react'
import { getWords, getCategories } from '@/lib/db'
import { useAuthStore } from '@/store/auth'
import { useToast } from '@/components/ui/Toast'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import Card from '@/components/ui/Card'
import ProgressBar from '@/components/ui/Progressbar'
import { useEffect } from 'react'
import { shuffle } from '@/lib/utils'
import type { Category, Word } from '@/types'
import { RotateCcw, ChevronLeft, ChevronRight, Check, X } from 'lucide-react'

type FlashMode = 'eng_to_bangla' | 'bangla_to_eng' | 'eng_to_meaning'

const modeLabels: Record<FlashMode, { front: string; back: string }> = {
  eng_to_bangla: { front: 'English', back: 'বাংলা' },
  bangla_to_eng: { front: 'বাংলা', back: 'English' },
  eng_to_meaning: { front: 'English', back: 'Meaning' },
}

export default function FlashcardsPage() {
  const { profile } = useAuthStore()
  const { add: toast } = useToast()
  const [categories, setCategories] = useState<Category[]>([])
  const [catId, setCatId] = useState('')
  const [mode, setMode] = useState<FlashMode>('eng_to_bangla')
  const [started, setStarted] = useState(false)
  const [words, setWords] = useState<Word[]>([])
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [known, setKnown] = useState(0)
  const [unknown, setUnknown] = useState(0)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (profile) getCategories(profile.id).then(({ data }) => {
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

  const card = words[idx]
  const labels = modeLabels[mode]

  const frontText = () => {
    if (!card) return ''
    if (mode === 'bangla_to_eng') return card.bangla_meaning ?? card.word
    return card.word
  }

  const backText = () => {
    if (!card) return ''
    if (mode === 'eng_to_meaning') return card.english_meaning
    if (mode === 'bangla_to_eng') return card.word
    return card.bangla_meaning ?? card.english_meaning
  }

  const handleKnow = (knows: boolean) => {
    if (knows) setKnown(k => k + 1)
    else setUnknown(u => u + 1)
    setFlipped(false)
    if (idx + 1 >= words.length) { setDone(true); return }
    setTimeout(() => setIdx(i => i + 1), 150)
  }

  if (!started) {
    return (
      <div className="animate-fade-up">
        <PageHeader title="Flashcards" subtitle="Test your vocabulary with flip cards" />
        <div className="p-8 max-w-md">
          <Card className="p-6 space-y-5">
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
                { value: 'eng_to_bangla', label: 'English → Bangla' },
                { value: 'bangla_to_eng', label: 'Bangla → English' },
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
  }

  if (done) {
    const total = known + unknown
    const pct = total ? Math.round((known / total) * 100) : 0
    return (
      <div className="animate-fade-up">
        <PageHeader title="Session Complete!" />
        <div className="p-8 max-w-md">
          <Card className="p-8 text-center space-y-4">
            <div className="text-6xl font-playfair font-black text-[#a78bfa]">{pct}%</div>
            <p className="text-lg font-semibold">{pct >= 70 ? 'Great session! 🎉' : 'Keep practicing! 💪'}</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-500/8 rounded-xl p-4 border border-emerald-500/15">
                <div className="text-2xl font-black text-emerald-400">{known}</div>
                <div className="text-xs text-[#5a5a72] mt-1">Knew it ✓</div>
              </div>
              <div className="bg-red-500/8 rounded-xl p-4 border border-red-500/15">
                <div className="text-2xl font-black text-red-400">{unknown}</div>
                <div className="text-xs text-[#5a5a72] mt-1">Still learning ✗</div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setStarted(false)}>
                Change Deck
              </Button>
              <Button className="flex-1" onClick={start}>
                <RotateCcw className="w-3.5 h-3.5" />
                Retry
              </Button>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-up">
      <div className="flex items-start justify-between px-8 pt-8 pb-0">
        <div>
          <h1 className="font-playfair text-2xl font-black">Flashcards</h1>
          <p className="text-sm text-[#9090a8] mt-1">{categories.find(c => c.id === catId)?.name}</p>
        </div>
        <Button variant="secondary" onClick={() => setStarted(false)}>Change Deck</Button>
      </div>

      <div className="p-8 flex flex-col items-center">
        {/* Progress */}
        <div className="w-full max-w-lg mb-6">
          <div className="flex justify-between text-xs text-[#5a5a72] mb-2">
            <span>{idx + 1} / {words.length}</span>
            <span className="text-[#a78bfa]">Click card to flip</span>
          </div>
          <ProgressBar value={((idx + 1) / words.length) * 100} />
        </div>

        {/* Flashcard */}
        <div className="flashcard-container w-full max-w-lg" style={{ height: '300px' }}>
          <div
            className={`flashcard-inner ${flipped ? 'flipped' : ''}`}
            style={{ height: '300px' }}
            onClick={() => setFlipped(!flipped)}
          >
            {/* Front */}
            <div className="flashcard-face bg-[#12121a] border border-white/[0.08] rounded-2xl flex flex-col items-center justify-center p-8 cursor-pointer select-none">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#5a5a72] mb-4">{labels.front}</p>
              <p className="font-playfair text-4xl font-black text-center">{frontText()}</p>
              <p className="text-[#5a5a72] text-sm mt-5">tap to reveal</p>
            </div>

            {/* Back */}
            <div className="flashcard-face flashcard-back bg-gradient-to-br from-[#7c6af7]/10 to-[#a78bfa]/5 border border-[#7c6af7]/20 rounded-2xl flex flex-col items-center justify-center p-8 cursor-pointer select-none">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#a78bfa] mb-4">{labels.back}</p>
              <p className={`font-playfair font-black text-center ${mode === 'eng_to_meaning' ? 'text-xl' : 'text-3xl text-[#f5c842]'}`}>
                {backText()}
              </p>
              {mode !== 'eng_to_meaning' && (
                <p className="text-[#9090a8] text-sm mt-3 text-center max-w-xs">{card?.english_meaning}</p>
              )}
              {card?.example && (
                <p className="text-[#5a5a72] text-xs italic mt-4 text-center max-w-xs border-t border-white/[0.06] pt-3">
                  `{card.example}`
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Know / Don't know buttons */}
        {flipped && (
          <div className="flex gap-4 mt-8 animate-fade-in">
            <Button variant="danger" size="lg" className="w-36" onClick={() => handleKnow(false)}>
              <X className="w-4 h-4" /> Still Learning
            </Button>
            <Button variant="primary" size="lg" className="w-36 bg-emerald-600 hover:bg-emerald-500" onClick={() => handleKnow(true)}>
              <Check className="w-4 h-4" /> Knew It!
            </Button>
          </div>
        )}

        {!flipped && (
          <div className="flex gap-4 mt-8">
            <Button variant="secondary" onClick={() => { setFlipped(false); setIdx(i => Math.max(0, i - 1)) }}>
              <ChevronLeft className="w-4 h-4" /> Prev
            </Button>
            <Button variant="secondary" onClick={() => { setFlipped(false); setIdx(i => Math.min(words.length - 1, i + 1)) }}>
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Score counter */}
        <div className="flex gap-6 mt-6 text-sm text-[#5a5a72]">
          <span className="text-emerald-400">✓ {known}</span>
          <span className="text-red-400">✗ {unknown}</span>
        </div>
      </div>
    </div>
  )
}