'use client'
import { useState, useEffect, useRef } from 'react'
import { getAnalogies, getAnalogyQuiz, saveAnalogyAttempt, createAnalogy, updateAnalogy, deleteAnalogy } from '@/lib/db'
import { useAuthStore } from '@/store/auth'
import { useToast } from '@/components/ui/Toast'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Textarea from '@/components/ui/Textarea'
import Badge from '@/components/ui/Badge'
import ProgressBar from '@/components/ui/Progressbar'
import {
  BookOpen, PenSquare, Plus, ArrowLeft, ChevronRight,
  CheckCircle2, XCircle, Lightbulb, Trash2, Pencil,
  Search, Timer, RotateCcw, Home
} from 'lucide-react'
import type { Analogy, AnalogyOption, AnalogyRelationshipType, AnalogyDifficulty } from '@/types'
import { RELATIONSHIP_TYPE_LABELS } from '@/types'
import { cn } from '@/lib/utils'

type View = 'home' | 'browse' | 'study' | 'quiz' | 'quiz_result'

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: '#22d3a0', medium: '#f5c842', hard: '#f8706a',
}
const DIFFICULTY_BG: Record<string, string> = {
  easy: 'rgba(34,211,160,0.12)', medium: 'rgba(245,200,66,0.12)', hard: 'rgba(248,112,106,0.12)',
}

const EMPTY_OPTION = (): AnalogyOption => ({ id: '', word_c: '', word_d: '', word_c_bn: '', word_d_bn: '' })

const REL_OPTIONS = [
  { value: 'all', label: 'All Types' },
  ...Object.entries(RELATIONSHIP_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l })),
]
const DIFF_OPTIONS = [
  { value: 'all', label: 'All Difficulties' },
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
]
const COUNT_OPTIONS = [
  { value: '5', label: '5 Questions' },
  { value: '10', label: '10 Questions' },
  { value: '20', label: '20 Questions' },
]

export default function AnalogyPage() {
  const { profile }    = useAuthStore()
  const { add: toast } = useToast()
  const isAdmin        = profile?.role === 'admin'

  const [view, setView] = useState<View>('home')

  // Browse state
  const [analogies,   setAnalogies]   = useState<Analogy[]>([])
  const [total,       setTotal]       = useState(0)
  const [loading,     setLoading]     = useState(false)
  const [search,      setSearch]      = useState('')
  const [relFilter,   setRelFilter]   = useState('all')
  const [diffFilter,  setDiffFilter]  = useState('all')
  const [page,        setPage]        = useState(1)
  const [selected,    setSelected]    = useState<Analogy | null>(null)

  // Quiz state
  const [quizCount,   setQuizCount]   = useState('10')
  const [quizRel,     setQuizRel]     = useState('all')
  const [quizDiff,    setQuizDiff]    = useState('all')
  const [questions,   setQuestions]   = useState<Analogy[]>([])
  const [current,     setCurrent]     = useState(0)
  const [picked,      setPicked]      = useState<string | null>(null)
  const [showExp,     setShowExp]     = useState(false)
  const [results,     setResults]     = useState<{ analogy: Analogy; selected: string; correct: boolean }[]>([])
  const [elapsed,     setElapsed]     = useState(0)
  const [quizLoading, setQuizLoading] = useState(false)
  const timerRef = useRef<any>(null)

  // Admin modal state
  const [showModal, setShowModal]   = useState(false)
  const [modalMode, setModalMode]   = useState<'add'|'edit'>('add')
  const [saving,    setSaving]      = useState(false)
  const [form, setForm] = useState({
    id: '',
    word_a: '', word_b: '', word_a_bn: '', word_b_bn: '',
    relationship: '', relationship_type: 'cause_effect' as AnalogyRelationshipType,
    difficulty: 'medium' as AnalogyDifficulty,
    correct_option: 'a',
    explanation_bn: '', relationship_explanation: '', source: '',
    options: [
      { id:'a', word_c:'', word_d:'', word_c_bn:'', word_d_bn:'' },
      { id:'b', word_c:'', word_d:'', word_c_bn:'', word_d_bn:'' },
      { id:'c', word_c:'', word_d:'', word_c_bn:'', word_d_bn:'' },
      { id:'d', word_c:'', word_d:'', word_c_bn:'', word_d_bn:'' },
    ] as AnalogyOption[],
  })

  const PAGE_SIZE = 12

  useEffect(() => {
    if (view === 'browse') loadAnalogies()
  }, [view, search, relFilter, diffFilter, page])

  useEffect(() => {
    if (view === 'quiz') {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [view])

  const loadAnalogies = async () => {
    setLoading(true)
    const res = await getAnalogies({ relationship_type: relFilter, difficulty: diffFilter, search: search || undefined, page, pageSize: PAGE_SIZE })
    setAnalogies(res.data); setTotal(res.count); setLoading(false)
  }

  const startQuiz = async () => {
    setQuizLoading(true)
    const { data, error } = await getAnalogyQuiz({ relationship_type: quizRel, difficulty: quizDiff, count: parseInt(quizCount) })
    setQuizLoading(false)
    if (error || !data?.length) { toast(error ?? 'No analogies found for these filters', 'error'); return }
    setQuestions(data); setCurrent(0); setPicked(null); setShowExp(false)
    setResults([]); setElapsed(0); setView('quiz')
  }

  const pickOption = async (optId: string) => {
    if (picked) return
    setPicked(optId)
    setShowExp(true)
    const q = questions[current]
    const isCorrect = optId === q.correct_option
    const newResults = [...results, { analogy: q, selected: optId, correct: isCorrect }]
    setResults(newResults)
    if (profile) {
      await saveAnalogyAttempt({ user_id: profile.id, analogy_id: q.id, selected_option: optId, is_correct: isCorrect })
    }
  }

  const nextQuestion = () => {
    if (current + 1 >= questions.length) { setView('quiz_result'); return }
    setCurrent(c => c + 1); setPicked(null); setShowExp(false)
  }

  const openAdd = () => {
    setForm({ id:'', word_a:'', word_b:'', word_a_bn:'', word_b_bn:'', relationship:'', relationship_type:'cause_effect', difficulty:'medium', correct_option:'a', explanation_bn:'', relationship_explanation:'', source:'', options:[{id:'a',word_c:'',word_d:'',word_c_bn:'',word_d_bn:''},{id:'b',word_c:'',word_d:'',word_c_bn:'',word_d_bn:''},{id:'c',word_c:'',word_d:'',word_c_bn:'',word_d_bn:''},{id:'d',word_c:'',word_d:'',word_c_bn:'',word_d_bn:''}] })
    setModalMode('add'); setShowModal(true)
  }

  const openEdit = (a: Analogy) => {
    setForm({ id:a.id, word_a:a.word_a, word_b:a.word_b, word_a_bn:a.word_a_bn??'', word_b_bn:a.word_b_bn??'', relationship:a.relationship, relationship_type:a.relationship_type, difficulty:a.difficulty, correct_option:a.correct_option, explanation_bn:a.explanation_bn, relationship_explanation:a.relationship_explanation??'', source:a.source??'', options:a.options })
    setModalMode('edit'); setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.word_a || !form.word_b || !form.explanation_bn) { toast('Fill all required fields', 'error'); return }
    if (!profile) return
    setSaving(true)
    const payload = { word_a: form.word_a.trim().toUpperCase(), word_b: form.word_b.trim().toUpperCase(), word_a_bn: form.word_a_bn, word_b_bn: form.word_b_bn, relationship: form.relationship, relationship_type: form.relationship_type, difficulty: form.difficulty, options: form.options, correct_option: form.correct_option, explanation_bn: form.explanation_bn, relationship_explanation: form.relationship_explanation, source: form.source }
    if (modalMode === 'edit' && form.id) {
      const { error } = await updateAnalogy(form.id, payload)
      setSaving(false); if (error) { toast(error,'error'); return }
      toast('Analogy updated!','success')
    } else {
      const { error } = await createAnalogy(payload, profile.id)
      setSaving(false); if (error) { toast(error,'error'); return }
      toast('Analogy added!','success')
    }
    setShowModal(false); loadAnalogies()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this analogy?')) return
    const { error } = await deleteAnalogy(id)
    if (error) { toast(error,'error'); return }
    toast('Deleted','success'); setSelected(null); loadAnalogies()
  }

  const updateOption = (i: number, key: keyof AnalogyOption, val: string) => {
    setForm(f => { const opts = [...f.options]; opts[i] = { ...opts[i], [key]: val }; return { ...f, options: opts } })
  }

  const formatTime = (s: number) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`

  // ── HOME ──────────────────────────────────────────────────
  if (view === 'home') return (
    <div className="animate-fade-up">
      <PageHeader title="GRE Analogy" subtitle="Master analogical reasoning for BCS, GRE & Bank exams" />
      <div className="p-4 sm:p-8 max-w-3xl space-y-5">

        {/* What is analogy */}
        <div className="p-5 rounded-2xl border" style={{ background:'rgba(124,106,247,0.06)', borderColor:'rgba(124,106,247,0.25)' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color:'var(--accent2)' }}>What is GRE Analogy?</p>
          <p className="text-sm leading-relaxed" style={{ color:'var(--text2)' }}>
            An analogy question gives you a pair of words (stem) and asks you to find another pair with the <strong style={{ color:'var(--text)' }}>same relationship</strong>.
          </p>
          <div className="mt-3 p-3 rounded-xl font-mono text-sm" style={{ background:'var(--bg3)' }}>
            <span style={{ color:'var(--accent2)' }}>SEDATIVE</span>
            <span style={{ color:'var(--text3)' }}> : </span>
            <span style={{ color:'var(--gold)' }}>DROWSINESS</span>
            <span style={{ color:'var(--text3)' }}> → causes → </span>
            <span style={{ color:'var(--accent2)' }}>ANESTHETIC</span>
            <span style={{ color:'var(--text3)' }}> : </span>
            <span style={{ color:'var(--gold)' }}>NUMBNESS</span>
          </div>
        </div>

        {/* Relationship types */}
        <Card className="p-5">
          <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color:'var(--text3)' }}>Relationship Types You'll Practice</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(RELATIONSHIP_TYPE_LABELS).map(([k,l]) => (
              <span key={k} className="px-2.5 py-1 rounded-lg text-xs font-semibold border"
                style={{ background:'var(--bg3)', borderColor:'var(--border2)', color:'var(--text2)' }}>
                {l}
              </span>
            ))}
          </div>
        </Card>

        {/* Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button onClick={() => { setView('browse'); loadAnalogies() }}
            className="p-5 rounded-2xl border text-left hover:-translate-y-0.5 transition-all"
            style={{ background:'var(--card-bg)', borderColor:'var(--border)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 text-xl"
              style={{ background:'rgba(124,106,247,0.15)' }}>📖</div>
            <p className="font-semibold" style={{ color:'var(--text)' }}>Browse & Study</p>
            <p className="text-xs mt-1" style={{ color:'var(--text3)' }}>Read analogies, see Bangla meanings & explanations</p>
          </button>

          <button onClick={() => setView('quiz')}
            className="p-5 rounded-2xl border text-left hover:-translate-y-0.5 transition-all"
            style={{ background:'var(--card-bg)', borderColor:'var(--border)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 text-xl"
              style={{ background:'rgba(34,211,160,0.15)' }}>✏️</div>
            <p className="font-semibold" style={{ color:'var(--text)' }}>Take MCQ Quiz</p>
            <p className="text-xs mt-1" style={{ color:'var(--text3)' }}>Test yourself with timed analogy questions</p>
          </button>
        </div>

        {isAdmin && (
          <Button onClick={openAdd} variant="outline" className="w-full">
            <Plus className="w-4 h-4" /> Add New Analogy (Admin)
          </Button>
        )}
      </div>
      <Modal open={showModal} onClose={() => setShowModal(false)} title={modalMode==='edit'?'Edit Analogy':'Add Analogy'} size="xl">
        {renderForm()}
      </Modal>
    </div>
  )

  // ── QUIZ SETUP ────────────────────────────────────────────
  if (view === 'quiz' && !questions.length) return (
    <div className="animate-fade-up">
      <div className="flex items-center gap-3 px-4 sm:px-8 pt-6 pb-0">
        <Button variant="secondary" size="sm" onClick={() => setView('home')}><ArrowLeft className="w-3.5 h-3.5"/> Back</Button>
      </div>
      <PageHeader title="Analogy Quiz" subtitle="Configure your practice session" />
      <div className="p-4 sm:p-8 max-w-lg">
        <Card className="p-5 space-y-4">
          <Select label="Relationship Type" value={quizRel} onChange={setQuizRel} options={REL_OPTIONS} />
          <Select label="Difficulty" value={quizDiff} onChange={setQuizDiff} options={DIFF_OPTIONS} />
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color:'var(--text2)' }}>Questions</p>
            <div className="flex gap-2">
              {COUNT_OPTIONS.map(o => (
                <button key={o.value} onClick={() => setQuizCount(o.value)}
                  className="px-4 py-2 rounded-lg text-sm font-semibold border transition-all"
                  style={{ background: quizCount===o.value?'var(--accent)':'var(--bg3)', borderColor: quizCount===o.value?'var(--accent)':'var(--border2)', color: quizCount===o.value?'#fff':'var(--text2)' }}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={startQuiz} loading={quizLoading} className="w-full" size="lg">
            Start Quiz →
          </Button>
        </Card>
      </div>
    </div>
  )

  // ── QUIZ RESULT ───────────────────────────────────────────
  if (view === 'quiz_result') {
    const score = results.filter(r => r.correct).length
    const pct   = Math.round((score / results.length) * 100)
    return (
      <div className="animate-fade-up">
        <PageHeader title="Quiz Results" />
        <div className="p-4 sm:p-8 max-w-2xl">
          <Card className="p-6">
            <div className="text-center mb-6">
              <div className="font-playfair text-7xl font-black" style={{ color: pct>=70?'#22d3a0':pct>=40?'#f5c842':'#f8706a' }}>{pct}%</div>
              <p className="text-xl font-semibold mt-2" style={{ color:'var(--text)' }}>
                {pct>=80?'Excellent! 🏆':pct>=60?'Good job! 👍':pct>=40?'Keep practicing 📚':'Review needed 💡'}
              </p>
              <p className="text-sm mt-1" style={{ color:'var(--text3)' }}>{score} correct out of {results.length} · {formatTime(elapsed)}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="text-center p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <div className="text-3xl font-black text-emerald-500">{score}</div>
                <div className="text-xs mt-1" style={{ color:'var(--text3)' }}>✓ Correct</div>
              </div>
              <div className="text-center p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                <div className="text-3xl font-black text-red-400">{results.length - score}</div>
                <div className="text-xs mt-1" style={{ color:'var(--text3)' }}>✗ Wrong</div>
              </div>
            </div>
            {/* Review */}
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {results.map((r, i) => (
                <div key={i} className={cn('p-3 rounded-xl border text-sm', r.correct?'bg-emerald-500/8 border-emerald-500/20':'bg-red-500/8 border-red-500/20')}>
                  <div className="flex items-center gap-2">
                    {r.correct?<CheckCircle2 className="w-4 h-4 text-emerald-500"/>:<XCircle className="w-4 h-4 text-red-400"/>}
                    <span className="font-bold" style={{ color:'var(--text)' }}>{r.analogy.word_a} : {r.analogy.word_b}</span>
                  </div>
                  {!r.correct && (
                    <p className="text-xs mt-1" style={{ color:'var(--text3)' }}>
                      Your: {r.analogy.options.find(o=>o.id===r.selected)?.word_c} : {r.analogy.options.find(o=>o.id===r.selected)?.word_d}
                      {' → '}Correct: {r.analogy.options.find(o=>o.id===r.analogy.correct_option)?.word_c} : {r.analogy.options.find(o=>o.id===r.analogy.correct_option)?.word_d}
                    </p>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-5">
              <Button variant="secondary" className="flex-1" onClick={() => { setView('home'); setQuestions([]) }}><Home className="w-3.5 h-3.5"/> Home</Button>
              <Button className="flex-1" onClick={() => { setQuestions([]); setView('quiz') }}><RotateCcw className="w-3.5 h-3.5"/> Try Again</Button>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  // ── ACTIVE QUIZ ───────────────────────────────────────────
  if (view === 'quiz' && questions.length) {
    const q = questions[current]
    return (
      <div className="animate-fade-up">
        <div className="flex items-center justify-between px-4 sm:px-8 pt-6 pb-0 flex-wrap gap-3">
          <div>
            <h1 className="font-playfair text-xl font-black" style={{ color:'var(--text)' }}>Analogy Quiz</h1>
            <p className="text-sm" style={{ color:'var(--text2)' }}>Question {current+1} of {questions.length}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-sm font-mono" style={{ color:'var(--text2)' }}>
              <Timer className="w-3.5 h-3.5"/>{formatTime(elapsed)}
            </div>
            <Button variant="ghost" size="sm" onClick={() => { setView('home'); setQuestions([]) }}>✕ Exit</Button>
          </div>
        </div>
        <div className="p-4 sm:p-8 max-w-2xl">
          <ProgressBar value={((current+1)/questions.length)*100} className="mb-5"/>
          <Card className="p-5 sm:p-6 space-y-5">
            {/* Stem */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color:'var(--text3)' }}>
                Choose the pair with the same relationship
              </p>
              <div className="p-4 rounded-xl flex items-center justify-center gap-3 flex-wrap"
                style={{ background:'var(--bg3)', border:'1px solid var(--border2)' }}>
                <div className="text-center">
                  <p className="font-playfair text-2xl font-black" style={{ color:'var(--accent2)' }}>{q.word_a}</p>
                  {q.word_a_bn && <p className="text-xs mt-0.5" style={{ color:'var(--text3)' }}>{q.word_a_bn}</p>}
                </div>
                <div className="text-2xl font-black" style={{ color:'var(--text3)' }}>:</div>
                <div className="text-center">
                  <p className="font-playfair text-2xl font-black" style={{ color:'var(--gold)' }}>{q.word_b}</p>
                  {q.word_b_bn && <p className="text-xs mt-0.5" style={{ color:'var(--text3)' }}>{q.word_b_bn}</p>}
                </div>
              </div>
            </div>

            {/* Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {q.options.map((opt, oi) => {
                const isCorrect  = opt.id === q.correct_option
                const isSelected = opt.id === picked
                const revealed   = !!picked

                let bg = 'var(--bg3)', border = 'var(--border2)', opacity = 1
                if (revealed && isCorrect)        { bg = 'rgba(34,211,160,0.15)';  border = 'rgba(34,211,160,0.6)' }
                else if (revealed && isSelected)  { bg = 'rgba(248,112,106,0.15)'; border = 'rgba(248,112,106,0.6)' }
                else if (revealed)                { opacity = 0.4 }

                return (
                  <button key={opt.id} onClick={() => pickOption(opt.id)}
                    className="p-4 rounded-xl text-left border transition-all duration-200 relative"
                    style={{ background:bg, borderColor:border, opacity }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black border border-current flex-shrink-0"
                        style={{ color: revealed&&isCorrect?'#22d3a0':revealed&&isSelected?'#f8706a':'var(--text3)' }}>
                        {opt.id.toUpperCase()}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-sm" style={{ color:'var(--text)' }}>{opt.word_c}</span>
                        <span style={{ color:'var(--text3)' }}>:</span>
                        <span className="font-semibold text-sm" style={{ color:'var(--text)' }}>{opt.word_d}</span>
                      </div>
                      {revealed && isCorrect  && <CheckCircle2 className="w-4 h-4 text-emerald-500 absolute right-3 top-1/2 -translate-y-1/2"/>}
                      {revealed && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-red-400 absolute right-3 top-1/2 -translate-y-1/2"/>}
                    </div>
                    {/* Bangla meanings */}
                    <p className="text-[11px] pl-7" style={{ color:'var(--text3)' }}>
                      {opt.word_c_bn} : {opt.word_d_bn}
                    </p>
                  </button>
                )
              })}
            </div>

            {/* Explanation */}
            {showExp && (
              <div className="p-4 rounded-xl border" style={{ background:'rgba(124,106,247,0.06)', borderColor:'rgba(124,106,247,0.25)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-4 h-4" style={{ color:'var(--accent2)' }}/>
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color:'var(--accent2)' }}>ব্যাখ্যা (Explanation)</p>
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color:'var(--text2)' }}>
                  {q.explanation_bn}
                </p>
              </div>
            )}

            {picked && (
              <Button className="w-full" size="lg" onClick={nextQuestion}>
                {current+1 < questions.length ? 'Next Question →' : 'See Results →'}
              </Button>
            )}
          </Card>

          <div className="flex justify-center gap-6 mt-4 text-sm">
            <span className="text-emerald-500">✓ {results.filter(r=>r.correct).length} correct</span>
            <span className="text-red-400">✗ {results.filter(r=>!r.correct).length} wrong</span>
            <span style={{ color:'var(--text3)' }}>{questions.length-current-1} remaining</span>
          </div>
        </div>
      </div>
    )
  }

  // ── STUDY DETAIL ──────────────────────────────────────────
  if (view === 'study' && selected) return (
    <div className="animate-fade-up">
      <div className="flex items-center gap-3 px-4 sm:px-8 pt-6 pb-0 flex-wrap">
        <Button variant="secondary" size="sm" onClick={() => { setView('browse'); setSelected(null) }}>
          <ArrowLeft className="w-3.5 h-3.5"/> Back
        </Button>
        {isAdmin && (
          <>
            <Button variant="secondary" size="sm" onClick={() => openEdit(selected)}><Pencil className="w-3.5 h-3.5"/> Edit</Button>
            <Button variant="danger" size="sm" onClick={() => handleDelete(selected.id)}><Trash2 className="w-3.5 h-3.5"/> Delete</Button>
          </>
        )}
      </div>
      <div className="p-4 sm:p-8 max-w-2xl">
        <Card className="p-5 sm:p-7 space-y-6">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold"
                style={{ background:DIFFICULTY_BG[selected.difficulty], color:DIFFICULTY_COLORS[selected.difficulty], border:`1px solid ${DIFFICULTY_COLORS[selected.difficulty]}35` }}>
                {selected.difficulty.toUpperCase()}
              </span>
              <span className="px-2.5 py-1 rounded-lg text-xs font-semibold border"
                style={{ background:'var(--bg3)', borderColor:'var(--border2)', color:'var(--text3)' }}>
                {RELATIONSHIP_TYPE_LABELS[selected.relationship_type]}
              </span>
              {selected.source && <span className="text-[10px]" style={{ color:'var(--text3)' }}>{selected.source}</span>}
            </div>

            {/* Stem */}
            <div className="p-5 rounded-2xl text-center" style={{ background:'var(--bg3)', border:'1px solid var(--border2)' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color:'var(--text3)' }}>Stem Pair</p>
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <div>
                  <p className="font-playfair text-3xl font-black" style={{ color:'var(--accent2)' }}>{selected.word_a}</p>
                  {selected.word_a_bn && <p className="text-sm mt-1" style={{ color:'var(--text3)' }}>{selected.word_a_bn}</p>}
                </div>
                <div>
                  <p className="text-3xl font-black" style={{ color:'var(--border2)' }}>:</p>
                </div>
                <div>
                  <p className="font-playfair text-3xl font-black" style={{ color:'var(--gold)' }}>{selected.word_b}</p>
                  {selected.word_b_bn && <p className="text-sm mt-1" style={{ color:'var(--text3)' }}>{selected.word_b_bn}</p>}
                </div>
              </div>
              <div className="mt-3 text-xs font-semibold px-3 py-1 rounded-full inline-block"
                style={{ background:'rgba(124,106,247,0.12)', color:'var(--accent2)' }}>
                Relationship: {selected.relationship}
              </div>
            </div>
          </div>

          {/* Options */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color:'var(--text3)' }}>MCQ Options</p>
            <div className="space-y-2">
              {selected.options.map(opt => {
                const isCorrect = opt.id === selected.correct_option
                return (
                  <div key={opt.id}
                    className="p-3.5 rounded-xl border flex items-start gap-3"
                    style={{
                      background:  isCorrect ? 'rgba(34,211,160,0.10)' : 'var(--bg3)',
                      borderColor: isCorrect ? 'rgba(34,211,160,0.40)' : 'var(--border2)',
                    }}>
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5"
                      style={{ background: isCorrect?'rgba(34,211,160,0.20)':'var(--bg4)', color: isCorrect?'#22d3a0':'var(--text3)', border:`1px solid ${isCorrect?'#22d3a040':'var(--border2)'}` }}>
                      {opt.id.toUpperCase()}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold" style={{ color:'var(--text)' }}>{opt.word_c}</span>
                        <span style={{ color:'var(--text3)' }}>:</span>
                        <span className="font-semibold" style={{ color:'var(--text)' }}>{opt.word_d}</span>
                        {isCorrect && <span className="text-[10px] font-bold text-emerald-500 ml-1">✓ ANSWER</span>}
                      </div>
                      <p className="text-xs mt-0.5" style={{ color:'var(--text3)' }}>
                        {opt.word_c_bn} : {opt.word_d_bn}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Explanation */}
          <div className="p-4 rounded-xl border" style={{ background:'rgba(124,106,247,0.06)', borderColor:'rgba(124,106,247,0.25)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-4 h-4" style={{ color:'var(--accent2)' }}/>
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color:'var(--accent2)' }}>বিস্তারিত ব্যাখ্যা</p>
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color:'var(--text2)' }}>
              {selected.explanation_bn}
            </p>
          </div>
        </Card>
      </div>
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Edit Analogy" size="xl">
        {renderForm()}
      </Modal>
    </div>
  )

  // ── BROWSE ────────────────────────────────────────────────
  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Browse Analogies"
        subtitle={`${total} analogies in the database`}
        action={isAdmin ? <Button onClick={openAdd}><Plus className="w-4 h-4"/> Add Analogy</Button> : undefined}
      />
      <div className="p-4 sm:p-8">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text3)]"/>
            <input className="w-full bg-[var(--card-bg)] border border-[var(--border)] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--text3)] outline-none focus:border-[var(--accent)]/50 transition-colors"
              placeholder="Search analogies…" value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} />
          </div>
          <div className="w-full sm:w-52">
            <Select value={relFilter} onChange={v=>{setRelFilter(v);setPage(1)}} options={REL_OPTIONS} />
          </div>
          <div className="w-full sm:w-40">
            <Select value={diffFilter} onChange={v=>{setDiffFilter(v);setPage(1)}} options={DIFF_OPTIONS} />
          </div>
          <Button variant="secondary" onClick={() => setView('home')}><ArrowLeft className="w-4 h-4"/> Back</Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array(6).fill(0).map((_,i)=><div key={i} className="skeleton h-40 rounded-2xl"/>)}
          </div>
        ) : analogies.length === 0 ? (
          <div className="text-center py-20" style={{ color:'var(--text3)' }}>
            <p className="text-4xl mb-3">🔍</p>
            <p className="font-semibold">No analogies found</p>
            {isAdmin && <Button className="mt-4" onClick={openAdd}>Add First Analogy</Button>}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {analogies.map(a => (
              <button key={a.id} onClick={() => { setSelected(a); setView('study') }}
                className="p-5 rounded-2xl border text-left hover:-translate-y-0.5 transition-all"
                style={{ background:'var(--card-bg)', borderColor:'var(--border)' }}>
                {/* Stem */}
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className="font-playfair text-base font-black" style={{ color:'var(--accent2)' }}>{a.word_a}</span>
                  <span style={{ color:'var(--text3)' }}>:</span>
                  <span className="font-playfair text-base font-black" style={{ color:'var(--gold)' }}>{a.word_b}</span>
                </div>
                {/* Bangla */}
                {(a.word_a_bn || a.word_b_bn) && (
                  <p className="text-xs mb-3" style={{ color:'var(--text3)' }}>
                    {a.word_a_bn} : {a.word_b_bn}
                  </p>
                )}
                {/* Tags */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold"
                    style={{ background:DIFFICULTY_BG[a.difficulty], color:DIFFICULTY_COLORS[a.difficulty] }}>
                    {a.difficulty}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded border"
                    style={{ background:'var(--bg3)', borderColor:'var(--border2)', color:'var(--text3)' }}>
                    {RELATIONSHIP_TYPE_LABELS[a.relationship_type]}
                  </span>
                </div>
                {a.source && <p className="text-[10px] mt-2" style={{ color:'var(--text3)' }}>{a.source}</p>}
                <p className="text-[11px] font-semibold mt-2" style={{ color:'var(--accent2)' }}>Study →</p>
              </button>
            ))}
          </div>
        )}

        {/* Pagination */}
        {Math.ceil(total/PAGE_SIZE) > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <Button variant="secondary" size="sm" onClick={() => setPage(p=>Math.max(1,p-1))} disabled={page===1}>← Prev</Button>
            <span className="text-sm font-mono" style={{ color:'var(--text2)' }}>{page} / {Math.ceil(total/PAGE_SIZE)}</span>
            <Button variant="secondary" size="sm" onClick={() => setPage(p=>p+1)} disabled={page>=Math.ceil(total/PAGE_SIZE)}>Next →</Button>
          </div>
        )}
      </div>
      <Modal open={showModal} onClose={() => setShowModal(false)} title={modalMode==='edit'?'Edit Analogy':'Add Analogy'} size="xl">
        {renderForm()}
      </Modal>
    </div>
  )

  // ── ADMIN FORM ────────────────────────────────────────────
  function renderForm() {
    return (
      <div className="space-y-5">
        {/* Stem */}
        <div className="p-4 rounded-xl border space-y-3" style={{ background:'var(--bg3)', borderColor:'var(--border2)' }}>
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color:'var(--text2)' }}>Stem Pair</p>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Word A *" placeholder="SEDATIVE" value={form.word_a} onChange={e=>setForm(f=>({...f,word_a:e.target.value.toUpperCase()}))} />
            <Input label="Word B *" placeholder="DROWSINESS" value={form.word_b} onChange={e=>setForm(f=>({...f,word_b:e.target.value.toUpperCase()}))} />
            <Input label="Word A (Bangla)" placeholder="ঘুমের ওষুধ" value={form.word_a_bn} onChange={e=>setForm(f=>({...f,word_a_bn:e.target.value}))} />
            <Input label="Word B (Bangla)" placeholder="তন্দ্রালুতা" value={form.word_b_bn} onChange={e=>setForm(f=>({...f,word_b_bn:e.target.value}))} />
          </div>
          <Input label="Relationship (English)" placeholder="e.g. causes, is part of, is a type of" value={form.relationship} onChange={e=>setForm(f=>({...f,relationship:e.target.value}))} />
        </div>

        {/* Type + Difficulty */}
        <div className="grid grid-cols-2 gap-3">
          <Select label="Relationship Type *" value={form.relationship_type}
            onChange={v=>setForm(f=>({...f,relationship_type:v as AnalogyRelationshipType}))}
            options={Object.entries(RELATIONSHIP_TYPE_LABELS).map(([v,l])=>({value:v,label:l}))} />
          <Select label="Difficulty *" value={form.difficulty}
            onChange={v=>setForm(f=>({...f,difficulty:v as AnalogyDifficulty}))}
            options={[{value:'easy',label:'Easy'},{value:'medium',label:'Medium'},{value:'hard',label:'Hard'}]} />
        </div>

        {/* 4 Options */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color:'var(--text2)' }}>4 MCQ Options</p>
          <div className="space-y-3">
            {form.options.map((opt, i) => (
              <div key={opt.id} className="p-3 rounded-xl border" style={{ background: form.correct_option===opt.id?'rgba(34,211,160,0.06)':'var(--bg3)', borderColor: form.correct_option===opt.id?'rgba(34,211,160,0.30)':'var(--border2)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <button onClick={() => setForm(f=>({...f,correct_option:opt.id}))}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border-2 transition-all flex-shrink-0"
                    style={{ borderColor: form.correct_option===opt.id?'#22d3a0':'var(--border2)', background: form.correct_option===opt.id?'#22d3a020':'transparent', color: form.correct_option===opt.id?'#22d3a0':'var(--text3)' }}>
                    {opt.id.toUpperCase()}
                  </button>
                  <span className="text-xs font-semibold" style={{ color: form.correct_option===opt.id?'#22d3a0':'var(--text3)' }}>
                    Option {opt.id.toUpperCase()} {form.correct_option===opt.id?'✓ (Correct Answer)':'— click to set as correct'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder={`Word C (e.g. anesthetic)`} value={opt.word_c} onChange={e=>updateOption(i,'word_c',e.target.value)} />
                  <Input placeholder={`Word D (e.g. numbness)`}   value={opt.word_d} onChange={e=>updateOption(i,'word_d',e.target.value)} />
                  <Input placeholder={`Word C বাংলা`}             value={opt.word_c_bn} onChange={e=>updateOption(i,'word_c_bn',e.target.value)} />
                  <Input placeholder={`Word D বাংলা`}             value={opt.word_d_bn} onChange={e=>updateOption(i,'word_d_bn',e.target.value)} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bangla Explanation */}
        <Textarea label="Bangla Explanation * (বাংলা ব্যাখ্যা)" placeholder="কেন এই উত্তর সঠিক তা বাংলায় ব্যাখ্যা করুন। সব শব্দের অর্থ ও কেন অন্যগুলো ভুল তাও লিখুন।"
          value={form.explanation_bn} onChange={e=>setForm(f=>({...f,explanation_bn:e.target.value}))}
          className="min-h-[140px]" />

        <Input label="Source (Exam Name)" placeholder="e.g. AB Bank MT-2011, BCS 44th" value={form.source} onChange={e=>setForm(f=>({...f,source:e.target.value}))} />

        <Button onClick={handleSave} loading={saving} className="w-full" size="lg">
          {modalMode==='edit' ? 'Save Changes' : 'Add Analogy'}
        </Button>
      </div>
    )
  }
}
