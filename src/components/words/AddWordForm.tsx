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
import { Sparkles, PlusCircle, Loader2 } from 'lucide-react'
import type { Category, PartOfSpeech } from '@/types'

interface AddWordFormProps {
  categories: Category[]
  onSuccess?: () => void
}

const POS_OPTIONS = [
  { value: '', label: 'Select part of speech' },
  { value: 'noun', label: 'Noun (n.)' },
  { value: 'verb', label: 'Verb (v.)' },
  { value: 'adjective', label: 'Adjective (adj.)' },
  { value: 'adverb', label: 'Adverb (adv.)' },
  { value: 'preposition', label: 'Preposition (prep.)' },
  { value: 'conjunction', label: 'Conjunction (conj.)' },
  { value: 'interjection', label: 'Interjection (int.)' },
  { value: 'pronoun', label: 'Pronoun (pron.)' },
]

export default function AddWordForm({ categories, onSuccess }: AddWordFormProps) {
  const { profile } = useAuthStore()
  const { add: toast } = useToast()

  const [word, setWord] = useState('')
  const [form, setForm] = useState({
    bangla_meaning: '', english_meaning: '', synonyms: '',
    antonyms: '', example: '', part_of_speech: '', pronunciation: '',
  })
  const [selectedCats, setSelectedCats] = useState<string[]>([])
  const [catMode, setCatMode] = useState<'existing' | 'new'>('existing')
  const [newCatName, setNewCatName] = useState('')
  const [newCatColor, setNewCatColor] = useState('#6366f1')
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleGenerateAI = async () => {
    if (!word.trim()) { toast('Enter a word first', 'error'); return }
    setAiLoading(true)
    try {
      const generated = await generateWordData(word.trim())
      setForm({
        bangla_meaning: generated.bangla_meaning,
        english_meaning: generated.english_meaning,
        synonyms: generated.synonyms.join(', '),
        antonyms: generated.antonyms.join(', '),
        example: generated.example,
        part_of_speech: generated.part_of_speech,
        pronunciation: generated.pronunciation ?? '',
      })
      toast('AI generated word data! Review and save.', 'success')
    } catch (err: any) {
      toast(err.message ?? 'AI generation failed', 'error')
    }
    setAiLoading(false)
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!word.trim()) e.word = 'Word is required'
    if (!form.english_meaning.trim()) e.english_meaning = 'English meaning is required'
    if (catMode === 'existing' && selectedCats.length === 0) e.cats = 'Select at least one category'
    if (catMode === 'new' && !newCatName.trim()) e.cats = 'New category name is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = async () => {
    if (!validate() || !profile) return
    setLoading(true)
    const { error } = await createWord({
      word: word.trim(),
      bangla_meaning: form.bangla_meaning || undefined,
      english_meaning: form.english_meaning,
      synonyms: form.synonyms.split(',').map(s => s.trim()).filter(Boolean),
      antonyms: form.antonyms.split(',').map(s => s.trim()).filter(Boolean),
      example: form.example || undefined,
      part_of_speech: (form.part_of_speech as PartOfSpeech) || undefined,
      pronunciation: form.pronunciation || undefined,
      category_ids: catMode === 'existing' ? selectedCats : [],
      new_category_name: catMode === 'new' ? newCatName : undefined,
      new_category_color: catMode === 'new' ? newCatColor : undefined,
    }, profile.id)

    setLoading(false)
    if (error) { toast(error, 'error'); return }

    toast('Word saved successfully! 🎉', 'success')
    setWord('')
    setForm({ bangla_meaning: '', english_meaning: '', synonyms: '', antonyms: '', example: '', part_of_speech: '', pronunciation: '' })
    setSelectedCats([])
    setNewCatName('')
    onSuccess?.()
  }

  const toggleCat = (id: string) => {
    setSelectedCats(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])
  }

  return (
    <div className="space-y-6">
      {/* Word + AI button */}
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
          <Button
            variant="outline"
            onClick={handleGenerateAI}
            loading={aiLoading}
            className="flex-shrink-0 h-[42px]"
            title="Generate all fields using Gemini AI"
          >
            <Sparkles className="w-4 h-4" />
            {aiLoading ? 'Generating...' : 'AI Fill'}
          </Button>
        </div>
        {!aiLoading && word && (
          <p className="text-[11px] text-[#5a5a72] mt-1.5">
            💡 Click <strong>AI Fill</strong> to auto-generate all fields using Gemini AI, then review before saving.
          </p>
        )}
      </div>

      {/* AI loading state */}
      {aiLoading && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-[#7c6af7]/8 border border-[#7c6af7]/20">
          <Loader2 className="w-4 h-4 animate-spin text-[#a78bfa]" />
          <p className="text-sm text-[#a78bfa]">Gemini AI is generating word data for "{word}"...</p>
        </div>
      )}

      {/* Form fields */}
      <div className="grid grid-cols-2 gap-4">
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
        <div className="col-span-2">
          <Input
            label="English Meaning *"
            placeholder="Clear definition in English"
            value={form.english_meaning}
            onChange={e => setForm({ ...form, english_meaning: e.target.value })}
            error={errors.english_meaning}
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
        <div className="col-span-2">
          <Textarea
            label="Example Sentence"
            placeholder="Use the word in a natural sentence..."
            value={form.example}
            onChange={e => setForm({ ...form, example: e.target.value })}
          />
        </div>
        <div className="col-span-2">
          <Select
            label="Part of Speech"
            value={form.part_of_speech}
            onChange={v => setForm({ ...form, part_of_speech: v })}
            options={POS_OPTIONS}
          />
        </div>
      </div>

      {/* Category section */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-[#9090a8] mb-3">Add to Category</p>
        <div className="flex gap-2 mb-3">
          <Button variant={catMode === 'existing' ? 'primary' : 'secondary'} size="sm" onClick={() => setCatMode('existing')}>
            Existing Category
          </Button>
          <Button variant={catMode === 'new' ? 'primary' : 'secondary'} size="sm" onClick={() => setCatMode('new')}>
            + Create New
          </Button>
        </div>

        {catMode === 'existing' ? (
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => toggleCat(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  selectedCats.includes(cat.id)
                    ? 'bg-[#7c6af7] border-[#7c6af7] text-white'
                    : 'bg-[#1a1a26] border-white/10 text-[#9090a8] hover:border-white/20'
                }`}
              >
                {cat.name}
              </button>
            ))}
            {categories.length === 0 && (
              <p className="text-xs text-[#5a5a72]">No categories yet. Create one!</p>
            )}
          </div>
        ) : (
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <Input label="Category Name" placeholder="e.g. My Special Words" value={newCatName} onChange={e => setNewCatName(e.target.value)} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#9090a8] mb-1.5">Color</p>
              <input type="color" value={newCatColor} onChange={e => setNewCatColor(e.target.value)}
                className="w-10 h-10 rounded-lg border border-white/10 cursor-pointer bg-[#1a1a26] p-1" />
            </div>
          </div>
        )}
        {errors.cats && <p className="text-xs text-red-400 mt-1.5">{errors.cats}</p>}
      </div>

      <Button onClick={handleSave} loading={loading} className="w-full" size="lg">
        <PlusCircle className="w-4 h-4" />
        Save Word
      </Button>
    </div>
  )
}