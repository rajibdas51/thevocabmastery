'use client'
import { useState, useCallback } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { Trash2, CheckCircle, Circle } from 'lucide-react'
import { useSpeech } from '@/hooks/useSpeech'
import type { Word, PartOfSpeech } from '@/types'
import { POS_LABELS } from '@/types'
import { cn } from '@/lib/utils'

// ─── Part-of-speech tag ───────────────────────────────────────
function PosTag({ pos }: { pos: PartOfSpeech }) {
  const { short, color } = POS_LABELS[pos]
  return (
    <span
      className="text-[10px] font-bold px-1.5 py-0.5 rounded border flex-shrink-0 whitespace-nowrap"
      style={{ color, borderColor: color + '40', backgroundColor: color + '18' }}
    >
      {short}
    </span>
  )
}

// ─── Speaker button with flag ─────────────────────────────────
function SpeakerBtn({
  word, accent, flag,
}: {
  word: string
  accent: 'en-US' | 'en-GB'
  flag: string
}) {
  const speak  = useSpeech()
  const [active, setActive] = useState(false)
  const label  = accent === 'en-US' ? 'American' : 'British'

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setActive(true)
    speak(word, accent)
    // Reset visual after ~1.5 s (typical word TTS duration)
    setTimeout(() => setActive(false), 1500)
  }

  return (
    <button
      onClick={handleClick}
      title={`${label} pronunciation`}
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all duration-150 select-none',
        active
          ? 'bg-[var(--accent)]/15 border-[var(--accent)]/50 text-[var(--accent2)] scale-95'
          : 'bg-[var(--bg3)] border-[var(--border2)] text-[var(--text2)] hover:border-[var(--accent)]/40 hover:text-[var(--accent2)] hover:bg-[var(--accent)]/8'
      )}
    >
      {/* Country flag */}
      <span className="text-base leading-none" aria-label={label}>{flag}</span>

      {/* Speaker icon — extra wave arc when active */}
      <svg
        className="w-3.5 h-3.5 flex-shrink-0"
        viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth={2}
        strokeLinecap="round" strokeLinejoin="round"
      >
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
        {active && <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />}
      </svg>

      {/* Label */}
      <span className="hidden sm:inline">{accent === 'en-US' ? 'US' : 'UK'}</span>
    </button>
  )
}

// ─── Word Card ────────────────────────────────────────────────
interface WordCardProps {
  word: Word
  isAdmin?: boolean
  userId?: string
  onDelete?: (id: string) => void
  onMarkLearned?: (id: string) => void
  compact?: boolean
}

export default function WordCard({
  word, isAdmin, userId, onDelete, onMarkLearned, compact,
}: WordCardProps) {
  const [open,    setOpen]    = useState(false)
  const [marking, setMarking] = useState(false)

  const learned   = word.user_progress?.status === 'learned'
  const canDelete = isAdmin || word.created_by === userId

  const handleMarkLearned = useCallback(
    async (e?: React.MouseEvent) => {
      e?.stopPropagation()
      if (!onMarkLearned || marking) return
      setMarking(true)
      await onMarkLearned(word.id)
      setMarking(false)
    },
    [onMarkLearned, word.id, marking]
  )

  return (
    <>
    <div className='max-h-[80vh] overflow-y-auto'>
      {/*wordcard */}
      <div
        onClick={() => setOpen(true)}
        className="relative bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 flex flex-col gap-3 cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:border-[var(--border2)] hover:shadow-xl hover:shadow-[var(--shadow)]"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-playfair text-[20px] font-black text-[var(--text)] leading-tight">
                {word.word}
              </h3>
              {word.part_of_speech && <PosTag pos={word.part_of_speech} />}
            </div>
            {word.pronunciation && (
              <p className="text-[11px] text-[var(--text3)] font-mono mt-0.5">{word.pronunciation}</p>
            )}
            {word.bangla_meaning && (
              <p className="text-sm mt-0.5 truncate" style={{ color: 'var(--gold)' }}>
                {word.bangla_meaning}
              </p>
            )}
          </div>

          {/* Learned pill */}
          <button
            onClick={handleMarkLearned}
            disabled={marking}
            title={learned ? 'Click to unmark' : 'Mark as learned'}
            className={cn(
              'flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold border transition-all',
              learned
                ? 'bg-emerald-500/12 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/20'
                : 'bg-[var(--bg3)] border-[var(--border)] text-[var(--text3)] hover:border-[var(--accent)]/40 hover:text-[var(--accent2)]',
              marking && 'opacity-50 cursor-wait'
            )}
          >
            {learned
              ? <><CheckCircle className="w-3 h-3" />Learned</>
              : <><Circle className="w-3 h-3" />Learn</>
            }
          </button>
        </div>

        {/* Meaning */}
        <p className="text-sm text-[var(--text2)] leading-relaxed line-clamp-2">{word.english_meaning}</p>

        {/* Example */}
        {word.example && !compact && (
          <p className="text-xs text-[var(--text3)] italic border-l-2 border-[var(--border2)] pl-3 line-clamp-2">
            `{word.example}` 
          </p>
        )}

        {/* Syn / Ant chips */}
        {!compact && (
          <div className="flex flex-wrap gap-1.5 mt-auto pt-1">
            {word.synonyms.slice(0, 2).map(s => (
              <span key={s} className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/8 text-emerald-500 border border-emerald-500/20">
                ≈ {s}
              </span>
            ))}
            {word.antonyms.slice(0, 1).map(s => (
              <span key={s} className="text-[10px] px-2 py-0.5 rounded bg-red-500/8 text-red-400 border border-red-500/20">
                ≠ {s}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Detail Modal ─────────────────────────────────── */}
      <div className='relative'>
        <div className='absolute top-2 right-2'>

       
        
      <Modal open={open} onClose={() => setOpen(false)}  size="md">
        <div className="space-y-5">
          {/* Word header */}
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="font-playfair text-3xl font-black text-[var(--text)]">{word.word}</h2>
                {word.part_of_speech && <PosTag pos={word.part_of_speech} />}
              </div>
              {word.pronunciation && (
                <p className="text-sm text-[var(--text3)] font-mono mt-0.5">{word.pronunciation}</p>
              )}
              {word.bangla_meaning && (
                <p className="text-base mt-1" style={{ color: 'var(--gold)' }}>{word.bangla_meaning}</p>
              )}
            </div>
            {onMarkLearned && (
              <Button
                variant={learned ? 'secondary' : 'primary'}
                size="sm"
                loading={marking}
                onClick={() => handleMarkLearned()}
                className="flex-shrink-0 mt-1"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                {learned ? 'Unmark' : 'Mark Learned'}
              </Button>
            )}
          </div>

          {/* ── Pronunciation ── */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text3)] mb-2.5">
              Pronunciation
            </p>
            <div className="flex gap-2 flex-wrap">
              <SpeakerBtn word={word.word} accent="en-US" flag="🇺🇸" />
              <SpeakerBtn word={word.word} accent="en-GB" flag="🇬🇧" />
            </div>
          </div>

          {/* Meaning */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text3)] mb-2">
              English Meaning
            </p>
            <p className="text-[15px] leading-relaxed text-[var(--text)]">{word.english_meaning}</p>
          </div>

          {/* Example */}
          {word.example && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text3)] mb-2">
                Example Sentence
              </p>
              <p className="text-sm italic text-[var(--text2)] border-l-[3px] border-[var(--accent)] pl-4 leading-relaxed">
                `{word.example}` 
              </p>
            </div>
          )}

          {/* Synonyms & Antonyms */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text3)] mb-2">
                Synonyms ({word.synonyms.length})
              </p>
              {word.synonyms.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {word.synonyms.map(s => (
                    <span key={s} className="text-xs px-2 py-1 rounded-lg bg-emerald-500/8 text-emerald-500 border border-emerald-500/15">{s}</span>
                  ))}
                </div>
              ) : <p className="text-xs text-[var(--text3)]">None added</p>}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text3)] mb-2">
                Antonyms ({word.antonyms.length})
              </p>
              {word.antonyms.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {word.antonyms.map(s => (
                    <span key={s} className="text-xs px-2 py-1 rounded-lg bg-red-500/8 text-red-400 border border-red-500/15">{s}</span>
                  ))}
                </div>
              ) : <p className="text-xs text-[var(--text3)]">None added</p>}
            </div>
          </div>

          {/* Categories */}
          {word.categories && word.categories.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text3)] mb-2">Categories</p>
              <div className="flex flex-wrap gap-1.5">
                {word.categories.map(cat => (
                  <Badge key={cat.id} variant="purple">{cat.name}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Admin delete */}
          {canDelete && onDelete && (
            <div className="pt-3 border-t border-[var(--border)]">
              <Button variant="danger" size="sm" onClick={() => { onDelete(word.id); setOpen(false) }}>
                <Trash2 className="w-3.5 h-3.5" /> Delete Word
              </Button>
            </div>
          )}
        </div>
      </Modal>
 </div>
      </div>
      
      </div>
    </>
  )
}