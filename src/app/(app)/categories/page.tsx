'use client'
import { useEffect, useState } from 'react'
import { getCategories, getWords } from '@/lib/db'
import { useAuthStore } from '@/store/auth'
import WordCard from '@/components/words/WordCard'
import PageHeader from '@/components/layout/PageHeader'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import ProgressBar from '@/components/ui/Progressbar'
import { ArrowLeft } from 'lucide-react'
import type { Category, Word } from '@/types'

export default function CategoriesPage() {
  const { profile } = useAuthStore()
  const [categories, setCategories] = useState<Category[]>([])
  const [selected, setSelected] = useState<Category | null>(null)
  const [words, setWords] = useState<Word[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingWords, setLoadingWords] = useState(false)

  useEffect(() => {
    if (!profile) return
    getCategories(profile.id).then(({ data }) => {
      setCategories(data ?? [])
      setLoading(false)
    })
  }, [profile])

  const openCategory = async (cat: Category) => {
    setSelected(cat)
    setLoadingWords(true)
    const { data } = await getWords({ categoryId: cat.id, pageSize: 100 })
    setWords(data)
    setLoadingWords(false)
  }

  if (selected) {
    return (
      <div className="animate-fade-up">
        <div className="flex items-center gap-4 px-8 pt-8 pb-0">
          <Button variant="secondary" size="sm" onClick={() => setSelected(null)}>
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ background: selected.color }} />
              <h1 className="font-playfair text-2xl font-black">{selected.name}</h1>
            </div>
            <p className="text-sm text-[#9090a8] mt-0.5">{selected.word_count} words</p>
          </div>
        </div>
        <div className="p-8">
          {loadingWords ? (
            <div className="grid grid-cols-3 gap-4">
              {Array(6).fill(0).map((_, i) => <div key={i} className="skeleton h-48 rounded-2xl" />)}
            </div>
          ) : words.length === 0 ? (
            <div className="text-center py-20 text-[#5a5a72]">
              <p className="text-3xl mb-3">📭</p>
              <p>No words in this category yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {words.map(w => (
                <WordCard key={w.id} word={w} isAdmin={profile?.role === 'admin'} userId={profile?.id} />
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Categories & Lists"
        subtitle="Browse vocabulary by category or list"
      />
      <div className="p-8">
        {loading ? (
          <div className="grid grid-cols-3 gap-4">
            {Array(6).fill(0).map((_, i) => <div key={i} className="skeleton h-40 rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {categories.map(cat => {
              const pct = Math.floor(Math.random() * 60 + 10) // Real: query progress
              return (
                <Card key={cat.id} hover onClick={() => openCategory(cat)} className="p-5">
                  <div className="h-1 rounded-full mb-4" style={{ background: cat.color }} />
                  <h3 className="font-playfair text-lg font-bold">{cat.name}</h3>
                  {cat.description && (
                    <p className="text-xs text-[#5a5a72] mt-1 line-clamp-2">{cat.description}</p>
                  )}
                  <p className="text-[#5a5a72] text-sm mt-2">{cat.word_count} words</p>
                  <div className="mt-4">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-[#5a5a72]">Progress</span>
                      <span className="text-[#5a5a72] font-mono">{pct}%</span>
                    </div>
                    <ProgressBar value={pct} color={cat.color} />
                  </div>
                  <p className="text-[10px] text-[#7c6af7] mt-3 font-semibold">Browse words →</p>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}