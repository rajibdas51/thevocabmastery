'use client'
import { useEffect, useState, useCallback } from 'react'
import { getWords, getCategories, deleteWord, upsertProgress, updateWord } from '@/lib/db'
import { recordActivity } from '@/lib/streak'
import { useStreakStore } from '@/store/streak'
import { useAuthStore } from '@/store/auth'
import { useToast } from '@/components/ui/Toast'
import WordCard from '@/components/words/WordCard'
import PageHeader from '@/components/layout/PageHeader'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import { Search, ArrowDownAZ, ArrowUpZA } from 'lucide-react'
import type { Word, Category } from '@/types'
import { cn } from '@/lib/utils'

type SortMode = 'az' | 'za'

export default function WordsPage() {
  const { profile }    = useAuthStore()
  const { refresh }    = useStreakStore()
  const { add: toast } = useToast()
  const isAdmin        = profile?.role === 'admin'

  const [words,      setWords]      = useState<Word[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [total,      setTotal]      = useState(0)
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [catFilter,  setCatFilter]  = useState('')
  const [sort,       setSort]       = useState<SortMode>('az')
  const [page,       setPage]       = useState(1)

  // Edit modal state
  const [editWord,   setEditWord]   = useState<Word | null>(null)
  const [editForm,   setEditForm]   = useState({ word:'', english_meaning:'', bangla_meaning:'', synonyms:'', antonyms:'', example:'', part_of_speech:'', pronunciation:'' })
  const [saving,     setSaving]     = useState(false)

  const PAGE_SIZE = 18

  const load = useCallback(async () => {
    setLoading(true)
    const res = await getWords({
      search: search || undefined,
      categoryId: catFilter || undefined,
      page,
      pageSize: PAGE_SIZE,
      userId: profile?.id,
      sort,
    })
    setWords(res.data); setTotal(res.count); setLoading(false)
  }, [search, catFilter, page, profile?.id, sort])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (profile) getCategories(profile.id).then(({ data }) => setCategories(data ?? []))
  }, [profile])
  useEffect(() => { setPage(1) }, [search, catFilter, sort])

  const handleDelete = async (id: string) => {
    const { error } = await deleteWord(id)
    if (error) { toast(error, 'error'); return }
    toast('Word deleted', 'success'); load()
  }

  const handleMarkLearned = async (wordId: string) => {
    if (!profile) return
    const word = words.find(w => w.id === wordId)
    const newStatus = word?.user_progress?.status === 'learned' ? 'learning' : 'learned'
    const { error } = await upsertProgress(profile.id, wordId, newStatus)
    if (error) { toast(error, 'error'); return }
    if (newStatus === 'learned') {
      await recordActivity(profile.id, 'word_learned', 1)
      refresh(profile.id)
    }
    toast(newStatus === 'learned' ? 'Marked as learned! 🎉' : 'Marked as learning', 'success')
    setWords(prev => prev.map(w => w.id === wordId
      ? { ...w, user_progress: { ...w.user_progress, status: newStatus } as any }
      : w
    ))
  }

  const openEdit = (word: Word) => {
    setEditWord(word)
    setEditForm({
      word:            word.word,
      english_meaning: word.english_meaning,
      bangla_meaning:  word.bangla_meaning ?? '',
      synonyms:        word.synonyms.join(', '),
      antonyms:        word.antonyms.join(', '),
      example:         word.example ?? '',
      part_of_speech:  word.part_of_speech ?? '',
      pronunciation:   word.pronunciation ?? '',
    })
  }

  const handleSaveEdit = async () => {
    if (!editWord) return
    setSaving(true)
    const { error } = await updateWord(editWord.id, {
      word:            editForm.word.trim(),
      english_meaning: editForm.english_meaning.trim(),
      bangla_meaning:  editForm.bangla_meaning.trim() || undefined,
      synonyms:        editForm.synonyms.split(',').map(s => s.trim()).filter(Boolean),
      antonyms:        editForm.antonyms.split(',').map(s => s.trim()).filter(Boolean),
      example:         editForm.example.trim() || undefined,
      part_of_speech:  editForm.part_of_speech || undefined,
      pronunciation:   editForm.pronunciation.trim() || undefined,
    })
    setSaving(false)
    if (error) { toast(error, 'error'); return }
    toast('Word updated!', 'success')
    setEditWord(null)
    load()
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="animate-fade-up">
      <PageHeader title="Browse Words" subtitle={`${total} words in the database`} />
      <div className="p-4 sm:p-8 space-y-4 sm:space-y-5">

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text3)]" />
            <input
              className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--text3)] outline-none focus:border-[var(--accent)]/50 transition-colors"
              placeholder="Search words in English or বাংলা..."
              value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Category filter */}
          <div className="w-full sm:w-48">
            <Select
              value={catFilter} onChange={setCatFilter}
              options={[{ value:'', label:'All Categories' }, ...categories.map(c => ({ value:c.id, label:c.name }))]}
            />
          </div>

          {/* Sort A-Z / Z-A toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setSort('az')}
              className={cn('flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border transition-all',
                sort === 'az'
                  ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                  : 'bg-[var(--card-bg)] border-[var(--border)] text-[var(--text2)] hover:border-[var(--accent)]'
              )}
            >
              <ArrowDownAZ className="w-4 h-4" /> A–Z
            </button>
            <button
              onClick={() => setSort('za')}
              className={cn('flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border transition-all',
                sort === 'za'
                  ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                  : 'bg-[var(--card-bg)] border-[var(--border)] text-[var(--text2)] hover:border-[var(--accent)]'
              )}
            >
              <ArrowUpZA className="w-4 h-4" /> Z–A
            </button>
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array(9).fill(0).map((_,i) => <div key={i} className="skeleton h-48 rounded-2xl"/>)}
          </div>
        ) : words.length === 0 ? (
          <div className="text-center py-16 text-[var(--text3)]">
            <p className="text-4xl mb-3">📭</p>
            <p className="font-semibold">No words found</p>
            <p className="text-sm mt-1">Try a different search or category</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {words.map(word => (
              <WordCard
                key={word.id}
                word={word}
                onDelete={isAdmin ? handleDelete : undefined}
                onMarkLearned={handleMarkLearned}
                onEdit={isAdmin ? openEdit : undefined}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}>← Prev</Button>
            <span className="text-sm font-mono" style={{ color:'var(--text2)' }}>
              {page} / {totalPages}
            </span>
            <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages}>Next →</Button>
          </div>
        )}
      </div>

      {/* Edit Word Modal */}
      <Modal open={!!editWord} onClose={() => setEditWord(null)} title="Edit Word" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Word *"          value={editForm.word}            onChange={e => setEditForm(f=>({...f, word:e.target.value}))}            placeholder="English word" />
            <Input label="Pronunciation"   value={editForm.pronunciation}   onChange={e => setEditForm(f=>({...f, pronunciation:e.target.value}))}   placeholder="/fəˈnetɪk/" />
            <div className="col-span-1 sm:col-span-2">
              <Input label="English Meaning *" value={editForm.english_meaning} onChange={e => setEditForm(f=>({...f, english_meaning:e.target.value}))} placeholder="Clear definition" />
            </div>
            <Input label="Bangla Meaning"  value={editForm.bangla_meaning}  onChange={e => setEditForm(f=>({...f, bangla_meaning:e.target.value}))}  placeholder="বাংলা অর্থ" />
            <Input label="Part of Speech"  value={editForm.part_of_speech}  onChange={e => setEditForm(f=>({...f, part_of_speech:e.target.value}))}  placeholder="noun / verb / adj..." />
            <Input label="Synonyms (comma separated)" value={editForm.synonyms} onChange={e => setEditForm(f=>({...f, synonyms:e.target.value}))} placeholder="word1, word2" />
            <Input label="Antonyms (comma separated)" value={editForm.antonyms} onChange={e => setEditForm(f=>({...f, antonyms:e.target.value}))} placeholder="word1, word2" />
            <div className="col-span-1 sm:col-span-2">
              <Textarea label="Example Sentence" value={editForm.example} onChange={e => setEditForm(f=>({...f, example:e.target.value}))} placeholder="Use in a sentence..." />
            </div>
          </div>
          <Button onClick={handleSaveEdit} loading={saving} className="w-full" size="lg">Save Changes</Button>
        </div>
      </Modal>
    </div>
  )
}
