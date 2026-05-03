import type { WordOfDay } from '@/types'
import Badge from '@/components/ui/Badge'

interface WOTDProps { wotd: WordOfDay | null }

export default function WordOfDayCard({ wotd }: WOTDProps) {
  if (!wotd?.word) {
    return (
      <div className="rounded-2xl p-6 border border-purple-500/20 bg-gradient-to-br from-purple-500/8 to-blue-500/5">
        <p className="text-xs font-bold uppercase tracking-widest text-[#7c6af7] mb-3">✦ Word of the Day</p>
        <p className="text-[#5a5a72] text-sm">No word set for today yet. Check back later!</p>
      </div>
    )
  }

  const w = wotd.word!
  return (
    <div className="rounded-2xl p-6 border border-purple-500/20 bg-gradient-to-br from-purple-500/8 to-blue-500/5 relative overflow-hidden">
      <span className="absolute right-4 -top-4 font-playfair text-[120px] text-purple-500/5 pointer-events-none select-none leading-none">"</span>
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#a78bfa] mb-4">✦ Word of the Day</p>
      <h2 className="font-playfair text-4xl font-black">{w.word}</h2>
      {w.bangla_meaning && (
        <p className="text-[#f5c842] text-base mt-1">{w.bangla_meaning}</p>
      )}
      <p className="text-[#9090a8] text-sm mt-3 leading-relaxed">{w.english_meaning}</p>
      {w.example && (
        <p className="text-[#5a5a72] text-xs italic mt-3 border-l-2 border-white/10 pl-3 leading-relaxed">
          "{w.example}"
        </p>
      )}
      <div className="flex flex-wrap gap-1.5 mt-4">
        {w.synonyms.slice(0, 3).map(s => (
          <span key={s} className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/8 text-emerald-400 border border-emerald-500/15">
            {s}
          </span>
        ))}
      </div>
    </div>
  )
}