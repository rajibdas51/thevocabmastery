'use client'
import { useState, useEffect } from 'react'
import { getEditorials, createEditorial, updateEditorial, deleteEditorial } from '@/lib/db'
import { useAuthStore } from '@/store/auth'
import { useToast } from '@/components/ui/Toast'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import RichTextEditor from '@/components/ui/RichTextEditor'
import { ArrowLeft, Plus, Trash2, Pencil, Newspaper, Search, Tag } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

const SOURCES = [
  'The Daily Star', 'Prothom Alo', 'The Financial Express',
  'Dhaka Tribune', 'New Age', 'The Business Standard',
  'Daily Ittefaq', 'The Daily Sun', 'Kaler Kantho', 'Other',
]

interface Editorial {
  id: string; title: string; source: string; content: string
  published_date: string; tags: string[]; created_at: string
}

type ModalMode = 'add' | 'edit'

const SOURCE_COLORS: Record<string, string> = {
  'The Daily Star':       '#2563eb',
  'Prothom Alo':          '#dc2626',
  'The Financial Express':'#16a34a',
  'Dhaka Tribune':        '#7c3aed',
  'New Age':              '#d97706',
  'The Business Standard':'#0891b2',
  'Daily Ittefaq':        '#be185d',
  'The Daily Sun':        '#ea580c',
  'Kaler Kantho':         '#65a30d',
  'Other':                '#6b7280',
}

export default function EditorialsPage() {
  const { profile }    = useAuthStore()
  const { add: toast } = useToast()
  const isAdmin        = profile?.role === 'admin'

  const [editorials,   setEditorials]  = useState<Editorial[]>([])
  const [loading,      setLoading]     = useState(true)
  const [selected,     setSelected]    = useState<Editorial | null>(null)
  const [showModal,    setShowModal]   = useState(false)
  const [modalMode,    setModalMode]   = useState<ModalMode>('add')
  const [search,       setSearch]      = useState('')
  const [sourceFilter, setSourceFilter]= useState('All')

  const [form, setForm] = useState({
    id: '', title: '', source: 'The Daily Star',
    content: '', published_date: '', tags: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  const load = async () => {
    const { data } = await getEditorials()
    setEditorials(data ?? [])
    setLoading(false)
  }

  const openAdd = () => {
    setForm({ id:'', title:'', source:'The Daily Star', content:'', published_date: new Date().toISOString().split('T')[0], tags:'' })
    setModalMode('add')
    setShowModal(true)
  }

  const openEdit = (ed: Editorial) => {
    setForm({ id:ed.id, title:ed.title, source:ed.source, content:ed.content, published_date:ed.published_date, tags:ed.tags.join(', ') })
    setModalMode('edit')
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.title || !form.content || !form.published_date) {
      toast('Title, content and date are required', 'error'); return
    }
    if (!profile) return
    setSaving(true)
    const payload = {
      title:          form.title.trim(),
      source:         form.source,
      content:        form.content,
      published_date: form.published_date,
      tags:           form.tags.split(',').map(t=>t.trim()).filter(Boolean),
    }
    if (modalMode === 'edit' && form.id) {
      const { error } = await updateEditorial(form.id, payload)
      setSaving(false)
      if (error) { toast(error,'error'); return }
      toast('Editorial updated!', 'success')
      if (selected?.id === form.id) setSelected(null)
    } else {
      const { error } = await createEditorial(payload, profile.id)
      setSaving(false)
      if (error) { toast(error,'error'); return }
      toast('Editorial added!', 'success')
    }
    setShowModal(false)
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this editorial?')) return
    const { error } = await deleteEditorial(id)
    if (error) { toast(error,'error'); return }
    toast('Deleted','success')
    setSelected(null)
    load()
  }

  const allSources = ['All', ...Array.from(new Set(editorials.map(e=>e.source)))]
  const filtered = editorials.filter(e => {
    const srcOk = sourceFilter === 'All' || e.source === sourceFilter
    const q = search.toLowerCase()
    const searchOk = !q || e.title.toLowerCase().includes(q) || e.source.toLowerCase().includes(q)
    return srcOk && searchOk
  })

  // ── DETAIL VIEW ───────────────────────────────────────────
  if (selected) {
    const color = SOURCE_COLORS[selected.source] ?? '#6b7280'
    return (
      <div className="animate-fade-up">
        <div className="flex items-center gap-3 px-4 sm:px-8 pt-6 pb-0 flex-wrap">
          <Button variant="secondary" size="sm" onClick={() => setSelected(null)}>
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </Button>
          {isAdmin && (
            <>
              <Button variant="secondary" size="sm" onClick={() => openEdit(selected)}>
                <Pencil className="w-3.5 h-3.5" /> Edit
              </Button>
              <Button variant="danger" size="sm" onClick={() => handleDelete(selected.id)}>
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </Button>
            </>
          )}
        </div>
        <div className="p-4 sm:p-8 max-w-3xl">
          <Card className="p-6 sm:p-8">
            {/* Source badge */}
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold"
                style={{ background: color+'18', color, border:`1px solid ${color}35` }}>
                <Newspaper className="w-3.5 h-3.5" />
                {selected.source}
              </div>
              <span className="text-xs" style={{ color:'var(--text3)' }}>
                Published: {formatDate(selected.published_date)}
              </span>
            </div>
            <h1 className="font-playfair text-2xl sm:text-3xl font-black leading-tight mb-6"
              style={{ color:'var(--text)' }}>
              {selected.title}
            </h1>
            <div className="h-px mb-6" style={{ background:'var(--border)' }} />
            {/* Rich HTML content */}
            <div
              className="prose-content text-[15px] leading-[1.9]"
              style={{ color:'var(--text2)' }}
              dangerouslySetInnerHTML={{ __html: selected.content }}
            />
            {selected.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-6 pt-4" style={{ borderTop:'1px solid var(--border)' }}>
                <Tag className="w-3.5 h-3.5 mt-0.5" style={{ color:'var(--text3)' }} />
                {selected.tags.map(t => (
                  <span key={t} className="text-xs px-2 py-0.5 rounded border"
                    style={{ background:'var(--bg3)', color:'var(--text3)', borderColor:'var(--border)' }}>
                    {t}
                  </span>
                ))}
              </div>
            )}
          </Card>
        </div>
        <Modal open={showModal} onClose={() => setShowModal(false)} title={modalMode==='edit'?'Edit Editorial':'Add Editorial'} size="xl">
          {renderForm()}
        </Modal>
      </div>
    )
  }

  // ── FORM ──────────────────────────────────────────────────
  function renderForm() {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Input label="Title *" placeholder="Editorial headline"
              value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} />
          </div>

          {/* Source / Newspaper */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color:'var(--text2)' }}>Source / Newspaper *</p>
            <div className="flex flex-wrap gap-2">
              {SOURCES.map(s => {
                const color = SOURCE_COLORS[s] ?? '#6b7280'
                const active = form.source === s
                return (
                  <button key={s} onClick={()=>setForm(f=>({...f,source:s}))}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                    style={{
                      background:  active ? color+'25' : 'var(--bg3)',
                      borderColor: active ? color+'80' : 'var(--border2)',
                      color:       active ? color : 'var(--text2)',
                    }}>
                    {s}
                  </button>
                )
              })}
            </div>
          </div>

          <Input label="Publication Date *" type="date"
            value={form.published_date} onChange={e=>setForm(f=>({...f,published_date:e.target.value}))} />
        </div>

        <Input label="Tags (comma separated)" placeholder="e.g. economy, trade, Bangladesh"
          value={form.tags} onChange={e=>setForm(f=>({...f,tags:e.target.value}))} />

        {/* Rich text editor */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color:'var(--text2)' }}>Editorial Content *</p>
          <RichTextEditor
            value={form.content}
            onChange={v=>setForm(f=>({...f,content:v}))}
            placeholder="Paste or write the editorial content here…"
            minHeight="320px"
          />
        </div>

        <Button onClick={handleSave} loading={saving} className="w-full" size="lg">
          {modalMode==='edit' ? 'Save Changes' : 'Publish Editorial'}
        </Button>
      </div>
    )
  }

  // ── LIST VIEW ─────────────────────────────────────────────
  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Editorials"
        subtitle="Daily Star, Prothom Alo and more — curated for exam prep"
        action={isAdmin ? <Button onClick={openAdd}><Plus className="w-4 h-4"/>Add Editorial</Button> : undefined}
      />
      <div className="p-4 sm:p-8">
        {/* Search + source filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text3)]"/>
            <input
              className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--text3)] outline-none focus:border-[var(--accent)]/50 transition-colors"
              placeholder="Search editorials…"
              value={search} onChange={e=>setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {allSources.map(s => {
              const color = s !== 'All' ? (SOURCE_COLORS[s] ?? '#6b7280') : 'var(--accent)'
              const active = sourceFilter === s
              return (
                <button key={s} onClick={()=>setSourceFilter(s)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                  style={{
                    background:  active ? (s==='All' ? 'var(--accent)' : color+'25') : 'var(--card-bg)',
                    borderColor: active ? (s==='All' ? 'var(--accent)' : color+'70') : 'var(--border)',
                    color:       active ? (s==='All' ? '#fff' : color) : 'var(--text2)',
                  }}>
                  {s}
                </button>
              )
            })}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array(4).fill(0).map((_,i) => <div key={i} className="skeleton h-52 rounded-2xl"/>)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20" style={{ color:'var(--text3)' }}>
            <Newspaper className="w-10 h-10 mx-auto mb-3 opacity-30"/>
            <p className="font-semibold">No editorials yet</p>
            {isAdmin && <Button className="mt-4" onClick={openAdd}>Add First Editorial</Button>}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filtered.map(ed => {
              const color = SOURCE_COLORS[ed.source] ?? '#6b7280'
              return (
                <Card key={ed.id} hover onClick={()=>setSelected(ed)} className="p-5 sm:p-6 flex flex-col gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold"
                      style={{ background:color+'18', color, border:`1px solid ${color}35` }}>
                      <Newspaper className="w-3 h-3"/>{ed.source}
                    </div>
                    <span className="text-[10px] ml-auto" style={{ color:'var(--text3)' }}>
                      {formatDate(ed.published_date)}
                    </span>
                    {isAdmin && (
                      <button onClick={e=>{e.stopPropagation();openEdit(ed)}}
                        className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-[var(--bg3)] transition-all"
                        style={{ color:'var(--text3)' }}>
                        <Pencil className="w-3.5 h-3.5"/>
                      </button>
                    )}
                  </div>
                  <h3 className="font-playfair text-lg font-bold leading-snug" style={{ color:'var(--text)' }}>
                    {ed.title}
                  </h3>
                  <p className="text-sm line-clamp-3" style={{ color:'var(--text3)' }}>
                    {ed.content.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()}
                  </p>
                  {ed.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {ed.tags.slice(0,3).map(t=>(
                        <span key={t} className="text-[10px] px-2 py-0.5 rounded border"
                          style={{ background:'var(--bg3)', color:'var(--text3)', borderColor:'var(--border)' }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-[11px] font-semibold" style={{ color:'var(--accent2)' }}>Read editorial →</p>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <Modal open={showModal} onClose={()=>setShowModal(false)}
        title={modalMode==='edit'?'Edit Editorial':'Add Editorial'} size="xl">
        {renderForm()}
      </Modal>
    </div>
  )
}
