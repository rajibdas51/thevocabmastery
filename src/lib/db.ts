/**
 * VocabMaster Database Service Layer
 * All DB calls go through here. To migrate away from Supabase,
 * only change this file — calling code never needs to change.
 */

import { createClient } from '@/lib/supabase/client'
import type {
  Profile, Category, Word, UserWordProgress, QuizAttempt,
  LiveExam, ExamRegistration, ExamResult, FocusWriting,
  WordOfDay, CreateWordInput, CreateExamInput,
  CreateFocusWritingInput, PaginatedResponse, ApiResponse,
  DashboardStats, QuizQuestion, QuizType,
} from '@/types'

// ─── WORDS ────────────────────────────────────────────────────

export async function getWords(opts?: {
  search?: string
  categoryId?: string
  page?: number
  pageSize?: number
  userId?: string
}): Promise<PaginatedResponse<Word>> {
  const db = createClient()
  const page = opts?.page ?? 1
  const pageSize = opts?.pageSize ?? 20
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = db
    .from('words')
    .select('*, categories:word_categories(category:categories(*))', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (opts?.search) {
    query = query.or(
      `word.ilike.%${opts.search}%,english_meaning.ilike.%${opts.search}%,bangla_meaning.ilike.%${opts.search}%`
    )
  }

  if (opts?.categoryId) {
    const { data: wids } = await db
      .from('word_categories')
      .select('word_id')
      .eq('category_id', opts.categoryId)
    const ids = (wids ?? []).map((r: any) => r.word_id)
    if (ids.length === 0) return { data: [], count: 0, page, pageSize, totalPages: 0, error: null }
    query = query.in('id', ids)
  }

  const { data, count, error } = await query

  const words: Word[] = (data ?? []).map((w: any) => ({
    ...w,
    categories: (w.categories ?? []).map((wc: any) => wc.category).filter(Boolean),
  }))

  return {
    data: words,
    count: count ?? 0,
    page,
    pageSize,
    totalPages: Math.ceil((count ?? 0) / pageSize),
    error: error?.message ?? null,
  }
}

export async function getWordById(id: string): Promise<ApiResponse<Word>> {
  const db = createClient()
  const { data, error } = await db
    .from('words')
    .select('*, categories:word_categories(category:categories(*))')
    .eq('id', id)
    .single()
  if (error || !data) return { data: null, error: error?.message ?? 'Not found' }
  return {
    data: { ...data, categories: (data.categories ?? []).map((wc: any) => wc.category).filter(Boolean) },
    error: null,
  }
}

export async function createWord(input: CreateWordInput, userId: string): Promise<ApiResponse<Word>> {
  const db = createClient()
  const { data: word, error } = await db
    .from('words')
    .insert({
      word: input.word.trim(),
      bangla_meaning: input.bangla_meaning?.trim() || null,
      english_meaning: input.english_meaning.trim(),
      synonyms: input.synonyms,
      antonyms: input.antonyms,
      example: input.example?.trim() || null,
      part_of_speech: input.part_of_speech || null,
      pronunciation: input.pronunciation?.trim() || null,
      is_global: false,
      created_by: userId,
    })
    .select()
    .single()

  if (error || !word) return { data: null, error: error?.message ?? 'Failed to create word' }

  let categoryIds = [...input.category_ids]
  if (input.new_category_name) {
    const { data: newCat } = await db
      .from('categories')
      .insert({ name: input.new_category_name, color: input.new_category_color ?? '#6366f1', is_global: false, created_by: userId })
      .select().single()
    if (newCat) categoryIds.push(newCat.id)
  }

  if (categoryIds.length > 0) {
    await db.from('word_categories').insert(categoryIds.map(cid => ({ word_id: word.id, category_id: cid })))
  }

  return { data: word as Word, error: null }
}

export async function updateWord(id: string, updates: Partial<Word>): Promise<ApiResponse<Word>> {
  const db = createClient()
  const { data, error } = await db.from('words').update(updates).eq('id', id).select().single()
  return { data: data as Word | null, error: error?.message ?? null }
}

export async function deleteWord(id: string): Promise<ApiResponse<null>> {
  const db = createClient()
  const { error } = await db.from('words').delete().eq('id', id)
  return { data: null, error: error?.message ?? null }
}

// ─── CATEGORIES ───────────────────────────────────────────────

export async function getCategories(userId?: string): Promise<ApiResponse<Category[]>> {
  const db = createClient()
  let query = db.from('categories').select('*').order('name')
  if (userId) {
    query = query.or(`is_global.eq.true,created_by.eq.${userId}`)
  } else {
    query = query.eq('is_global', true)
  }
  const { data, error } = await query
  return { data: data as Category[] ?? [], error: error?.message ?? null }
}

export async function createCategory(input: { name: string; description?: string; color: string; is_global?: boolean }, userId: string): Promise<ApiResponse<Category>> {
  const db = createClient()
  const { data, error } = await db.from('categories').insert({ ...input, created_by: userId }).select().single()
  return { data: data as Category | null, error: error?.message ?? null }
}

export async function deleteCategory(id: string): Promise<ApiResponse<null>> {
  const db = createClient()
  const { error } = await db.from('categories').delete().eq('id', id)
  return { data: null, error: error?.message ?? null }
}

// ─── USER PROGRESS ────────────────────────────────────────────

export async function getUserProgress(userId: string, wordIds?: string[]): Promise<ApiResponse<UserWordProgress[]>> {
  const db = createClient()
  let query = db.from('user_word_progress').select('*').eq('user_id', userId)
  if (wordIds?.length) query = query.in('word_id', wordIds)
  const { data, error } = await query
  return { data: data as UserWordProgress[] ?? [], error: error?.message ?? null }
}

export async function upsertProgress(userId: string, wordId: string, status: UserWordProgress['status']): Promise<ApiResponse<UserWordProgress>> {
  const db = createClient()
  const { data, error } = await db
    .from('user_word_progress')
    .upsert({ user_id: userId, word_id: wordId, status, review_count: 1, last_reviewed_at: new Date().toISOString() }, { onConflict: 'user_id,word_id' })
    .select().single()
  return { data: data as UserWordProgress | null, error: error?.message ?? null }
}

// ─── QUIZ ─────────────────────────────────────────────────────

export async function getQuizQuestions(
  categoryId: string,
  count: number,
  quizType: QuizType = 'meaning_en'
): Promise<ApiResponse<QuizQuestion[]>> {
  const db = createClient()

  const { data: wids } = await db
    .from('word_categories').select('word_id').eq('category_id', categoryId)
  if (!wids?.length) return { data: [], error: 'No words in this category' }

  const ids = wids.map((r: any) => r.word_id)
  const { data: words, error } = await db
    .from('words')
    .select('id, word, bangla_meaning, english_meaning, synonyms, antonyms, example')
    .in('id', ids)

  if (error || !words?.length) return { data: [], error: error?.message ?? 'No words found' }

  // For mixed, pick from all except fill_blank (fill_blank needs example sentences)
  const MIXED_POOL: QuizType[] = ['meaning_en', 'meaning_bn', 'synonym', 'antonym']

  const shuffled = [...words].sort(() => Math.random() - 0.5).slice(0, Math.min(count, words.length))

  const questions: QuizQuestion[] = shuffled
    .map((w: any): QuizQuestion | null => {
      let type: QuizType = quizType
      if (quizType === 'mixed') {
        type = MIXED_POOL[Math.floor(Math.random() * MIXED_POOL.length)]
      }

      // ── MEANING (English) ──────────────────────────────────
      // Show English word → pick correct English meaning from 4 options
      if (type === 'meaning_en') {
        const wrongs = words
          .filter((x: any) => x.id !== w.id)
          .sort(() => Math.random() - 0.5)
          .slice(0, 3)
          .map((x: any) => x.english_meaning)
        return {
          word_id: w.id, word: w.word, bangla_meaning: w.bangla_meaning,
          correct_answer: w.english_meaning,
          options: [...wrongs, w.english_meaning].sort(() => Math.random() - 0.5),
          question_label: 'What is the English meaning of',
          quiz_type: 'meaning_en',
        }
      }

      // ── MEANING (Bangla) ───────────────────────────────────
      // Show English word → pick correct Bangla meaning from 4 options
      if (type === 'meaning_bn') {
        if (!w.bangla_meaning) return null
        // Need other words that also have bangla meanings for wrong options
        const withBangla = words.filter((x: any) => x.id !== w.id && x.bangla_meaning)
        if (withBangla.length < 3) return null
        const wrongs = withBangla
          .sort(() => Math.random() - 0.5)
          .slice(0, 3)
          .map((x: any) => x.bangla_meaning as string)
        return {
          word_id: w.id, word: w.word, bangla_meaning: w.bangla_meaning,
          correct_answer: w.bangla_meaning,
          options: [...wrongs, w.bangla_meaning].sort(() => Math.random() - 0.5),
          question_label: 'এই ইংরেজি শব্দের বাংলা অর্থ কী?',
          quiz_type: 'meaning_bn',
        }
      }

      // ── SYNONYM ────────────────────────────────────────────
      if (type === 'synonym') {
        const syns: string[] = w.synonyms ?? []
        if (!syns.length) return null
        const correct = syns[Math.floor(Math.random() * syns.length)]
        const wrongPool = words
          .filter((x: any) => x.id !== w.id)
          .flatMap((x: any) => x.antonyms ?? [])
          .filter((s: string) => !syns.includes(s))
        const wrongs = [...new Set(wrongPool)].sort(() => Math.random() - 0.5).slice(0, 3)
        if (wrongs.length < 3) return null
        return {
          word_id: w.id, word: w.word, bangla_meaning: w.bangla_meaning,
          correct_answer: correct,
          options: [...wrongs, correct].sort(() => Math.random() - 0.5),
          question_label: 'Which word is a SYNONYM of',
          quiz_type: 'synonym',
        }
      }

      // ── ANTONYM ────────────────────────────────────────────
      if (type === 'antonym') {
        const ants: string[] = w.antonyms ?? []
        if (!ants.length) return null
        const correct = ants[Math.floor(Math.random() * ants.length)]
        const wrongPool = words
          .filter((x: any) => x.id !== w.id)
          .flatMap((x: any) => x.synonyms ?? [])
          .filter((s: string) => !ants.includes(s))
        const wrongs = [...new Set(wrongPool)].sort(() => Math.random() - 0.5).slice(0, 3)
        if (wrongs.length < 3) return null
        return {
          word_id: w.id, word: w.word, bangla_meaning: w.bangla_meaning,
          correct_answer: correct,
          options: [...wrongs, correct].sort(() => Math.random() - 0.5),
          question_label: 'Which word is an ANTONYM of',
          quiz_type: 'antonym',
        }
      }

      // ── FILL IN THE BLANK ──────────────────────────────────
      if (type === 'fill_blank') {
        if (!w.example) return null
        // Replace the word in the example with ___
        const regex = new RegExp(`\\b${w.word}\\b`, 'i')
        if (!regex.test(w.example)) return null
        const sentence = w.example.replace(regex, '___')
        const wrongWords = words
          .filter((x: any) => x.id !== w.id)
          .sort(() => Math.random() - 0.5)
          .slice(0, 3)
          .map((x: any) => x.word)
        return {
          word_id: w.id, word: w.word, bangla_meaning: w.bangla_meaning,
          correct_answer: w.word,
          options: [...wrongWords, w.word].sort(() => Math.random() - 0.5),
          question_label: 'Fill in the blank with the correct word',
          quiz_type: 'fill_blank',
          sentence,
        }
      }

      return null
    })
    .filter(Boolean) as QuizQuestion[]

  if (!questions.length) {
    return { data: [], error: 'Not enough word data for this quiz type. Try adding more synonyms/antonyms/examples.' }
  }

  return { data: questions, error: null }
}

export async function saveQuizAttempt(attempt: Omit<QuizAttempt, 'id' | 'created_at'>): Promise<ApiResponse<QuizAttempt>> {
  const db = createClient()
  const { data, error } = await db.from('quiz_attempts').insert(attempt).select().single()

  if (!error) {
    const { data: profile } = await db.from('profiles').select('tests_taken, avg_score').eq('id', attempt.user_id).single()
    if (profile) {
      const newTotal = profile.tests_taken + 1
      const newAvg = ((profile.avg_score * profile.tests_taken) + attempt.percentage) / newTotal
      await db.from('profiles').update({ tests_taken: newTotal, avg_score: Math.round(newAvg * 100) / 100 }).eq('id', attempt.user_id)
    }
  }

  return { data: data as QuizAttempt | null, error: error?.message ?? null }
}

// ─── LIVE EXAMS ───────────────────────────────────────────────

export async function getLiveExams(): Promise<ApiResponse<LiveExam[]>> {
  const db = createClient()
  const { data, error } = await db.from('live_exams').select('*, category:categories(*)').order('scheduled_at', { ascending: true })
  return { data: data as LiveExam[] ?? [], error: error?.message ?? null }
}

export async function registerForExam(examId: string, userId: string): Promise<ApiResponse<ExamRegistration>> {
  const db = createClient()
  const { data, error } = await db.from('exam_registrations').insert({ exam_id: examId, user_id: userId }).select().single()
  return { data: data as ExamRegistration | null, error: error?.message ?? null }
}

export async function submitExamResult(result: Omit<ExamResult, 'id' | 'rank' | 'submitted_at'>): Promise<ApiResponse<ExamResult>> {
  const db = createClient()
  const { data, error } = await db.from('exam_results').upsert(result, { onConflict: 'exam_id,user_id' }).select().single()
  return { data: data as ExamResult | null, error: error?.message ?? null }
}

export async function getExamLeaderboard(examId: string): Promise<ApiResponse<ExamResult[]>> {
  const db = createClient()
  const { data, error } = await db
    .from('exam_results')
    .select('*, profile:profiles(id, full_name, avatar_url)')
    .eq('exam_id', examId)
    .order('score', { ascending: false })
    .order('time_taken_seconds', { ascending: true })
    .limit(50)
  return { data: data as ExamResult[] ?? [], error: error?.message ?? null }
}

export async function createLiveExam(input: CreateExamInput, userId: string): Promise<ApiResponse<LiveExam>> {
  const db = createClient()
  const { data, error } = await db.from('live_exams').insert({ ...input, created_by: userId }).select().single()
  return { data: data as LiveExam | null, error: error?.message ?? null }
}

export async function updateExamStatus(id: string, status: string): Promise<ApiResponse<null>> {
  const db = createClient()
  const { error } = await db.from('live_exams').update({ status }).eq('id', id)
  return { data: null, error: error?.message ?? null }
}

export async function deleteLiveExam(id: string): Promise<ApiResponse<null>> {
  const db = createClient()
  const { error } = await db.from('live_exams').delete().eq('id', id)
  return { data: null, error: error?.message ?? null }
}

// ─── FOCUS WRITING ────────────────────────────────────────────

export async function getFocusWritings(): Promise<ApiResponse<FocusWriting[]>> {
  const db = createClient()
  const { data, error } = await db.from('focus_writings').select('*').eq('is_published', true).order('created_at', { ascending: false })
  return { data: data as FocusWriting[] ?? [], error: error?.message ?? null }
}

export async function createFocusWriting(input: CreateFocusWritingInput, userId: string): Promise<ApiResponse<FocusWriting>> {
  const db = createClient()
  const { data, error } = await db.from('focus_writings').insert({ ...input, tags: input.tags ?? [], created_by: userId }).select().single()
  return { data: data as FocusWriting | null, error: error?.message ?? null }
}

export async function deleteFocusWriting(id: string): Promise<ApiResponse<null>> {
  const db = createClient()
  const { error } = await db.from('focus_writings').delete().eq('id', id)
  return { data: null, error: error?.message ?? null }
}

export async function updateFocusWriting(id: string, updates: Partial<FocusWriting>): Promise<ApiResponse<FocusWriting>> {
  const db = createClient()
  const { data, error } = await db.from('focus_writings').update(updates).eq('id', id).select().single()
  return { data: data as FocusWriting | null, error: error?.message ?? null }
}

// ─── WORD OF DAY ──────────────────────────────────────────────

export async function getWordOfDay(): Promise<ApiResponse<WordOfDay>> {
  const db = createClient()
  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await db.from('word_of_day').select('*, word:words(*)').eq('display_date', today).single()
  return { data: data as WordOfDay | null, error: error?.message ?? null }
}

export async function setWordOfDay(wordId: string, userId: string, date?: string): Promise<ApiResponse<WordOfDay>> {
  const db = createClient()
  const display_date = date ?? new Date().toISOString().split('T')[0]
  const { data, error } = await db
    .from('word_of_day')
    .upsert({ word_id: wordId, display_date, created_by: userId }, { onConflict: 'display_date' })
    .select('*, word:words(*)').single()
  return { data: data as WordOfDay | null, error: error?.message ?? null }
}

// ─── DASHBOARD ────────────────────────────────────────────────

export async function getDashboardStats(userId: string): Promise<ApiResponse<DashboardStats>> {
  const db = createClient()

  const [profileRes, progressRes, categoriesRes, recentWordsRes, upcomingExamsRes, wodRes] =
    await Promise.all([
      db.from('profiles').select('*').eq('id', userId).single(),
      db.from('user_word_progress').select('status').eq('user_id', userId),
      db.from('categories').select('*').eq('is_global', true),
      db.from('words').select('*, categories:word_categories(category:categories(*))').order('created_at', { ascending: false }).limit(5),
      db.from('live_exams').select('*').in('status', ['upcoming', 'live']).order('scheduled_at').limit(3),
      db.from('word_of_day').select('*, word:words(*)').eq('display_date', new Date().toISOString().split('T')[0]).single(),
    ])

  const profile = profileRes.data as Profile | null
  const progress = (progressRes.data ?? []) as { status: string }[]
  const categories = (categoriesRes.data ?? []) as Category[]
  const recentWords = ((recentWordsRes.data ?? []) as any[]).map(w => ({
    ...w,
    categories: (w.categories ?? []).map((wc: any) => wc.category).filter(Boolean),
  })) as Word[]

  const categoryProgress = categories.slice(0, 5).map(cat => {
    const pct = Math.floor(Math.random() * 60 + 10)
    return { category: cat, learned: Math.floor(cat.word_count * pct / 100), total: cat.word_count, percentage: pct }
  })

  return {
    data: {
      words_learned: progress.filter(p => p.status === 'learned').length,
      total_words: 0,
      tests_taken: profile?.tests_taken ?? 0,
      avg_score: profile?.avg_score ?? 0,
      streak_days: profile?.streak_days ?? 0,
      category_progress: categoryProgress,
      recent_words: recentWords,
      upcoming_exams: (upcomingExamsRes.data ?? []) as LiveExam[],
      word_of_day: wodRes.data as WordOfDay | null,
    },
    error: null,
  }
}

// ─── PROFILES / ADMIN ─────────────────────────────────────────

export async function getProfile(userId: string): Promise<ApiResponse<Profile>> {
  const db = createClient()
  const { data, error } = await db.from('profiles').select('*').eq('id', userId).single()
  return { data: data as Profile | null, error: error?.message ?? null }
}

export async function getAllProfiles(): Promise<ApiResponse<Profile[]>> {
  const db = createClient()
  const { data, error } = await db.from('profiles').select('*').order('created_at')
  return { data: data as Profile[] ?? [], error: error?.message ?? null }
}

export async function deleteUser(userId: string): Promise<ApiResponse<null>> {
  const db = createClient()
  const { error } = await db.from('profiles').delete().eq('id', userId)
  return { data: null, error: error?.message ?? null }
}

export async function updateUserRole(userId: string, role: 'user' | 'admin'): Promise<ApiResponse<null>> {
  const db = createClient()
  const { error } = await db.from('profiles').update({ role }).eq('id', userId)
  return { data: null, error: error?.message ?? null }
}

// ─── Example sentence helpers for fill-in-the-blank ──────────

/** Fetch words in a category that are missing example sentences */
export async function getWordsMissingExamples(
  categoryId: string,
  limit = 50
): Promise<ApiResponse<{ id: string; word: string; english_meaning: string; part_of_speech: string | null }[]>> {
  const db = createClient()

  const { data: wids } = await db
    .from('word_categories').select('word_id').eq('category_id', categoryId)
  if (!wids?.length) return { data: [], error: null }

  const ids = wids.map((r: any) => r.word_id)
  const { data, error } = await db
    .from('words')
    .select('id, word, english_meaning, part_of_speech')
    .in('id', ids)
    .or('example.is.null,example.eq.')   // null or empty string
    .limit(limit)

  return { data: data ?? [], error: error?.message ?? null }
}

/** Save a generated example sentence back to the word */
export async function saveWordExample(
  wordId: string,
  example: string
): Promise<ApiResponse<null>> {
  const db = createClient()
  const { error } = await db
    .from('words')
    .update({ example: example.trim() })
    .eq('id', wordId)
  return { data: null, error: error?.message ?? null }
}

/** Bulk save examples: [{ id, example }] */
export async function bulkSaveExamples(
  updates: { id: string; example: string }[]
): Promise<{ saved: number; failed: number }> {
  const db = createClient()
  let saved = 0, failed = 0

  // Run in parallel batches of 5
  const chunks = []
  for (let i = 0; i < updates.length; i += 5) chunks.push(updates.slice(i, i + 5))

  for (const chunk of chunks) {
    await Promise.all(
      chunk.map(async ({ id, example }) => {
        const { error } = await db.from('words').update({ example }).eq('id', id)
        if (error) failed++; else saved++
      })
    )
  }
  return { saved, failed }
}

/** Count how many words in a category have examples (for fill-blank eligibility) */
export async function countWordsWithExamples(categoryId: string): Promise<number> {
  const db = createClient()
  const { data: wids } = await db
    .from('word_categories').select('word_id').eq('category_id', categoryId)
  if (!wids?.length) return 0

  const ids = wids.map((r: any) => r.word_id)
  const { count } = await db
    .from('words')
    .select('id', { count: 'exact', head: true })
    .in('id', ids)
    .not('example', 'is', null)
    .not('example', 'eq', '')

  return count ?? 0
}
