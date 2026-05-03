'use client'
import { useState } from 'react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { Trash2, CheckCircle, Volume2 } from 'lucide-react'
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
    <span
      className="text-[10px] font-bold px-1.5 py-0.5 rounded border"
      style={{ color, borderColor: color + '40', backgroundColor: color + '12' }}
    >
      {short}
    </span>
  )
}

export default function WordCard({ word, isAdmin, userId, onDelete, onMarkLearned, compact }: WordCardProps) {
  const [open, setOpen] = useState(false)
  const learned = word.user_progress?.status === 'learned'
  const canDelete = isAdmin || word.created_by === userId

  return (
    <>
      <Card hover onClick={() => setOpen(true)} className="p-5 flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-playfair text-xl font-black">{word.word}</h3>
              {word.part_of_speech && <PosTag pos={word.part_of_speech} />}
            </div>
            {word.pronunciation && (
              <p className="text-[11px] text-[#5a5a72] font-mono mt-0.5">{word.pronunciation}</p>
            )}
            {word.bangla_meaning && (
              <p className="text-sm text-[#f5c842] mt-0.5 truncate">{word.bangla_meaning}</p>
            )}
          </div>
          <Badge variant={learned ? 'green' : 'yellow'} className="flex-shrink-0">
            {learned ? '✓ Learned' : 'Learning'}
          </Badge>
        </div>

        <p className="text-sm text-[#9090a8] leading-relaxed line-clamp-2">{word.english_meaning}</p>

        {word.example && !compact && (
          <p className="text-xs text-[#5a5a72] italic border-l-2 border-white/10 pl-3 line-clamp-2">
            "{word.example}"
          </p>
        )}

        {!compact && (
          <div className="flex flex-wrap gap-1.5 mt-auto">
            {word.synonyms.slice(0, 2).map(s => (
              <span key={s} className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/8 text-emerald-400 border border-emerald-500/15">
                ≈ {s}
              </span>
            ))}
            {word.antonyms.slice(0, 1).map(s => (
              <span key={s} className="text-[10px] px-2 py-0.5 rounded bg-red-500/8 text-red-400 border border-red-500/15">
                ≠ {s}
              </span>
            ))}
          </div>
        )}
      </Card>

      {/* Detail Modal */}
      <Modal open={open} onClose={() => setOpen(false)} size="md">
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="font-playfair text-3xl font-black">{word.word}</h2>
                {word.part_of_speech && <PosTag pos={word.part_of_speech} />}
              </div>
              {word.pronunciation && (
                <p className="text-sm text-[#5a5a72] font-mono mt-0.5">{word.pronunciation}</p>
              )}
              {word.bangla_meaning && (
                <p className="text-base text-[#f5c842] mt-1">{word.bangla_meaning}</p>
              )}
            </div>
            {onMarkLearned && (
              <Button
                variant={learned ? 'secondary' : 'primary'}
                size="sm"
                onClick={() => { onMarkLearned(word.id); setOpen(false) }}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                {learned ? 'Unmark' : 'Mark Learned'}
              </Button>
            )}
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#5a5a72] mb-2">English Meaning</p>
            <p className="text-[15px] leading-relaxed">{word.english_meaning}</p>
          </div>

          {word.example && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#5a5a72] mb-2">Example Sentence</p>
              <p className="text-sm italic text-[#9090a8] border-l-[3px] border-[#7c6af7] pl-4 leading-relaxed">
                "{word.example}"
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#5a5a72] mb-2">
                Synonyms ({word.synonyms.length})
              </p>
              {word.synonyms.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {word.synonyms.map(s => (
                    <span key={s} className="text-xs px-2 py-1 rounded-lg bg-emerald-500/8 text-emerald-300 border border-emerald-500/15">
                      {s}
                    </span>
                  ))}
                </div>
              ) : <p className="text-xs text-[#5a5a72]">None added</p>}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#5a5a72] mb-2">
                Antonyms ({word.antonyms.length})
              </p>
              {word.antonyms.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {word.antonyms.map(s => (
                    <span key={s} className="text-xs px-2 py-1 rounded-lg bg-red-500/8 text-red-300 border border-red-500/15">
                      {s}
                    </span>
                  ))}
                </div>
              ) : <p className="text-xs text-[#5a5a72]">None added</p>}
            </div>
          </div>

          {word.categories && word.categories.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#5a5a72] mb-2">Categories</p>
              <div className="flex flex-wrap gap-1.5">
                {word.categories.map(cat => (
                  <Badge key={cat.id} variant="purple">{cat.name}</Badge>
                ))}
              </div>
            </div>
          )}

          {canDelete && onDelete && (
            <div className="pt-3 border-t border-white/[0.06]">
              <Button variant="danger" size="sm" onClick={() => { onDelete(word.id); setOpen(false) }}>
                <Trash2 className="w-3.5 h-3.5" />
                Delete Word
              </Button>
            </div>
          )}
        </div>
      </Modal>
    </>
  )
}