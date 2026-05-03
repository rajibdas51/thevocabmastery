'use client'
import { useState, useEffect } from 'react'
import { getAllProfiles, getWords, getLiveExams, deleteUser, deleteWord, deleteLiveExam, updateUserRole, createLiveExam, getCategories, setWordOfDay, getWords as getWordsForWOD } from '@/lib/db'
import { useAuthStore } from '@/store/auth'
import { useToast } from '@/components/ui/Toast'
import { useRouter } from 'next/navigation'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Modal from '@/components/ui/Modal'
import { formatDate, getInitials } from '@/lib/utils'
import type { Profile, Word, LiveExam, Category } from '@/types'
import { Users, BookOpen, Zap, Shield, Trash2, Plus, Star, ChevronDown } from 'lucide-react'

type Tab = 'users' | 'words' | 'exams' | 'wotd'

export default function AdminPage() {
  const { profile } = useAuthStore()
  const { add: toast } = useToast()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('users')

  const [users, setUsers] = useState<Profile[]>([])
  const [words, setWords] = useState<Word[]>([])
  const [exams, setExams] = useState<LiveExam[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  // Exam creation form
  const [showCreateExam, setShowCreateExam] = useState(false)
  const [examForm, setExamForm] = useState({
    title: '', description: '', category_id: '', scheduled_at: '', duration_minutes: '30', question_count: '20'
  })
  const [creatingExam, setCreatingExam] = useState(false)

  // WOTD
  const [wotdWord, setWotdWord] = useState('')
  const [wotdSearch, setWotdSearch] = useState('')
  const [wotdResults, setWotdResults] = useState<Word[]>([])
  const [settingWotd, setSettingWotd] = useState(false)

  useEffect(() => {
    if (profile?.role !== 'admin') { router.push('/dashboard'); return }
    loadAll()
  }, [profile])

  const loadAll = async () => {
    setLoading(true)
    const [u, w, e, c] = await Promise.all([
      getAllProfiles(), getWords({ pageSize: 50 }), getLiveExams(), getCategories()
    ])
    setUsers(u.data ?? [])
    setWords(w.data ?? [])
    setExams(e.data ?? [])
    setCategories(c.data ?? [])
    setLoading(false)
  }

  const handleDeleteUser = async (id: string) => {
    if (id === profile?.id) { toast("Can't delete yourself", 'error'); return }
    if (!confirm('Delete this user and all their data?')) return
    const { error } = await deleteUser(id)
    if (error) { toast(error, 'error'); return }
    toast('User deleted', 'success')
    setUsers(u => u.filter(x => x.id !== id))
  }

  const handleToggleAdmin = async (u: Profile) => {
    const newRole = u.role === 'admin' ? 'user' : 'admin'
    const { error } = await updateUserRole(u.id, newRole)
    if (error) { toast(error, 'error'); return }
    toast(`${u.full_name} is now ${newRole}`, 'success')
    setUsers(prev => prev.map(x => x.id === u.id ? { ...x, role: newRole } : x))
  }

  const handleDeleteWord = async (id: string) => {
    if (!confirm('Delete this word?')) return
    const { error } = await deleteWord(id)
    if (error) { toast(error, 'error'); return }
    toast('Word deleted', 'success')
    setWords(w => w.filter(x => x.id !== id))
  }

  const handleDeleteExam = async (id: string) => {
    if (!confirm('Delete this exam?')) return
    const { error } = await deleteLiveExam(id)
    if (error) { toast(error, 'error'); return }
    toast('Exam deleted', 'success')
    setExams(e => e.filter(x => x.id !== id))
  }

  const handleCreateExam = async () => {
    if (!examForm.title || !examForm.scheduled_at) { toast('Fill required fields', 'error'); return }
    if (!profile) return
    setCreatingExam(true)
    const { error } = await createLiveExam({
      title: examForm.title,
      description: examForm.description || undefined,
      category_id: examForm.category_id || undefined,
      scheduled_at: new Date(examForm.scheduled_at).toISOString(),
      duration_minutes: parseInt(examForm.duration_minutes),
      question_count: parseInt(examForm.question_count),
    }, profile.id)
    setCreatingExam(false)
    if (error) { toast(error, 'error'); return }
    toast('Exam created!', 'success')
    setShowCreateExam(false)
    loadAll()
  }

  const searchWotdWords = async () => {
    if (!wotdSearch.trim()) return
    const { data } = await getWordsForWOD({ search: wotdSearch, pageSize: 8 })
    setWotdResults(data ?? [])
  }

  const handleSetWotd = async (wordId: string) => {
    if (!profile) return
    setSettingWotd(true)
    const { error } = await setWordOfDay(wordId, profile.id)
    setSettingWotd(false)
    if (error) { toast(error, 'error'); return }
    toast("Word of the Day set for today! ✨", 'success')
    setWotdResults([])
    setWotdSearch('')
  }

  const TABS = [
    { id: 'users', label: 'Users', icon: Users, count: users.length },
    { id: 'words', label: 'Words', icon: BookOpen, count: words.length },
    { id: 'exams', label: 'Live Exams', icon: Zap, count: exams.length },
    { id: 'wotd', label: 'Word of Day', icon: Star, count: null },
  ]

  return (
    <div className="animate-fade-up">
      <PageHeader title="Admin Panel" subtitle="Manage users, content, and live exams" />
      <div className="p-8">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Users', value: users.length, color: '#7c6af7' },
            { label: 'Total Words', value: words.length, color: '#22d3a0' },
            { label: 'Categories', value: categories.length, color: '#f5c842' },
            { label: 'Live Exams', value: exams.length, color: '#fb923c' },
          ].map(s => (
            <Card key={s.label} accent={s.color} className="p-4">
              <p className="text-[10px] uppercase tracking-widest text-[#5a5a72]">{s.label}</p>
              <p className="font-playfair text-3xl font-black mt-1">{s.value}</p>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-[#12121a] rounded-xl p-1 mb-6 w-fit">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id as Tab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                tab === t.id ? 'bg-[#1a1a26] text-white' : 'text-[#5a5a72] hover:text-[#9090a8]'
              }`}>
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
              {t.count !== null && <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded-full">{t.count}</span>}
            </button>
          ))}
        </div>

        {/* ── USERS ── */}
        {tab === 'users' && (
          <Card>
            {loading ? <div className="p-6 skeleton h-40 rounded-xl" /> : (
              users.map(u => (
                <div key={u.id} className="flex items-center gap-4 px-5 py-4 border-b border-white/[0.04] last:border-0">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7c6af7] to-[#60a5fa] flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {getInitials(u.full_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">{u.full_name ?? 'Unknown'}</p>
                      <Badge variant={u.role === 'admin' ? 'purple' : 'gray'}>{u.role}</Badge>
                    </div>
                    <p className="text-xs text-[#5a5a72]">{u.email} · Joined {formatDate(u.created_at)}</p>
                  </div>
                  <div className="text-xs text-[#5a5a72] text-right">
                    <p>{u.tests_taken} tests</p>
                    <p>{u.avg_score.toFixed(0)}% avg</p>
                  </div>
                  <div className="flex gap-2">
                    {u.id !== profile?.id && (
                      <Button variant="secondary" size="sm" onClick={() => handleToggleAdmin(u)}>
                        <Shield className="w-3 h-3" />
                        {u.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                      </Button>
                    )}
                    {u.id !== profile?.id && (
                      <Button variant="danger" size="sm" onClick={() => handleDeleteUser(u.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </Card>
        )}

        {/* ── WORDS ── */}
        {tab === 'words' && (
          <Card>
            {loading ? <div className="p-6 skeleton h-40 rounded-xl" /> : (
              words.map(w => (
                <div key={w.id} className="flex items-center gap-4 px-5 py-3.5 border-b border-white/[0.04] last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">{w.word}</p>
                      <Badge variant={w.is_global ? 'green' : 'yellow'}>{w.is_global ? 'Global' : 'User'}</Badge>
                    </div>
                    <p className="text-xs text-[#5a5a72] truncate">{w.english_meaning}</p>
                  </div>
                  <p className="text-xs text-[#5a5a72]">{formatDate(w.created_at)}</p>
                  <Button variant="danger" size="sm" onClick={() => handleDeleteWord(w.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))
            )}
          </Card>
        )}

        {/* ── EXAMS ── */}
        {tab === 'exams' && (
          <div>
            <div className="flex justify-end mb-4">
              <Button onClick={() => setShowCreateExam(true)}>
                <Plus className="w-4 h-4" /> Create Live Exam
              </Button>
            </div>
            <Card>
              {loading ? <div className="p-6 skeleton h-40 rounded-xl" /> : exams.length === 0 ? (
                <div className="p-8 text-center text-[#5a5a72] text-sm">No exams yet</div>
              ) : (
                exams.map(e => (
                  <div key={e.id} className="flex items-center gap-4 px-5 py-4 border-b border-white/[0.04] last:border-0">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-sm">{e.title}</p>
                        <Badge variant={e.status === 'upcoming' ? 'purple' : e.status === 'live' ? 'red' : 'blue'}>{e.status}</Badge>
                      </div>
                      <p className="text-xs text-[#5a5a72]">{formatDate(e.scheduled_at)} · {e.question_count} Qs · {e.duration_minutes} min</p>
                    </div>
                    <Button variant="danger" size="sm" onClick={() => handleDeleteExam(e.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))
              )}
            </Card>
          </div>
        )}

        {/* ── WORD OF DAY ── */}
        {tab === 'wotd' && (
          <div className="max-w-lg">
            <Card className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Star className="w-4 h-4 text-[#f5c842]" /> Set Word of the Day
              </h3>
              <div className="flex gap-3">
                <Input
                  placeholder="Search a word..."
                  value={wotdSearch}
                  onChange={e => setWotdSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchWotdWords()}
                />
                <Button onClick={searchWotdWords}>Search</Button>
              </div>
              {wotdResults.length > 0 && (
                <div className="mt-3 space-y-2">
                  {wotdResults.map(w => (
                    <div key={w.id} className="flex items-center justify-between p-3 bg-[#1a1a26] rounded-xl border border-white/[0.06]">
                      <div>
                        <p className="font-semibold text-sm">{w.word}</p>
                        <p className="text-xs text-[#5a5a72]">{w.english_meaning.slice(0, 50)}...</p>
                      </div>
                      <Button size="sm" loading={settingWotd} onClick={() => handleSetWotd(w.id)}>
                        Set Today
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}
      </div>

      {/* Create Exam Modal */}
      <Modal open={showCreateExam} onClose={() => setShowCreateExam(false)} title="Create Live Exam" size="md">
        <div className="space-y-4">
          <Input label="Exam Title *" placeholder="e.g. BCS Vocabulary Challenge"
            value={examForm.title} onChange={e => setExamForm({ ...examForm, title: e.target.value })} />
          <Input label="Description" placeholder="Brief description"
            value={examForm.description} onChange={e => setExamForm({ ...examForm, description: e.target.value })} />
          <Select label="Category" value={examForm.category_id} onChange={v => setExamForm({ ...examForm, category_id: v })}
            options={[{ value: '', label: 'All categories' }, ...categories.map(c => ({ value: c.id, label: c.name }))]} />
          <Input label="Scheduled Date & Time *" type="datetime-local"
            value={examForm.scheduled_at} onChange={e => setExamForm({ ...examForm, scheduled_at: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Duration (minutes)" type="number" value={examForm.duration_minutes}
              onChange={e => setExamForm({ ...examForm, duration_minutes: e.target.value })} />
            <Input label="Number of Questions" type="number" value={examForm.question_count}
              onChange={e => setExamForm({ ...examForm, question_count: e.target.value })} />
          </div>
          <Button onClick={handleCreateExam} loading={creatingExam} className="w-full" size="lg">
            Create Exam
          </Button>
        </div>
      </Modal>
    </div>
  )
}