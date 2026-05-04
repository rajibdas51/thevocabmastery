'use client'
import { useState, useCallback } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { Trash2, CheckCircle, Circle } from 'lucide-react'
import type { Word, PartOfSpeech } from '@/types'
import { POS_LABELS } from '@/types'
import { cn } from '@/lib/utils'

interface WordCardProps {
  word: Word
  isAdmin?: boolean
  userId?: string
  onDelete?: (id: string) => void
  onMarkLearned?: (id: string) => void
  compact?: boolean
}

function PosTag({ pos }: { pos: PartOfSpeech }) {
  const { short, color } = POS_LABELS[pos]
  return (
    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border flex-shrink-0"
      style={{ color, borderColor: color + '40', backgroundColor: color + '18' }}>
      {short}
    </span>
  )
}

// Text-to-Speech with accent
function speakWord(text: string, accent: 'en-US' | 'en-GB') {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const utt = new SpeechSynthesisUtterance(text)
  utt.lang = accent
  utt.rate = 0.9
  // Try to find a matching voice
  const voices = window.speechSynthesis.getVoices()
  const match = voices.find(v => v.lang.startsWith(accent === 'en-US' ? 'en-US' : 'en-GB'))
  if (match) utt.voice = match
  window.speechSynthesis.speak(utt)
}

function SpeakerButton({ word, accent, flag, label }: { word: string; accent: 'en-US' | 'en-GB'; flag: string; label: string }) {
  const [playing, setPlaying] = useState(false)
  const handle = (e: React.MouseEvent) => {
    e.stopPropagation()
    setPlaying(true)
    speakWord(word, accent)
    setTimeout(() => setPlaying(false), 1500)
  }
  return (
    <button
      onClick={handle}
      title={`Pronounce (${label})`}
      className={cn(
        'flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-medium transition-all',
        playing
          ? 'bg-[var(--accent)]/15 border-[var(--accent)]/40 text-[var(--accent2)]'
          : 'bg-[var(--bg3)] border-[var(--border)] text-[var(--text2)] hover:border-[var(--accent)]/40 hover:text-[var(--accent2)]'
      )}
    >
      <span className="text-base leading-none">{flag}</span>
      <svg className={cn('w-3 h-3 flex-shrink-0', playing && 'text-[var(--accent2)]')} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
      </svg>
    </button>
  )
}

export default function WordCard({ word, isAdmin, userId, onDelete, onMarkLearned, compact }: WordCardProps) {
  const [open, setOpen] = useState(false)
  const [markingLearned, setMarkingLearned] = useState(false)
  const learned = word.user_progress?.status === 'learned'
  const canDelete = isAdmin || word.created_by === userId

  const handleMarkLearned = useCallback(async (e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (!onMarkLearned || markingLearned) return
    setMarkingLearned(true)
    await onMarkLearned(word.id)
    setMarkingLearned(false)
  }, [onMarkLearned, word.id, markingLearned])

  return (
    <>
      <div
        className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 flex flex-col gap-3 cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:border-[var(--border2)] hover:shadow-xl hover:shadow-[var(--shadow)]"
        onClick={() => setOpen(true)}
      >
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-playfair text-[20px] font-black text-[var(--text)]">{word.word}</h3>
              {word.part_of_speech && <PosTag pos={word.part_of_speech} />}
            </div>
            {word.pronunciation && (
              <p className="text-[11px] text-[var(--text3)] font-mono mt-0.5">{word.pronunciation}</p>
            )}
            {word.bangla_meaning && (
              <p className="text-sm text-[var(--gold)] mt-0.5 truncate">{word.bangla_meaning}</p>
            )}
          </div>
          {/* Learned badge */}
          <button
            onClick={handleMarkLearned}
            className={cn(
              'flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold border transition-all',
              learned
                ? 'bg-emerald-500/12 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-[var(--bg3)] border-[var(--border)] text-[var(--text3)] hover:border-[var(--accent)]/40 hover:text-[var(--accent2)]',
              markingLearned && 'opacity-60 cursor-wait'
            )}
            disabled={markingLearned}
            title={learned ? 'Mark as learning' : 'Mark as learned'}
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
            "{word.example}"
          </p>
        )}

        {/* Synonyms / Antonyms */}
        {!compact && (
          <div className="flex flex-wrap gap-1.5 mt-auto">
            {word.synonyms.slice(0, 2).map(s => (
              <span key={s} className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/8 text-emerald-500 border border-emerald-500/20">≈ {s}</span>
            ))}
            {word.antonyms.slice(0, 1).map(s => (
              <span key={s} className="text-[10px] px-2 py-0.5 rounded bg-red-500/8 text-red-400 border border-red-500/20">≠ {s}</span>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Modal open={open} onClose={() => setOpen(false)} size="md">
        <div className="space-y-5">
          {/* Word header */}
          <div>
            <div className="flex items-start gap-3 flex-wrap">
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
              {/* Mark learned button - in modal header */}
              {onMarkLearned && (
                <Button
                  variant={learned ? 'secondary' : 'primary'}
                  size="sm"
                  loading={markingLearned}
                  onClick={() => handleMarkLearned()}
                  className="flex-shrink-0"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  {learned ? 'Unmark' : 'Mark Learned'}
                </Button>
              )}
            </div>

            {/* Speaker buttons */}
            <div className="flex gap-2 mt-3">
              <SpeakerButton word={word.word} accent="en-US" flag="🇺🇸" label="American" />
              <SpeakerButton word={word.word} accent="en-GB" flag="🇬🇧" label="British" />
            </div>
          </div>

          {/* Meaning */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text3)] mb-2">English Meaning</p>
            <p className="text-[15px] leading-relaxed text-[var(--text)]">{word.english_meaning}</p>
          </div>

          {/* Example */}
          {word.example && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text3)] mb-2">Example Sentence</p>
              <p className="text-sm italic text-[var(--text2)] border-l-[3px] border-[var(--accent)] pl-4 leading-relaxed">
                "{word.example}"
              </p>
            </div>
          )}

          {/* Synonyms & Antonyms */}
          <div className="grid grid-cols-2 gap-4">
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
    </>
  )
}