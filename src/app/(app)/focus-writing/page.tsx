'use client'
import { useState, useEffect } from 'react'
import { getFocusWritings, createFocusWriting, deleteFocusWriting } from '@/lib/db'
import { generateFocusWriting } from '@/lib/gemini'
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

const CATEGORIES = ['Environment', 'Education', 'Economy', 'Technology', 'Health', 'Politics', 'Society', 'Bangladesh', 'Global Affairs', 'Other']

export default function FocusWritingPage() {
  const { profile } = useAuthStore()
  const { add: toast } = useToast()
  const [writings, setWritings] = useState<FocusWriting[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<FocusWriting | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [catFilter, setCatFilter] = useState('All')

  const [form, setForm] = useState({ title: '', category: 'Environment', content: '', tags: '' })
  const [saving, setSaving] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    const { data } = await getFocusWritings()
    setWritings(data ?? [])
    setLoading(false)
  }

  const handleAIGenerate = async () => {
    if (!form.title.trim()) { toast('Enter a topic title first', 'error'); return }
    setAiLoading(true)
    try {
      const gen = await generateFocusWriting(form.title, form.category)
      setForm(f => ({
        ...f,
        content: gen.content,
        tags: gen.tags.join(', '),
      }))
      toast('AI generated the model answer! Review and save.', 'success')
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
      title: form.title,
      category: form.category,
      content: form.content,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
    }, profile.id)
    setSaving(false)
    if (error) { toast(error, 'error'); return }
    toast('Focus writing saved!', 'success')
    setShowAdd(false)
    setForm({ title: '', category: 'Environment', content: '', tags: '' })
    load()
  }

  const handleDelete = async (id: string) => {
    const { error } = await deleteFocusWriting(id)
    if (error) { toast(error, 'error'); return }
    toast('Deleted', 'success')
    setSelected(null)
    load()
  }

  const allCats = ['All', ...Array.from(new Set(writings.map(w => w.category)))]
  const filtered = catFilter === 'All' ? writings : writings.filter(w => w.category === catFilter)

  // ── DETAIL VIEW ──
  if (selected) return (
    <div className="animate-fade-up">
      <div className="flex items-center gap-4 px-8 pt-8 pb-0">
        <Button variant="secondary" size="sm" onClick={() => setSelected(null)}>
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </Button>
        {profile?.role === 'admin' && (
          <Button variant="danger" size="sm" onClick={() => handleDelete(selected.id)}>
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </Button>
        )}
      </div>
      <div className="p-8 max-w-3xl">
        <Card className="p-8">
          <div className="flex items-start gap-3 mb-6">
            <Badge variant="purple">{selected.category}</Badge>
            <span className="text-xs text-[#5a5a72] mt-0.5">{formatDate(selected.created_at)}</span>
          </div>
          <h1 className="font-playfair text-3xl font-black leading-tight mb-6">{selected.title}</h1>
          <div className="h-px bg-white/[0.06] mb-6" />
          <div className="prose prose-invert max-w-none">
            {selected.content.split('\n').map((para, i) => (
              para.trim() ? <p key={i} className="text-[15px] leading-[1.9] text-[#c0c0d8] mb-4">{para}</p> : <br key={i} />
            ))}
          </div>
          {selected.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-white/[0.06]">
              <Tag className="w-3.5 h-3.5 text-[#5a5a72]" />
              {selected.tags.map(t => (
                <span key={t} className="text-xs px-2 py-0.5 rounded bg-white/5 text-[#9090a8] border border-white/10">{t}</span>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )

  // ── LIST VIEW ──
  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Focus Writing"
        subtitle="Model answers for essay topics — BCS, Bank, and competitive exams"
        action={profile?.role === 'admin' ? (
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4" /> Add Topic
          </Button>
        ) : undefined}
      />
      <div className="p-8 mt-68.75">
        {/* Category filter */}
        <div className="flex gap-2 flex-wrap mb-6">
          {allCats.map(cat => (
            <button
              key={cat}
              onClick={() => setCatFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                catFilter === cat
                  ? 'bg-[#7c6af7] border-[#7c6af7] text-white'
                  : 'bg-[#12121a] border-white/[0.07] text-[#9090a8] hover:border-white/20'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-4">
            {Array(4).fill(0).map((_, i) => <div key={i} className="skeleton h-52 rounded-2xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-[#5a5a72]">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No focus writings yet</p>
            {profile?.role === 'admin' && (
              <Button className="mt-4" onClick={() => setShowAdd(true)}>Add First Topic</Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filtered.map(fw => (
              <Card key={fw.id} hover onClick={() => setSelected(fw)} className="p-6 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Badge variant="purple">{fw.category}</Badge>
                  <span className="text-[10px] text-[#5a5a72]">{formatDate(fw.created_at)}</span>
                </div>
                <h3 className="font-playfair text-lg font-bold leading-snug">{fw.title}</h3>
                <p className="text-sm text-[#5a5a72] line-clamp-3">{fw.content}</p>
                {fw.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-auto">
                    {fw.tags.slice(0, 3).map(t => (
                      <span key={t} className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-[#5a5a72] border border-white/[0.07]">{t}</span>
                    ))}
                  </div>
                )}
                <p className="text-[11px] text-[#7c6af7] font-semibold mt-1">Read full answer →</p>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Focus Writing" size="lg">
        <div className="space-y-4 ">
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <Input label="Topic Title *" placeholder="e.g. Climate Change and Bangladesh"
                value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            </div>
            <Button variant="outline" onClick={handleAIGenerate} loading={aiLoading} className="h-[42px] flex-shrink-0">
              <Sparkles className="w-4 h-4" />
              {aiLoading ? 'Generating...' : 'AI Write'}
            </Button>
          </div>

          {aiLoading && (
            <div className="p-3 rounded-xl bg-[#7c6af7]/8 border border-[#7c6af7]/20 text-sm text-[#a78bfa]">
              ✨ Gemini AI is writing a model answer for "{form.title}"...
            </div>
          )}

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#9090a8] mb-2">Category</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(c => (
                <button key={c} onClick={() => setForm({ ...form, category: c })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    form.category === c ? 'bg-[#7c6af7] border-[#7c6af7] text-white' : 'bg-[#1a1a26] border-white/10 text-[#9090a8] hover:border-white/20'
                  }`}>{c}</button>
              ))}
            </div>
          </div>

          <Textarea label="Model Answer *" placeholder="Write the model answer here..."
            value={form.content} onChange={e => setForm({ ...form, content: e.target.value })}
            className="min-h-[200px]" />

          <Input label="Tags (comma separated)" placeholder="e.g. environment, climate, Bangladesh"
            value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} />

          <Button onClick={handleSave} loading={saving} className="w-full" size="lg">
            Save Focus Writing
          </Button>
        </div>
      </Modal>
    </div>
  )
}