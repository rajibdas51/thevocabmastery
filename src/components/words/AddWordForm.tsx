'use client'
import { useState } from 'react'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import { createWord } from '@/lib/db'
import { generateWordData } from '@/lib/gemini'
import { useAuthStore } from '@/store/auth'
import { useToast } from '@/components/ui/Toast'
import { Sparkles, PlusCircle } from 'lucide-react'
import type { Category, PartOfSpeech } from '@/types'

interface AddWordFormProps {
  categories: Category[]
  onSuccess?: () => void
}

const POS_OPTIONS = [
  { value: '',             label: 'Select part of speech' },
  { value: 'noun',         label: 'Noun (n.)'        },
  { value: 'verb',         label: 'Verb (v.)'        },
  { value: 'adjective',    label: 'Adjective (adj.)' },
  { value: 'adverb',       label: 'Adverb (adv.)'   },
  { value: 'preposition',  label: 'Preposition (prep.)' },
  { value: 'conjunction',  label: 'Conjunction (conj.)' },
  { value: 'interjection', label: 'Interjection (int.)' },
  { value: 'pronoun',      label: 'Pronoun (pron.)'  },
]

export default function AddWordForm({ categories, onSuccess }: AddWordFormProps) {
  const { profile }    = useAuthStore()
  const { add: toast } = useToast()
  const isAdmin        = profile?.role === 'admin'

  const [word,     setWord]     = useState('')
  const [form,     setForm]     = useState({
    bangla_meaning: '', english_meaning: '', synonyms: '',
    antonyms: '', example: '', part_of_speech: '', pronunciation: '',
  })
  const [selectedCats, setSelectedCats] = useState<string[]>([])
  const [catMode,      setCatMode]      = useState<'existing' | 'new'>('existing')
  const [newCatName,   setNewCatName]   = useState('')
  const [newCatColor,  setNewCatColor]  = useState('#6366f1')
  const [saving,   setSaving]   = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [errors,   setErrors]   = useState<Record<string, string>>({})

  // ── AI fill (admin only) ──────────────────────────────────
  const handleGenerateAI = async () => {
    if (!isAdmin) return
    if (!word.trim()) { toast('Enter a word first', 'error'); return }
    setAiLoading(true)
    try {
      const gen = await generateWordData(word.trim())
      setForm({
        bangla_meaning:  gen.bangla_meaning,
        english_meaning: gen.english_meaning,
        synonyms:        gen.synonyms.join(', '),
        antonyms:        gen.antonyms.join(', '),
        example:         gen.example,
        part_of_speech:  gen.part_of_speech,
        pronunciation:   gen.pronunciation ?? '',
      })
      toast('AI filled all fields! Review and save.', 'success')
    } catch (err: any) {
      toast(err.message ?? 'AI generation failed', 'error')
    }
    setAiLoading(false)
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!word.trim())               e.word    = 'Word is required'
    if (!form.english_meaning.trim()) e.meaning = 'English meaning is required'
    if (catMode === 'existing' && selectedCats.length === 0) e.cats = 'Select at least one category'
    if (catMode === 'new'      && !newCatName.trim())        e.cats = 'Category name is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = async () => {
    if (!validate() || !profile) return
    setSaving(true)
    const { error } = await createWord({
      word:            word.trim(),
      bangla_meaning:  form.bangla_meaning  || undefined,
      english_meaning: form.english_meaning,
      synonyms:  form.synonyms.split(',').map(s => s.trim()).filter(Boolean),
      antonyms:  form.antonyms.split(',').map(s => s.trim()).filter(Boolean),
      example:         form.example         || undefined,
      part_of_speech:  (form.part_of_speech as PartOfSpeech) || undefined,
      pronunciation:   form.pronunciation   || undefined,
      category_ids:    catMode === 'existing' ? selectedCats : [],
      new_category_name:  catMode === 'new' ? newCatName   : undefined,
      new_category_color: catMode === 'new' ? newCatColor  : undefined,
    }, profile.id)

    setSaving(false)
    if (error) { toast(error, 'error'); return }

    toast('Word saved! 🎉', 'success')
    setWord('')
    setForm({ bangla_meaning: '', english_meaning: '', synonyms: '', antonyms: '', example: '', part_of_speech: '', pronunciation: '' })
    setSelectedCats([])
    setNewCatName('')
    onSuccess?.()
  }

  const toggleCat = (id: string) =>
    setSelectedCats(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])

  return (
    <div className="space-y-5">

      {/* ── Word input + AI button ── */}
      <div>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <Input
              label="English Word *"
              placeholder="e.g. Ephemeral"
              value={word}
              onChange={e => setWord(e.target.value)}
              error={errors.word}
            />
          </div>

          {/* AI Fill — admin only */}
          {isAdmin && (
            <Button
              variant="outline"
              onClick={handleGenerateAI}
              loading={aiLoading}
              className="flex-shrink-0 h-[42px]"
              title="Auto-fill all fields using Gemini AI (Admin only)"
            >
              <Sparkles className="w-4 h-4" />
              {aiLoading ? 'Generating…' : 'AI Fill'}
            </Button>
          )}
        </div>

        {/* AI hint text — admin only */}
        {isAdmin && word && !aiLoading && (
          <p className="text-[11px] mt-1.5" style={{ color: 'var(--text3)' }}>
            💡 Click <strong>AI Fill</strong> to auto-generate all fields using Gemini AI.
          </p>
        )}

        {/* AI loading banner */}
        {aiLoading && (
          <div className="mt-2 flex items-center gap-3 p-3 rounded-xl border"
            style={{ background: 'var(--accent)' + '12', borderColor: 'var(--accent)' + '30' }}>
            <Sparkles className="w-4 h-4 animate-pulse" style={{ color: 'var(--accent2)' }} />
            <p className="text-sm" style={{ color: 'var(--accent2)' }}>
              Gemini AI is generating data for `<strong>{word}</strong>`
            </p>
          </div>
        )}
      </div>

      {/* ── Form fields ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Bangla Meaning"
          placeholder="বাংলা অর্থ"
          value={form.bangla_meaning}
          onChange={e => setForm({ ...form, bangla_meaning: e.target.value })}
        />
        <Input
          label="Pronunciation"
          placeholder="e.g. /ɛ-FEM-er-əl/"
          value={form.pronunciation}
          onChange={e => setForm({ ...form, pronunciation: e.target.value })}
        />
        <div className="col-span-1 sm:col-span-2">
          <Input
            label="English Meaning *"
            placeholder="Clear definition in English"
            value={form.english_meaning}
            onChange={e => setForm({ ...form, english_meaning: e.target.value })}
            error={errors.meaning}
          />
        </div>
        <Input
          label="Synonyms (comma separated)"
          placeholder="e.g. fleeting, transient, brief"
          value={form.synonyms}
          onChange={e => setForm({ ...form, synonyms: e.target.value })}
        />
        <Input
          label="Antonyms (comma separated)"
          placeholder="e.g. permanent, eternal"
          value={form.antonyms}
          onChange={e => setForm({ ...form, antonyms: e.target.value })}
        />
        <div className="col-span-1 sm:col-span-2">
          <Textarea
            label="Example Sentence"
            placeholder="Use the word in a natural sentence…"
            value={form.example}
            onChange={e => setForm({ ...form, example: e.target.value })}
          />
        </div>
        <div className="col-span-1 sm:col-span-2">
          <Select
            label="Part of Speech"
            value={form.part_of_speech}
            onChange={v => setForm({ ...form, part_of_speech: v })}
            options={POS_OPTIONS}
          />
        </div>
      </div>

      {/* ── Category picker ── */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text2)' }}>
          Add to Category
        </p>
        <div className="flex gap-2 mb-3">
          <Button
            variant={catMode === 'existing' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setCatMode('existing')}
          >
            Existing
          </Button>
          <Button
            variant={catMode === 'new' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setCatMode('new')}
          >
            + Create New
          </Button>
        </div>

        {catMode === 'existing' ? (
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => toggleCat(cat.id)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                style={{
                  background:   selectedCats.includes(cat.id) ? 'var(--accent)'   : 'var(--bg3)',
                  borderColor:  selectedCats.includes(cat.id) ? 'var(--accent)'   : 'var(--border2)',
                  color:        selectedCats.includes(cat.id) ? '#fff'            : 'var(--text2)',
                }}
              >
                {cat.name}
              </button>
            ))}
            {categories.length === 0 && (
              <p className="text-xs" style={{ color: 'var(--text3)' }}>No categories yet. Create one!</p>
            )}
          </div>
        ) : (
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <Input
                label="Category Name"
                placeholder="e.g. My Special Words"
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
              />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text2)' }}>
                Color
              </p>
              <input
                type="color"
                value={newCatColor}
                onChange={e => setNewCatColor(e.target.value)}
                className="w-10 h-10 rounded-lg cursor-pointer p-1 border"
                style={{ background: 'var(--bg3)', borderColor: 'var(--border2)' }}
              />
            </div>
          </div>
        )}
        {errors.cats && <p className="text-xs text-red-400 mt-1.5">{errors.cats}</p>}
      </div>

      <Button onClick={handleSave} loading={saving} className="w-full" size="lg">
        <PlusCircle className="w-4 h-4" /> Save Word
      </Button>
    </div>
  )
}