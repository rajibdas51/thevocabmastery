import type { WordOfDay } from '@/types'
export default function WordOfDayCard({ wotd }: { wotd: WordOfDay | null }) {
  if (!wotd?.word) return (
    <div className="rounded-2xl p-6 border border-[var(--accent)]/20 bg-[var(--accent)]/5">
      <p className="text-xs font-bold uppercase tracking-widest text-[var(--accent2)] mb-3">✦ Word of the Day</p>
      <p className="text-[var(--text3)] text-sm">No word set for today yet.</p>
    </div>
  )
  const w = wotd.word!
  return (
    <div className="rounded-2xl p-6 border border-[var(--accent)]/20 bg-gradient-to-br from-[var(--accent)]/8 to-[var(--blue)]/5 relative overflow-hidden">
      <span className="absolute right-4 -top-4 font-playfair text-[120px] text-[var(--accent)]/5 pointer-events-none select-none leading-none">"</span>
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--accent2)] mb-4">✦ Word of the Day</p>
      <h2 className="font-playfair text-4xl font-black text-[var(--text)]">{w.word}</h2>
      {w.bangla_meaning && <p className="text-[var(--gold)] text-base mt-1">{w.bangla_meaning}</p>}
      <p className="text-[var(--text2)] text-sm mt-3 leading-relaxed">{w.english_meaning}</p>
      {w.example && <p className="text-[var(--text3)] text-xs italic mt-3 border-l-2 border-[var(--border2)] pl-3 leading-relaxed">"{w.example}"</p>}
      <div className="flex flex-wrap gap-1.5 mt-4">
        {w.synonyms.slice(0,3).map(s => (
          <span key={s} className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/8 text-emerald-500 border border-emerald-500/15">{s}</span>
        ))}
      </div>
    </div>
  )
}