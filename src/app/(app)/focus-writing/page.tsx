'use client'
import { useState, useEffect } from 'react'
import { getFocusWritings, createFocusWriting, deleteFocusWriting } from '@/lib/db'
import { generateFocusWriting, type FocusLanguage } from '@/lib/gemini'
import { useAuthStore } from '@/store/auth'
import { useToast } from '@/components/ui/Toast'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import { ArrowLeft, Plus, Sparkles, Trash2, Tag, FileText } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { FocusWriting } from '@/types'
import { cn } from '@/lib/utils'

const CATEGORIES = [
  'Environment', 'Education', 'Economy', 'Technology',
  'Health', 'Politics', 'Society', 'Bangladesh',
  'Global Affairs', 'Science', 'Other',
]

const LANGUAGES: { value: FocusLanguage; label: string; flag: string }[] = [
  { value: 'english', label: 'English',  flag: '🇬🇧' },
  { value: 'bangla',  label: 'বাংলা (Bangla)', flag: '🇧🇩' },
]

export default function FocusWritingPage() {
  const { profile }    = useAuthStore()
  const { add: toast } = useToast()
  const isAdmin        = profile?.role === 'admin'

  const [writings,   setWritings]   = useState<FocusWriting[]>([])
  const [loading,    setLoading]    = useState(true)
  const [selected,   setSelected]   = useState<FocusWriting | null>(null)
  const [showAdd,    setShowAdd]    = useState(false)
  const [catFilter,  setCatFilter]  = useState('All')
  const [langFilter, setLangFilter] = useState<'all' | FocusLanguage>('all')

  const [form, setForm] = useState({
    title:    '',
    category: 'Environment',
    content:  '',
    tags:     '',
    language: 'english' as FocusLanguage,
  })
  const [saving,    setSaving]    = useState(false)
  const [aiLoading, setAiLoading] = useState(false)

  useEffect(() => { load() }, [])

  const load = async () => {
    const { data } = await getFocusWritings()
    setWritings(data ?? [])
    setLoading(false)
  }

  // ── AI generate — admin only ──────────────────────────────
  const handleAIGenerate = async () => {
    if (!isAdmin) return
    if (!form.title.trim()) { toast('Enter a topic title first', 'error'); return }
    setAiLoading(true)
    try {
      const gen = await generateFocusWriting(form.title, form.category, form.language)
      setForm(f => ({ ...f, content: gen.content, tags: gen.tags.join(', ') }))
      toast(`AI wrote a ${form.language === 'bangla' ? 'Bangla' : 'English'} model answer!`, 'success')
    } catch (err: any) {
      toast(err.message ?? 'AI generation failed', 'error')
    }
    setAiLoading(false)
  }

  const handleSave = async () => {
    if (!form.title || !form.content) { toast('Title and content are required', 'error'); return }
    if (!profile) return
    setSaving(true)
    const { error } = await createFocusWriting({
      title:    form.title,
      category: form.category,
      content:  form.content,
      tags: [
        ...form.tags.split(',').map(t => t.trim()).filter(Boolean),
        form.language, // store language as a tag so we can filter
      ],
    }, profile.id)
    setSaving(false)
    if (error) { toast(error, 'error'); return }
    toast('Focus writing saved!', 'success')
    setShowAdd(false)
    setForm({ title: '', category: 'Environment', content: '', tags: '', language: 'english' })
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this focus writing?')) return
    const { error } = await deleteFocusWriting(id)
    if (error) { toast(error, 'error'); return }
    toast('Deleted', 'success')
    setSelected(null)
    load()
  }

  // Detect language from tags
  const getLang = (fw: FocusWriting): FocusLanguage =>
    fw.tags.includes('bangla') ? 'bangla' : 'english'

  const allCats = ['All', ...Array.from(new Set(writings.map(w => w.category)))]

  const filtered = writings.filter(w => {
    const catOk  = catFilter  === 'All'  || w.category === catFilter
    const langOk = langFilter === 'all'  || getLang(w)  === langFilter
    return catOk && langOk
  })

  // ── DETAIL VIEW ──────────────────────────────────────────
  if (selected) {
    const lang = getLang(selected)
    const visibleTags = selected.tags.filter(t => t !== 'english' && t !== 'bangla')

    return (
      <div className="animate-fade-up">
        <div className="flex items-center gap-3 px-4 sm:px-8 pt-6 sm:pt-8 pb-0 flex-wrap">
          <Button variant="secondary" size="sm" onClick={() => setSelected(null)}>
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </Button>
          {isAdmin && (
            <Button variant="danger" size="sm" onClick={() => handleDelete(selected.id)}>
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </Button>
          )}
        </div>

        <div className="p-4 sm:p-8 max-w-3xl">
          <Card className="p-6 sm:p-8">
            {/* Meta badges */}
            <div className="flex items-center gap-2 flex-wrap mb-5">
              <Badge variant="purple">{selected.category}</Badge>
              <Badge variant={lang === 'bangla' ? 'green' : 'blue'}>
                {lang === 'bangla' ? '🇧🇩 Bangla' : '🇬🇧 English'}
              </Badge>
              <span className="text-xs" style={{ color: 'var(--text3)' }}>
                {formatDate(selected.created_at)}
              </span>
            </div>

            <h1 className="font-playfair text-2xl sm:text-3xl font-black leading-tight mb-6"
              style={{ color: 'var(--text)' }}>
              {selected.title}
            </h1>

            <div className="h-px mb-6" style={{ background: 'var(--border)' }} />

            {/* Content */}
            <div className="prose-content">
              {selected.content.split('\n').map((para, i) =>
                para.trim()
                  ? <p key={i} className="text-[15px] leading-[1.9] mb-4"
                      style={{ color: 'var(--text2)', fontFamily: lang === 'bangla' ? 'inherit' : undefined }}>
                      {para}
                    </p>
                  : <br key={i} />
              )}
            </div>

            {/* Tags */}
            {visibleTags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-6 pt-4"
                style={{ borderTop: '1px solid var(--border)' }}>
                <Tag className="w-3.5 h-3.5" style={{ color: 'var(--text3)' }} />
                {visibleTags.map(t => (
                  <span key={t} className="text-xs px-2 py-0.5 rounded border"
                    style={{ background: 'var(--bg3)', color: 'var(--text3)', borderColor: 'var(--border)' }}>
                    {t}
                  </span>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    )
  }

  // ── LIST VIEW ────────────────────────────────────────────
  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Focus Writing"
        subtitle="Model answers for essay topics — BCS, Bank & competitive exams"
        action={isAdmin ? (
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4" /> Add Topic
          </Button>
        ) : undefined}
      />

      <div className="p-4 sm:p-8">

        {/* ── Filter bar ── */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          {/* Category filter */}
          <div className="flex gap-2 flex-wrap">
            {allCats.map(cat => (
              <button
                key={cat}
                onClick={() => setCatFilter(cat)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                style={{
                  background:  catFilter === cat ? 'var(--accent)'  : 'var(--card-bg)',
                  borderColor: catFilter === cat ? 'var(--accent)'  : 'var(--border)',
                  color:       catFilter === cat ? '#fff'           : 'var(--text2)',
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Language filter */}
          <div className="flex gap-2 sm:ml-auto flex-shrink-0">
            {(['all', 'english', 'bangla'] as const).map(l => (
              <button
                key={l}
                onClick={() => setLangFilter(l)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                style={{
                  background:  langFilter === l ? 'var(--accent)'  : 'var(--card-bg)',
                  borderColor: langFilter === l ? 'var(--accent)'  : 'var(--border)',
                  color:       langFilter === l ? '#fff'           : 'var(--text2)',
                }}
              >
                {l === 'all' ? 'All Languages' : l === 'english' ? '🇬🇧 English' : '🇧🇩 Bangla'}
              </button>
            ))}
          </div>
        </div>

        {/* ── Grid ── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array(4).fill(0).map((_, i) => <div key={i} className="skeleton h-52 rounded-2xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20" style={{ color: 'var(--text3)' }}>
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-semibold">No focus writings yet</p>
            {isAdmin && (
              <Button className="mt-4" onClick={() => setShowAdd(true)}>Add First Topic</Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filtered.map(fw => {
              const lang = getLang(fw)
              const visibleTags = fw.tags.filter(t => t !== 'english' && t !== 'bangla')
              return (
                <Card key={fw.id} hover onClick={() => setSelected(fw)} className="p-5 sm:p-6 flex flex-col gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="purple">{fw.category}</Badge>
                    <Badge variant={lang === 'bangla' ? 'green' : 'blue'}>
                      {lang === 'bangla' ? '🇧🇩 Bangla' : '🇬🇧 English'}
                    </Badge>
                    <span className="text-[10px] ml-auto" style={{ color: 'var(--text3)' }}>
                      {formatDate(fw.created_at)}
                    </span>
                  </div>
                  <h3 className="font-playfair text-lg font-bold leading-snug" style={{ color: 'var(--text)' }}>
                    {fw.title}
                  </h3>
                  <p className="text-sm line-clamp-3" style={{ color: 'var(--text3)' }}>
                    {fw.content}
                  </p>
                  {visibleTags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-auto">
                      {visibleTags.slice(0, 3).map(t => (
                        <span key={t} className="text-[10px] px-2 py-0.5 rounded border"
                          style={{ background: 'var(--bg3)', color: 'var(--text3)', borderColor: 'var(--border)' }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-[11px] font-semibold mt-1" style={{ color: 'var(--accent2)' }}>
                    Read full answer →
                  </p>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Add Modal (admin only) ── */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Focus Writing" size="lg">
        <div className="space-y-4">

          {/* Title + AI button */}
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <Input
                label="Topic Title *"
                placeholder="e.g. Climate Change and Bangladesh"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
              />
            </div>
            {/* AI Write — admin only, always true here since modal is admin-gated */}
            <Button
              variant="outline"
              onClick={handleAIGenerate}
              loading={aiLoading}
              className="h-[42px] flex-shrink-0"
              title="Generate model answer using Gemini AI"
            >
              <Sparkles className="w-4 h-4" />
              {aiLoading ? 'Writing…' : 'AI Write'}
            </Button>
          </div>

          {/* AI loading banner */}
          {aiLoading && (
            <div className="p-3 rounded-xl border flex items-center gap-3"
              style={{ background: 'var(--accent)' + '10', borderColor: 'var(--accent)' + '30' }}>
              <Sparkles className="w-4 h-4 animate-pulse" style={{ color: 'var(--accent2)' }} />
              <p className="text-sm" style={{ color: 'var(--accent2)' }}>
                ✨ Gemini is writing a <strong>{form.language === 'bangla' ? 'Bangla' : 'English'}</strong> model answer for `{form.title} `
              </p>
            </div>
          )}

          {/* ── Language selector ── */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text2)' }}>
              Language
            </p>
            <div className="flex gap-2">
              {LANGUAGES.map(l => (
                <button
                  key={l.value}
                  onClick={() => setForm({ ...form, language: l.value })}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all"
                  style={{
                    background:  form.language === l.value ? 'var(--accent)' : 'var(--bg3)',
                    borderColor: form.language === l.value ? 'var(--accent)' : 'var(--border2)',
                    color:       form.language === l.value ? '#fff'          : 'var(--text2)',
                  }}
                >
                  <span className="text-base">{l.flag}</span>
                  {l.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] mt-1.5" style={{ color: 'var(--text3)' }}>
              {form.language === 'bangla'
                ? 'AI will write the entire content in Bengali script.'
                : 'AI will write in formal English.'}
            </p>
          </div>

          {/* Category */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text2)' }}>
              Category
            </p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(c => (
                <button
                  key={c}
                  onClick={() => setForm({ ...form, category: c })}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                  style={{
                    background:  form.category === c ? 'var(--accent)' : 'var(--bg3)',
                    borderColor: form.category === c ? 'var(--accent)' : 'var(--border2)',
                    color:       form.category === c ? '#fff'          : 'var(--text2)',
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <Textarea
            label="Model Answer *"
            placeholder="Write or generate the model answer here…"
            value={form.content}
            onChange={e => setForm({ ...form, content: e.target.value })}
            className="min-h-[180px]"
          />

          {/* Tags */}
          <Input
            label="Tags (comma separated)"
            placeholder="e.g. environment, climate, Bangladesh"
            value={form.tags}
            onChange={e => setForm({ ...form, tags: e.target.value })}
          />

          <Button onClick={handleSave} loading={saving} className="w-full" size="lg">
            Save Focus Writing
          </Button>
        </div>
      </Modal>
    </div>
  )
}