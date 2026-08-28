'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth'
import { useToast } from '@/components/ui/Toast'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Textarea from '@/components/ui/Textarea'
import ProgressBar from '@/components/ui/Progressbar'
import {
  Plus, ArrowLeft, BookOpen, PenSquare, CheckCircle2,
  XCircle, Lightbulb, Trash2, Pencil, Timer, RotateCcw,
  Home, ChevronRight, Award, ClipboardList
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────
interface AnalogyTest {
  id: string; title: string; test_number: number
  description: string | null; is_published: boolean
  created_at: string; question_count?: number
  user_score?: number | null
}
interface AnalogyOption {
  id: string; word_c: string; word_d: string
  word_c_bn: string; word_d_bn: string
}
interface Analogy {
  id: string; test_id: string; question_number: number
  word_a: string; word_b: string
  word_a_bn: string | null; word_b_bn: string | null
  options: AnalogyOption[]; correct_option: string
  explanation_bn: string; relationship_type: string
  source: string | null; difficulty: string
}

type View = 'tests' | 'test_detail' | 'study' | 'exam' | 'exam_result'

const DIFF_COLOR: Record<string, string> = {
  easy:'#22d3a0', medium:'#f5c842', hard:'#f8706a'
}

// ─── DB helpers ───────────────────────────────────────────────
async function getTests(): Promise<AnalogyTest[]> {
  const db = createClient()
  const { data } = await db
    .from('analogy_tests')
    .select('*')
    .eq('is_published', true)
    .order('test_number')
  return data ?? []
}

async function getTestWithQuestions(testId: string): Promise<{ test: AnalogyTest | null; questions: Analogy[] }> {
  const db = createClient()
  const [{ data: test }, { data: questions }] = await Promise.all([
    db.from('analogy_tests').select('*').eq('id', testId).single(),
    db.from('analogies').select('*').eq('test_id', testId).order('question_number'),
  ])
  return { test: test ?? null, questions: questions ?? [] }
}

async function saveTestResult(result: {
  user_id: string; test_id: string; score: number
  total_questions: number; percentage: number
  time_taken_secs: number; answers: any[]
}) {
  const db = createClient()
  await db.from('analogy_test_results')
    .upsert(result, { onConflict: 'user_id,test_id' })
}

async function getUserResults(userId: string): Promise<Record<string, number>> {
  const db = createClient()
  const { data } = await db
    .from('analogy_test_results')
    .select('test_id, percentage')
    .eq('user_id', userId)
  const map: Record<string, number> = {}
  for (const r of data ?? []) map[r.test_id] = r.percentage
  return map
}

async function createTest(input: { title: string; test_number: number; description: string }, userId: string) {
  const db = createClient()
  return db.from('analogy_tests').insert({ ...input, created_by: userId }).select().single()
}

async function createQuestion(input: any) {
  const db = createClient()
  return db.from('analogies').insert(input).select().single()
}

async function updateQuestion(id: string, updates: any) {
  const db = createClient()
  return db.from('analogies').update(updates).eq('id', id).select().single()
}

async function deleteQuestion(id: string) {
  const db = createClient()
  return db.from('analogies').delete().eq('id', id)
}

async function deleteTest(id: string) {
  const db = createClient()
  return db.from('analogy_tests').delete().eq('id', id)
}

// ─── Main Component ───────────────────────────────────────────
export default function AnalogyPage() {
  const { profile }    = useAuthStore()
  const { add: toast } = useToast()
  const isAdmin        = profile?.role === 'admin'

  const [view,         setView]        = useState<View>('tests')
  const [tests,        setTests]       = useState<AnalogyTest[]>([])
  const [userScores,   setUserScores]  = useState<Record<string, number>>({})
  const [activeTest,   setActiveTest]  = useState<AnalogyTest | null>(null)
  const [questions,    setQuestions]   = useState<Analogy[]>([])
  const [loading,      setLoading]     = useState(true)

  // Exam state
  const [current,      setCurrent]     = useState(0)
  const [picked,       setPicked]      = useState<string | null>(null)
  const [showExp,      setShowExp]     = useState(false)
  const [answers,      setAnswers]     = useState<any[]>([])
  const [elapsed,      setElapsed]     = useState(0)
  const timerRef = useRef<any>(null)

  // Admin modal
  const [showTestModal, setShowTestModal] = useState(false)
  const [showQModal,    setShowQModal]    = useState(false)
  const [qModalMode,    setQModalMode]    = useState<'add'|'edit'>('add')
  const [savingTest,    setSavingTest]    = useState(false)
  const [savingQ,       setSavingQ]       = useState(false)
  const [editingQ,      setEditingQ]      = useState<Analogy | null>(null)

  const [testForm, setTestForm] = useState({ title: '', test_number: '', description: '' })
  const [qForm, setQForm] = useState({
    word_a: '', word_b: '', word_a_bn: '', word_b_bn: '',
    correct_option: 'a', explanation_bn: '',
    relationship_type: 'cause_effect', difficulty: 'medium', source: '',
    options: [
      { id:'a', word_c:'', word_d:'', word_c_bn:'', word_d_bn:'' },
      { id:'b', word_c:'', word_d:'', word_c_bn:'', word_d_bn:'' },
      { id:'c', word_c:'', word_d:'', word_c_bn:'', word_d_bn:'' },
      { id:'d', word_c:'', word_d:'', word_c_bn:'', word_d_bn:'' },
    ],
  })

  useEffect(() => { loadTests() }, [])

  useEffect(() => {
    if (view === 'exam') {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [view])

  const loadTests = async () => {
    setLoading(true)
    const [data, scores] = await Promise.all([
      getTests(),
      profile ? getUserResults(profile.id) : Promise.resolve({})
    ])
    setTests(data); setUserScores(scores); setLoading(false)
  }

  const openTest = async (test: AnalogyTest) => {
    setLoading(true)
    const { test: t, questions: q } = await getTestWithQuestions(test.id)
    setActiveTest(t); setQuestions(q); setLoading(false)
    setView('test_detail')
  }

  const startExam = () => {
    setCurrent(0); setPicked(null); setShowExp(false)
    setAnswers([]); setElapsed(0); setView('exam')
  }

  const pickOption = async (optId: string) => {
    if (picked) return
    setPicked(optId); setShowExp(true)
    const q = questions[current]
    const isCorrect = optId === q.correct_option
    setAnswers(prev => [...prev, {
      analogy_id: q.id, question_number: q.question_number,
      word_a: q.word_a, word_b: q.word_b,
      selected: optId, correct: q.correct_option, is_correct: isCorrect
    }])
  }

  const nextQuestion = async () => {
    const isLast = current + 1 >= questions.length
    if (isLast) {
      // Save result
      if (profile && activeTest) {
        const score = [...answers].filter(a => a.is_correct).length
        const pct   = Math.round((score / questions.length) * 100)
        await saveTestResult({
          user_id: profile.id, test_id: activeTest.id,
          score, total_questions: questions.length,
          percentage: pct, time_taken_secs: elapsed, answers,
        })
        setUserScores(prev => ({ ...prev, [activeTest.id]: pct }))
      }
      setView('exam_result')
    } else {
      setCurrent(c => c + 1); setPicked(null); setShowExp(false)
    }
  }

  // Admin: add test
  const handleAddTest = async () => {
    if (!testForm.title || !testForm.test_number) { toast('Fill all fields', 'error'); return }
    if (!profile) return
    setSavingTest(true)
    const { error } = await createTest({
      title: testForm.title,
      test_number: parseInt(testForm.test_number),
      description: testForm.description,
    }, profile.id)
    setSavingTest(false)
    if (error) { toast(error.message, 'error'); return }
    toast('Test created!', 'success')
    setShowTestModal(false)
    setTestForm({ title:'', test_number:'', description:'' })
    loadTests()
  }

  const handleDeleteTest = async (id: string) => {
    if (!confirm('Delete this test and ALL its questions?')) return
    await deleteTest(id)
    toast('Test deleted', 'success')
    setView('tests'); loadTests()
  }

  // Admin: add/edit question
  const openAddQ = () => {
    setQForm({ word_a:'', word_b:'', word_a_bn:'', word_b_bn:'', correct_option:'a', explanation_bn:'', relationship_type:'cause_effect', difficulty:'medium', source:'',
      options:[{id:'a',word_c:'',word_d:'',word_c_bn:'',word_d_bn:''},{id:'b',word_c:'',word_d:'',word_c_bn:'',word_d_bn:''},{id:'c',word_c:'',word_d:'',word_c_bn:'',word_d_bn:''},{id:'d',word_c:'',word_d:'',word_c_bn:'',word_d_bn:''}]
    })
    setQModalMode('add'); setEditingQ(null); setShowQModal(true)
  }

  const openEditQ = (q: Analogy) => {
    setQForm({ word_a:q.word_a, word_b:q.word_b, word_a_bn:q.word_a_bn??'', word_b_bn:q.word_b_bn??'',
      correct_option:q.correct_option, explanation_bn:q.explanation_bn,
      relationship_type:q.relationship_type, difficulty:q.difficulty, source:q.source??'',
      options: q.options.map(o => ({ ...o }))
    })
    setQModalMode('edit'); setEditingQ(q); setShowQModal(true)
  }

  const handleSaveQ = async () => {
    if (!qForm.word_a || !qForm.word_b || !qForm.explanation_bn) { toast('Fill required fields', 'error'); return }
    if (!activeTest) return
    setSavingQ(true)
    const payload = {
      word_a: qForm.word_a.trim().toUpperCase(), word_b: qForm.word_b.trim().toUpperCase(),
      word_a_bn: qForm.word_a_bn, word_b_bn: qForm.word_b_bn,
      options: qForm.options, correct_option: qForm.correct_option,
      explanation_bn: qForm.explanation_bn, relationship_type: qForm.relationship_type,
      difficulty: qForm.difficulty, source: qForm.source,
    }
    if (qModalMode === 'edit' && editingQ) {
      const { error } = await updateQuestion(editingQ.id, payload)
      setSavingQ(false)
      if (error) { toast(error.message, 'error'); return }
      toast('Question updated!', 'success')
    } else {
      const nextNum = questions.length + 1
      const { error } = await createQuestion({ ...payload, test_id: activeTest.id, question_number: nextNum })
      setSavingQ(false)
      if (error) { toast(error.message, 'error'); return }
      toast('Question added!', 'success')
    }
    setShowQModal(false)
    // Reload questions
    const { questions: q } = await getTestWithQuestions(activeTest.id)
    setQuestions(q)
  }

  const handleDeleteQ = async (id: string) => {
    if (!confirm('Delete this question?')) return
    await deleteQuestion(id)
    toast('Deleted', 'success')
    if (activeTest) {
      const { questions: q } = await getTestWithQuestions(activeTest.id)
      setQuestions(q)
    }
  }

  const updateOpt = (i: number, key: string, val: string) =>
    setQForm(f => { const opts = [...f.options]; opts[i] = { ...opts[i], [key]: val }; return { ...f, options: opts } })

  const formatTime = (s: number) =>
    `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`

  // ── EXAM RESULT ───────────────────────────────────────────
  if (view === 'exam_result') {
    const score = answers.filter(a => a.is_correct).length
    const pct   = Math.round((score / questions.length) * 100)
    return (
      <div className="animate-fade-up">
        <PageHeader title="Exam Results" subtitle={activeTest?.title} />
        <div className="p-4 sm:p-8 max-w-2xl">
          <Card className="p-6 sm:p-8">
            <div className="text-center mb-6">
              <div className="font-playfair text-7xl font-black mb-2"
                style={{ color: pct>=70?'#22d3a0':pct>=40?'#f5c842':'#f8706a' }}>
                {pct}%
              </div>
              <p className="text-xl font-semibold" style={{ color:'var(--text)' }}>
                {pct>=80?'Excellent! 🏆':pct>=60?'Good job! 👍':pct>=40?'Keep practicing 📚':'Need more review 💡'}
              </p>
              <p className="text-sm mt-1" style={{ color:'var(--text3)' }}>
                {score}/{questions.length} correct · {formatTime(elapsed)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="text-center p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <div className="text-3xl font-black text-emerald-500">{score}</div>
                <div className="text-xs mt-1" style={{ color:'var(--text3)' }}>✓ Correct</div>
              </div>
              <div className="text-center p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                <div className="text-3xl font-black text-red-400">{questions.length - score}</div>
                <div className="text-xs mt-1" style={{ color:'var(--text3)' }}>✗ Wrong</div>
              </div>
            </div>

            {/* Answer review */}
            <div className="space-y-2 max-h-80 overflow-y-auto mb-5">
              <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color:'var(--text3)' }}>Review</p>
              {answers.map((a, i) => {
                const q = questions[i]
                const selOpt = q?.options.find(o => o.id === a.selected)
                const corOpt = q?.options.find(o => o.id === a.correct)
                return (
                  <div key={i} className={cn('p-3 rounded-xl border text-sm',
                    a.is_correct ? 'bg-emerald-500/8 border-emerald-500/20' : 'bg-red-500/8 border-red-500/20')}>
                    <div className="flex items-center gap-2 mb-1">
                      {a.is_correct
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0"/>
                        : <XCircle className="w-4 h-4 text-red-400 flex-shrink-0"/>}
                      <span className="font-bold" style={{ color:'var(--text)' }}>
                        Q{a.question_number}. {a.word_a} : {a.word_b}
                      </span>
                    </div>
                    {!a.is_correct && (
                      <div className="pl-6 text-xs space-y-0.5">
                        <p style={{ color:'#f8706a' }}>Your: {selOpt?.word_c} : {selOpt?.word_d}</p>
                        <p style={{ color:'#22d3a0' }}>Correct: {corOpt?.word_c} : {corOpt?.word_d}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => { setView('test_detail') }}>
                <ArrowLeft className="w-3.5 h-3.5"/> Back to Test
              </Button>
              <Button className="flex-1" onClick={() => { startExam() }}>
                <RotateCcw className="w-3.5 h-3.5"/> Retake
              </Button>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  // ── ACTIVE EXAM ───────────────────────────────────────────
  if (view === 'exam') {
    const q = questions[current]
    if (!q) return null
    return (
      <div className="animate-fade-up">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-8 pt-6 pb-0 flex-wrap gap-3">
          <div>
            <h1 className="font-playfair text-xl font-black" style={{ color:'var(--text)' }}>
              {activeTest?.title}
            </h1>
            <p className="text-sm" style={{ color:'var(--text2)' }}>
              Question {current + 1} of {questions.length}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 font-mono text-sm" style={{ color:'var(--text2)' }}>
              <Timer className="w-3.5 h-3.5"/>{formatTime(elapsed)}
            </div>
            <span className="text-xs font-semibold px-2 py-1 rounded-lg"
              style={{ background: DIFF_COLOR[q.difficulty]+'15', color: DIFF_COLOR[q.difficulty] }}>
              {q.difficulty}
            </span>
            <Button variant="ghost" size="sm" onClick={() => setView('test_detail')}>✕ Exit</Button>
          </div>
        </div>

        <div className="p-4 sm:p-8 max-w-2xl">
          <ProgressBar value={((current + 1) / questions.length) * 100} className="mb-5"/>

          <Card className="p-5 sm:p-7 space-y-5">
            {/* Q number + source */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                style={{ background:'var(--bg3)', color:'var(--text3)' }}>
                Q{q.question_number}
              </span>
              {q.source && <span className="text-[10px]" style={{ color:'var(--text3)' }}>{q.source}</span>}
            </div>

            {/* Stem */}
            <div className="p-4 sm:p-5 rounded-2xl text-center"
              style={{ background:'var(--bg3)', border:'1px solid var(--border2)' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color:'var(--text3)' }}>
                Choose the pair with the same relationship
              </p>
              <div className="flex items-center justify-center gap-3 sm:gap-5 flex-wrap">
                <div>
                  <p className="font-playfair text-2xl sm:text-3xl font-black" style={{ color:'var(--accent2)' }}>
                    {q.word_a}
                  </p>
                  {q.word_a_bn && <p className="text-xs mt-1" style={{ color:'var(--text3)' }}>{q.word_a_bn}</p>}
                </div>
                <p className="text-3xl font-black" style={{ color:'var(--border2)' }}>:</p>
                <div>
                  <p className="font-playfair text-2xl sm:text-3xl font-black" style={{ color:'var(--gold)' }}>
                    {q.word_b}
                  </p>
                  {q.word_b_bn && <p className="text-xs mt-1" style={{ color:'var(--text3)' }}>{q.word_b_bn}</p>}
                </div>
              </div>
            </div>

            {/* Options */}
            <div className="space-y-2.5">
              {q.options.map((opt, oi) => {
                const isCorrect  = opt.id === q.correct_option
                const isSelected = opt.id === picked
                const revealed   = !!picked

                let bg = 'var(--bg3)', border = 'var(--border2)', opacity = 1
                if (revealed && isCorrect)       { bg='rgba(34,211,160,0.15)';  border='rgba(34,211,160,0.6)' }
                else if (revealed && isSelected) { bg='rgba(248,112,106,0.15)'; border='rgba(248,112,106,0.6)' }
                else if (revealed)               { opacity=0.4 }

                return (
                  <button key={opt.id} onClick={() => pickOption(opt.id)}
                    className="w-full p-4 rounded-xl text-left border transition-all duration-200 relative"
                    style={{ background:bg, borderColor:border, opacity }}>
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border-2 flex-shrink-0 mt-0.5"
                        style={{
                          borderColor: revealed&&isCorrect?'#22d3a0':revealed&&isSelected?'#f8706a':'var(--border2)',
                          color:       revealed&&isCorrect?'#22d3a0':revealed&&isSelected?'#f8706a':'var(--text3)',
                        }}>
                        {opt.id.toUpperCase()}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm" style={{ color:'var(--text)' }}>{opt.word_c}</span>
                          <span style={{ color:'var(--text3)' }}>:</span>
                          <span className="font-semibold text-sm" style={{ color:'var(--text)' }}>{opt.word_d}</span>
                        </div>
                        <p className="text-xs mt-0.5" style={{ color:'var(--text3)' }}>
                          {opt.word_c_bn} : {opt.word_d_bn}
                        </p>
                      </div>
                      {revealed && isCorrect  && <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5"/>}
                      {revealed && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5"/>}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Explanation */}
            {showExp && (
              <div className="p-4 rounded-xl border"
                style={{ background:'rgba(124,106,247,0.06)', borderColor:'rgba(124,106,247,0.25)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-4 h-4" style={{ color:'var(--accent2)' }}/>
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color:'var(--accent2)' }}>
                    ব্যাখ্যা
                  </p>
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color:'var(--text2)' }}>
                  {q.explanation_bn}
                </p>
              </div>
            )}

            {picked && (
              <Button className="w-full" size="lg" onClick={nextQuestion}>
                {current + 1 < questions.length ? 'Next Question →' : 'See Results →'}
              </Button>
            )}
          </Card>

          {/* Score tracker */}
          <div className="flex justify-center gap-6 mt-4 text-sm">
            <span className="text-emerald-500">✓ {answers.filter(a=>a.is_correct).length} correct</span>
            <span className="text-red-400">✗ {answers.filter(a=>!a.is_correct).length} wrong</span>
            <span style={{ color:'var(--text3)' }}>{questions.length - current - 1} left</span>
          </div>
        </div>
      </div>
    )
  }

  // ── TEST DETAIL (study or take exam) ──────────────────────
  if (view === 'test_detail' && activeTest) {
    const prevScore = userScores[activeTest.id]
    return (
      <div className="animate-fade-up">
        <div className="flex items-center gap-3 px-4 sm:px-8 pt-6 pb-0 flex-wrap">
          <Button variant="secondary" size="sm" onClick={() => { setView('tests'); setActiveTest(null) }}>
            <ArrowLeft className="w-3.5 h-3.5"/> All Tests
          </Button>
          {isAdmin && (
            <>
              <Button size="sm" onClick={openAddQ}>
                <Plus className="w-3.5 h-3.5"/> Add Question
              </Button>
              <Button variant="danger" size="sm" onClick={() => handleDeleteTest(activeTest.id)}>
                <Trash2 className="w-3.5 h-3.5"/> Delete Test
              </Button>
            </>
          )}
        </div>

        <div className="p-4 sm:p-8 max-w-3xl space-y-5">
          {/* Test header card */}
          <div className="p-5 sm:p-6 rounded-2xl border"
            style={{ background:'rgba(124,106,247,0.06)', borderColor:'rgba(124,106,247,0.25)' }}>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color:'var(--accent2)' }}>
                  GRE Analogy
                </p>
                <h2 className="font-playfair text-2xl font-black" style={{ color:'var(--text)' }}>
                  {activeTest.title}
                </h2>
                {activeTest.description && (
                  <p className="text-sm mt-1" style={{ color:'var(--text2)' }}>{activeTest.description}</p>
                )}
                <p className="text-sm mt-2" style={{ color:'var(--text3)' }}>
                  {questions.length} question{questions.length !== 1 ? 's' : ''}
                </p>
              </div>
              {prevScore !== undefined && (
                <div className="text-center px-4 py-3 rounded-xl"
                  style={{ background:'var(--bg3)', border:'1px solid var(--border2)' }}>
                  <p className="text-2xl font-black font-playfair"
                    style={{ color: prevScore>=70?'#22d3a0':prevScore>=40?'#f5c842':'#f8706a' }}>
                    {prevScore}%
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color:'var(--text3)' }}>Best Score</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-5">
              <Button className="flex-1" onClick={startExam} disabled={questions.length === 0}>
                <PenSquare className="w-4 h-4"/>
                {prevScore !== undefined ? 'Retake Exam' : 'Take Exam'}
              </Button>
              <Button variant="secondary" className="flex-1" onClick={() => setView('study')} disabled={questions.length === 0}>
                <BookOpen className="w-4 h-4"/> Study Mode
              </Button>
            </div>
          </div>

          {/* Questions list */}
          {questions.length === 0 ? (
            <div className="text-center py-12" style={{ color:'var(--text3)' }}>
              <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30"/>
              <p className="font-semibold">No questions yet</p>
              {isAdmin && <Button className="mt-4" onClick={openAddQ}><Plus className="w-4 h-4"/> Add First Question</Button>}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color:'var(--text3)' }}>
                Questions Preview
              </p>
              {questions.map((q, i) => (
                <div key={q.id} className="flex items-center gap-3 p-4 rounded-xl border"
                  style={{ background:'var(--card-bg)', borderColor:'var(--border)' }}>
                  <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                    style={{ background:'var(--bg3)', color:'var(--text3)' }}>
                    {q.question_number}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold" style={{ color:'var(--accent2)' }}>{q.word_a}</span>
                      <span style={{ color:'var(--text3)' }}>:</span>
                      <span className="font-semibold" style={{ color:'var(--gold)' }}>{q.word_b}</span>
                    </div>
                    {(q.word_a_bn || q.word_b_bn) && (
                      <p className="text-[11px] mt-0.5" style={{ color:'var(--text3)' }}>
                        {q.word_a_bn} : {q.word_b_bn}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded flex-shrink-0"
                    style={{ background: DIFF_COLOR[q.difficulty]+'15', color: DIFF_COLOR[q.difficulty] }}>
                    {q.difficulty}
                  </span>
                  {isAdmin && (
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => openEditQ(q)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-blue-500/10 transition-all"
                        style={{ color:'var(--text3)' }}>
                        <Pencil className="w-3.5 h-3.5"/>
                      </button>
                      <button onClick={() => handleDeleteQ(q.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-500/10 transition-all"
                        style={{ color:'var(--text3)' }}>
                        <Trash2 className="w-3.5 h-3.5"/>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Question modal */}
        <Modal open={showQModal} onClose={() => setShowQModal(false)}
          title={qModalMode==='edit'?'Edit Question':'Add Question'} size="xl">
          {renderQForm()}
        </Modal>
      </div>
    )
  }

  // ── STUDY MODE ────────────────────────────────────────────
  if (view === 'study' && activeTest) {
    return (
      <div className="animate-fade-up">
        <div className="flex items-center gap-3 px-4 sm:px-8 pt-6 pb-0">
          <Button variant="secondary" size="sm" onClick={() => setView('test_detail')}>
            <ArrowLeft className="w-3.5 h-3.5"/> Back
          </Button>
          <h1 className="font-playfair text-lg font-black" style={{ color:'var(--text)' }}>
            {activeTest.title} — Study Mode
          </h1>
        </div>
        <div className="p-4 sm:p-8 max-w-2xl space-y-4">
          {questions.map(q => (
            <Card key={q.id} className="p-5 sm:p-6 space-y-4">
              {/* Q header */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                  style={{ background:'var(--bg3)', color:'var(--text3)' }}>
                  Q{q.question_number}
                </span>
                <div className="flex items-center gap-2">
                  {q.source && <span className="text-[10px]" style={{ color:'var(--text3)' }}>{q.source}</span>}
                  <span className="text-[10px] px-2 py-0.5 rounded"
                    style={{ background: DIFF_COLOR[q.difficulty]+'15', color: DIFF_COLOR[q.difficulty] }}>
                    {q.difficulty}
                  </span>
                </div>
              </div>

              {/* Stem */}
              <div className="p-4 rounded-xl text-center"
                style={{ background:'var(--bg3)', border:'1px solid var(--border2)' }}>
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  <div>
                    <p className="font-playfair text-2xl font-black" style={{ color:'var(--accent2)' }}>{q.word_a}</p>
                    {q.word_a_bn && <p className="text-xs mt-0.5" style={{ color:'var(--text3)' }}>{q.word_a_bn}</p>}
                  </div>
                  <p className="text-2xl font-black" style={{ color:'var(--border2)' }}>:</p>
                  <div>
                    <p className="font-playfair text-2xl font-black" style={{ color:'var(--gold)' }}>{q.word_b}</p>
                    {q.word_b_bn && <p className="text-xs mt-0.5" style={{ color:'var(--text3)' }}>{q.word_b_bn}</p>}
                  </div>
                </div>
              </div>

              {/* Options */}
              <div className="space-y-2">
                {q.options.map(opt => {
                  const isAns = opt.id === q.correct_option
                  return (
                    <div key={opt.id} className="p-3.5 rounded-xl border flex items-start gap-3"
                      style={{
                        background:  isAns?'rgba(34,211,160,0.10)':'var(--bg3)',
                        borderColor: isAns?'rgba(34,211,160,0.40)':'var(--border2)',
                      }}>
                      <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5"
                        style={{ background: isAns?'rgba(34,211,160,0.20)':'var(--bg4)', color: isAns?'#22d3a0':'var(--text3)', border:`1px solid ${isAns?'#22d3a040':'var(--border2)'}` }}>
                        {opt.id.toUpperCase()}
                      </span>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm" style={{ color:'var(--text)' }}>{opt.word_c}</span>
                          <span style={{ color:'var(--text3)' }}>:</span>
                          <span className="font-semibold text-sm" style={{ color:'var(--text)' }}>{opt.word_d}</span>
                          {isAns && <span className="text-[10px] font-bold text-emerald-500">✓ ANS</span>}
                        </div>
                        <p className="text-xs mt-0.5" style={{ color:'var(--text3)' }}>
                          {opt.word_c_bn} : {opt.word_d_bn}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Explanation */}
              <div className="p-4 rounded-xl border"
                style={{ background:'rgba(124,106,247,0.06)', borderColor:'rgba(124,106,247,0.20)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-4 h-4" style={{ color:'var(--accent2)' }}/>
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color:'var(--accent2)' }}>ব্যাখ্যা</p>
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color:'var(--text2)' }}>
                  {q.explanation_bn}
                </p>
              </div>
            </Card>
          ))}

          {/* Take exam CTA */}
          <div className="text-center py-4">
            <Button size="lg" onClick={startExam}>
              <PenSquare className="w-4 h-4"/> Take Exam Now
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ── TESTS LIST (home) ─────────────────────────────────────
  return (
    <div className="animate-fade-up">
      <PageHeader
        title="GRE Analogy"
        subtitle="Select a test to study or take exam"
        action={isAdmin
          ? <Button onClick={() => setShowTestModal(true)}><Plus className="w-4 h-4"/> Create Test</Button>
          : undefined}
      />
      <div className="p-4 sm:p-8">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array(6).fill(0).map((_,i) => <div key={i} className="skeleton h-40 rounded-2xl"/>)}
          </div>
        ) : tests.length === 0 ? (
          <div className="text-center py-20" style={{ color:'var(--text3)' }}>
            <Award className="w-12 h-12 mx-auto mb-3 opacity-30"/>
            <p className="font-semibold text-lg">No analogy tests yet</p>
            <p className="text-sm mt-1">Admin can create tests from the button above</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tests.map(test => {
              const score = userScores[test.id]
              const done  = score !== undefined
              return (
                <button key={test.id} onClick={() => openTest(test)}
                  className="p-5 sm:p-6 rounded-2xl border text-left hover:-translate-y-0.5 transition-all group"
                  style={{ background:'var(--card-bg)', borderColor:'var(--border)' }}>

                  {/* Test number badge */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center font-playfair font-black text-lg"
                      style={{ background:'rgba(124,106,247,0.12)', color:'var(--accent2)' }}>
                      {test.test_number}
                    </div>
                    {done && (
                      <div className="text-right">
                        <p className="text-lg font-black font-mono"
                          style={{ color: score>=70?'#22d3a0':score>=40?'#f5c842':'#f8706a' }}>
                          {score}%
                        </p>
                        <p className="text-[10px]" style={{ color:'var(--text3)' }}>best</p>
                      </div>
                    )}
                  </div>

                  <h3 className="font-playfair text-lg font-bold mb-1" style={{ color:'var(--text)' }}>
                    {test.title}
                  </h3>
                  {test.description && (
                    <p className="text-xs mb-3" style={{ color:'var(--text3)' }}>{test.description}</p>
                  )}

                  <div className="flex items-center justify-between mt-3">
                    <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full',
                      done ? 'bg-emerald-500/15 text-emerald-500' : 'bg-[var(--bg3)] text-[var(--text3)]')}>
                      {done ? '✓ Attempted' : 'Not attempted'}
                    </span>
                    <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color:'var(--accent2)' }}/>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Create Test Modal (admin) */}
      <Modal open={showTestModal} onClose={() => setShowTestModal(false)} title="Create New Analogy Test">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Test Number *" type="number" placeholder="e.g. 27"
              value={testForm.test_number} onChange={e => setTestForm(f=>({...f,test_number:e.target.value}))} />
            <Input label="Title *" placeholder="GRE Analogy Test 27"
              value={testForm.title} onChange={e => setTestForm(f=>({...f,title:e.target.value}))} />
          </div>
          <Textarea label="Description" placeholder="Source exams, topics covered..."
            value={testForm.description} onChange={e => setTestForm(f=>({...f,description:e.target.value}))} />
          <Button onClick={handleAddTest} loading={savingTest} className="w-full" size="lg">
            Create Test
          </Button>
        </div>
      </Modal>

      {/* Question modal */}
      <Modal open={showQModal} onClose={() => setShowQModal(false)}
        title={qModalMode==='edit'?'Edit Question':'Add Question'} size="xl">
        {renderQForm()}
      </Modal>
    </div>
  )

  // ── Question Form ─────────────────────────────────────────
  function renderQForm() {
    return (
      <div className="space-y-5">
        {/* Stem */}
        <div className="p-4 rounded-xl border space-y-3" style={{ background:'var(--bg3)', borderColor:'var(--border2)' }}>
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color:'var(--text2)' }}>Stem Pair *</p>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Word A" placeholder="SEDATIVE" value={qForm.word_a}
              onChange={e=>setQForm(f=>({...f,word_a:e.target.value.toUpperCase()}))} />
            <Input label="Word B" placeholder="DROWSINESS" value={qForm.word_b}
              onChange={e=>setQForm(f=>({...f,word_b:e.target.value.toUpperCase()}))} />
            <Input label="Word A (বাংলা)" placeholder="ঘুমের ওষুধ" value={qForm.word_a_bn}
              onChange={e=>setQForm(f=>({...f,word_a_bn:e.target.value}))} />
            <Input label="Word B (বাংলা)" placeholder="তন্দ্রালুতা" value={qForm.word_b_bn}
              onChange={e=>setQForm(f=>({...f,word_b_bn:e.target.value}))} />
          </div>
        </div>

        {/* Options */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color:'var(--text2)' }}>
            4 MCQ Options — click the circle to mark correct answer
          </p>
          <div className="space-y-3">
            {qForm.options.map((opt, i) => {
              const isCorrect = qForm.correct_option === opt.id
              return (
                <div key={opt.id} className="p-3.5 rounded-xl border transition-all"
                  style={{ background: isCorrect?'rgba(34,211,160,0.06)':'var(--bg3)', borderColor: isCorrect?'rgba(34,211,160,0.35)':'var(--border2)' }}>
                  <div className="flex items-center gap-2 mb-2.5">
                    <button onClick={() => setQForm(f=>({...f,correct_option:opt.id}))}
                      className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-black transition-all flex-shrink-0"
                      style={{ borderColor: isCorrect?'#22d3a0':'var(--border2)', background: isCorrect?'#22d3a020':'transparent', color: isCorrect?'#22d3a0':'var(--text3)' }}>
                      {opt.id.toUpperCase()}
                    </button>
                    <span className="text-xs font-semibold" style={{ color: isCorrect?'#22d3a0':'var(--text3)' }}>
                      Option {opt.id.toUpperCase()} {isCorrect?'✓ Correct Answer':''}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="Word C (English)" value={opt.word_c}   onChange={e=>updateOpt(i,'word_c',e.target.value)} />
                    <Input placeholder="Word D (English)" value={opt.word_d}   onChange={e=>updateOpt(i,'word_d',e.target.value)} />
                    <Input placeholder="Word C (বাংলা)"  value={opt.word_c_bn} onChange={e=>updateOpt(i,'word_c_bn',e.target.value)} />
                    <Input placeholder="Word D (বাংলা)"  value={opt.word_d_bn} onChange={e=>updateOpt(i,'word_d_bn',e.target.value)} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-3">
          <Select label="Difficulty" value={qForm.difficulty}
            onChange={v=>setQForm(f=>({...f,difficulty:v}))}
            options={[{value:'easy',label:'Easy'},{value:'medium',label:'Medium'},{value:'hard',label:'Hard'}]} />
          <Input label="Source" placeholder="AB Bank MT-2011" value={qForm.source}
            onChange={e=>setQForm(f=>({...f,source:e.target.value}))} />
        </div>

        {/* Bangla explanation */}
        <Textarea label="Bangla Explanation * (বাংলা ব্যাখ্যা)"
          placeholder="কেন এই উত্তর সঠিক তা বাংলায় লিখুন। সব শব্দের অর্থ এবং অন্যগুলো কেন ভুল তাও লিখুন।"
          value={qForm.explanation_bn} onChange={e=>setQForm(f=>({...f,explanation_bn:e.target.value}))}
          className="min-h-[140px]" />

        <Button onClick={handleSaveQ} loading={savingQ} className="w-full" size="lg">
          {qModalMode==='edit' ? 'Save Changes' : 'Add Question'}
        </Button>
      </div>
    )
  }
}