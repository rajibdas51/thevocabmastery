'use client'
import { useEffect, useState, useCallback } from 'react'
import { getWords, getCategories, deleteWord, upsertProgress } from '@/lib/db'
import { useAuthStore } from '@/store/auth'
import { useToast } from '@/components/ui/Toast'
import WordCard from '@/components/words/WordCard'
import PageHeader from '@/components/layout/PageHeader'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import { Search } from 'lucide-react'
import type { Word, Category } from '@/types'

export default function WordsPage() {
  const { profile } = useAuthStore()
  const { add: toast } = useToast()
  const [words, setWords] = useState<Word[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 18

  const load = useCallback(async () => {
    setLoading(true)
    const res = await getWords({ search: search||undefined, categoryId: catFilter||undefined, page, pageSize: PAGE_SIZE, userId: profile?.id })
    setWords(res.data); setTotal(res.count); setLoading(false)
  }, [search, catFilter, page, profile?.id])

  useEffect(() => { load() }, [load])
  useEffect(() => { if(profile) getCategories(profile.id).then(({data}) => setCategories(data??[])) }, [profile])
  useEffect(() => { setPage(1) }, [search, catFilter])

  const handleDelete = async (id: string) => {
    const { error } = await deleteWord(id)
    if (error) { toast(error,'error'); return }
    toast('Word deleted','success'); load()
  }

  const handleMarkLearned = async (wordId: string) => {
    if (!profile) return
    const word = words.find(w => w.id === wordId)
    const newStatus = word?.user_progress?.status === 'learned' ? 'learning' : 'learned'
    const { error } = await upsertProgress(profile.id, wordId, newStatus)
    if (error) { toast(error, 'error'); return }
    toast(newStatus === 'learned' ? 'Marked as learned! 🎉' : 'Marked as learning','success')
    // Update local state immediately for instant feedback
    setWords(prev => prev.map(w => w.id === wordId ? { ...w, user_progress: { ...w.user_progress, status: newStatus } as any } : w))
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="animate-fade-up">
      <PageHeader title="Browse Words" subtitle={`${total} words in the database`} />
      <div className="p-4 sm:p-8 space-y-4 sm:space-y-5">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text3)]" />
            <input className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--text3)] outline-none focus:border-[var(--accent)]/50 transition-colors"
              placeholder="Search words in English or বাংলা..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="w-full sm:w-52">
            <Select value={catFilter} onChange={setCatFilter}
              options={[{value:'',label:'All Categories'}, ...categories.map(c=>({value:c.id,label:c.name}))]} />
          </div>
        </div>

        {/* Grid - 1 col mobile, 2 tablet, 3 desktop */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array(9).fill(0).map((_,i) => <div key={i} className="skeleton h-48 rounded-2xl"/>)}
          </div>
        ) : words.length === 0 ? (
          <div className="text-center py-16 text-[var(--text3)]">
            <p className="text-3xl mb-3">🔍</p>
            <p className="font-semibold">No words found</p>
            <p className="text-sm mt-1">Try a different search or category</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {words.map(w => (
              <WordCard key={w.id} word={w} isAdmin={profile?.role==='admin'} userId={profile?.id} onDelete={handleDelete} onMarkLearned={handleMarkLearned} />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <Button variant="secondary" size="sm" disabled={page===1} onClick={() => setPage(p=>p-1)}>← Prev</Button>
            <span className="text-sm text-[var(--text3)] px-3">Page {page} of {totalPages}</span>
            <Button variant="secondary" size="sm" disabled={page===totalPages} onClick={() => setPage(p=>p+1)}>Next →</Button>
          </div>
        )}
      </div>
    </div>
  )
}