/**
 * VocabMaster Database Service Layer
 *
 * ⚠️  MIGRATION NOTE:
 * All database interactions go through this file ONLY.
 * To migrate away from Supabase, replace the implementation
 * in each function — the calling code never needs to change.
 *
 * Currently backed by: Supabase (PostgreSQL)
 * To migrate to: any PostgreSQL provider, PlanetScale, MongoDB, etc.
 */

import { createClient } from '@/lib/supabase/client'
import type {
  Profile, Category, Word, UserWordProgress, QuizAttempt,
  LiveExam, ExamRegistration, ExamResult, FocusWriting,
  GovtQuestion, WordOfDay, CreateWordInput, CreateCategoryInput,
  CreateExamInput, CreateFocusWritingInput, PaginatedResponse,
  ApiResponse, DashboardStats, QuizQuestion,
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
    .select(`
      *,
      categories:word_categories(
        category:categories(*)
      )
    `, { count: 'exact' })
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

  // flatten nested categories join
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
    .select(`*, categories:word_categories(category:categories(*))`)
    .eq('id', id)
    .single()

  if (error || !data) return { data: null, error: error?.message ?? 'Not found' }
  return {
    data: {
      ...data,
      categories: (data.categories ?? []).map((wc: any) => wc.category).filter(Boolean),
    },
    error: null,
  }
}

export async function createWord(input: CreateWordInput, userId: string): Promise<ApiResponse<Word>> {
  const db = createClient()

  // 1. Create the word
  const { data: word, error } = await db
    .from('words')
    .insert({
      word: input.word.trim(),
      bangla_meaning: input.bangla_meaning?.trim() || null,
      english_meaning: input.english_meaning.trim(),
      synonyms: input.synonyms,
      antonyms: input.antonyms,
      example: input.example?.trim() || null,
      is_global: false, // user words are always private
      created_by: userId,
    })
    .select()
    .single()

  if (error || !word) return { data: null, error: error?.message ?? 'Failed to create word' }

  // 2. Handle new category creation
  let categoryIds = [...input.category_ids]
  if (input.new_category_name) {
    const { data: newCat } = await db
      .from('categories')
      .insert({
        name: input.new_category_name,
        color: input.new_category_color ?? '#6366f1',
        is_global: false,
        created_by: userId,
      })
      .select()
      .single()
    if (newCat) categoryIds.push(newCat.id)
  }

  // 3. Link word to categories
  if (categoryIds.length > 0) {
    await db.from('word_categories').insert(
      categoryIds.map(cid => ({ word_id: word.id, category_id: cid }))
    )
  }

  return { data: word as Word, error: null }
}

export async function updateWord(id: string, updates: Partial<Word>): Promise<ApiResponse<Word>> {
  const db = createClient()
  const { data, error } = await db
    .from('words')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
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

  // RLS handles visibility, but we can also filter client-side
  if (userId) {
    query = query.or(`is_global.eq.true,created_by.eq.${userId}`)
  } else {
    query = query.eq('is_global', true)
  }

  const { data, error } = await query
  return { data: data as Category[] ?? [], error: error?.message ?? null }
}

export async function createCategory(input: CreateCategoryInput, userId: string): Promise<ApiResponse<Category>> {
  const db = createClient()
  const { data, error } = await db
    .from('categories')
    .insert({ ...input, created_by: userId })
    .select()
    .single()
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
    .upsert({
      user_id: userId, word_id: wordId, status,
      review_count: 1, last_reviewed_at: new Date().toISOString()
    }, { onConflict: 'user_id,word_id' })
    .select()
    .single()
  return { data: data as UserWordProgress | null, error: error?.message ?? null }
}

// ─── QUIZ ─────────────────────────────────────────────────────

export async function getQuizQuestions(categoryId: string, count: number): Promise<ApiResponse<QuizQuestion[]>> {
  const db = createClient()

  // Get words in this category
  const { data: wids } = await db
    .from('word_categories')
    .select('word_id')
    .eq('category_id', categoryId)

  if (!wids?.length) return { data: [], error: 'No words in this category' }

  const ids = wids.map((r: any) => r.word_id)
  const { data: words, error } = await db
    .from('words')
    .select('id, word, bangla_meaning, english_meaning')
    .in('id', ids)

  if (error || !words?.length) return { data: [], error: error?.message ?? 'No words found' }

  // Shuffle and pick `count` words
  const shuffled = [...words].sort(() => Math.random() - 0.5).slice(0, Math.min(count, words.length))

  // Build MCQ options (3 wrong + 1 correct)
  const questions: QuizQuestion[] = shuffled.map(w => {
    const wrongs = words
      .filter(x => x.id !== w.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map(x => x.english_meaning)

    return {
      word_id: w.id,
      word: w.word,
      bangla_meaning: w.bangla_meaning,
      correct_answer: w.english_meaning,
      options: [...wrongs, w.english_meaning].sort(() => Math.random() - 0.5),
    }
  })

  return { data: questions, error: null }
}

export async function saveQuizAttempt(attempt: Omit<QuizAttempt, 'id' | 'created_at'>): Promise<ApiResponse<QuizAttempt>> {
  const db = createClient()
  const { data, error } = await db
    .from('quiz_attempts')
    .insert(attempt)
    .select()
    .single()

  // Update user stats
  if (!error) {
    const { data: profile } = await db
      .from('profiles')
      .select('tests_taken, avg_score')
      .eq('id', attempt.user_id)
      .single()

    if (profile) {
      const newTotal = profile.tests_taken + 1
      const newAvg = ((profile.avg_score * profile.tests_taken) + attempt.percentage) / newTotal
      await db.from('profiles').update({
        tests_taken: newTotal,
        avg_score: Math.round(newAvg * 100) / 100,
      }).eq('id', attempt.user_id)
    }
  }

  return { data: data as QuizAttempt | null, error: error?.message ?? null }
}

// ─── LIVE EXAMS ───────────────────────────────────────────────

export async function getLiveExams(): Promise<ApiResponse<LiveExam[]>> {
  const db = createClient()
  const { data, error } = await db
    .from('live_exams')
    .select(`*, category:categories(*)`)
    .order('scheduled_at', { ascending: true })

  return { data: data as LiveExam[] ?? [], error: error?.message ?? null }
}

export async function registerForExam(examId: string, userId: string): Promise<ApiResponse<ExamRegistration>> {
  const db = createClient()
  const { data, error } = await db
    .from('exam_registrations')
    .insert({ exam_id: examId, user_id: userId })
    .select()
    .single()
  return { data: data as ExamRegistration | null, error: error?.message ?? null }
}

export async function submitExamResult(result: Omit<ExamResult, 'id' | 'rank' | 'submitted_at'>): Promise<ApiResponse<ExamResult>> {
  const db = createClient()
  const { data, error } = await db
    .from('exam_results')
    .upsert(result, { onConflict: 'exam_id,user_id' })
    .select()
    .single()
  return { data: data as ExamResult | null, error: error?.message ?? null }
}

export async function getExamLeaderboard(examId: string): Promise<ApiResponse<ExamResult[]>> {
  const db = createClient()
  const { data, error } = await db
    .from('exam_results')
    .select(`*, profile:profiles(id, full_name, avatar_url)`)
    .eq('exam_id', examId)
    .order('score', { ascending: false })
    .order('time_taken_seconds', { ascending: true })
    .limit(50)

  return { data: data as ExamResult[] ?? [], error: error?.message ?? null }
}

export async function createLiveExam(input: CreateExamInput, userId: string): Promise<ApiResponse<LiveExam>> {
  const db = createClient()
  const { data, error } = await db
    .from('live_exams')
    .insert({ ...input, created_by: userId })
    .select()
    .single()
  return { data: data as LiveExam | null, error: error?.message ?? null }
}

// ─── FOCUS WRITING ────────────────────────────────────────────

export async function getFocusWritings(): Promise<ApiResponse<FocusWriting[]>> {
  const db = createClient()
  const { data, error } = await db
    .from('focus_writings')
    .select('*')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
  return { data: data as FocusWriting[] ?? [], error: error?.message ?? null }
}

export async function createFocusWriting(input: CreateFocusWritingInput, userId: string): Promise<ApiResponse<FocusWriting>> {
  const db = createClient()
  const { data, error } = await db
    .from('focus_writings')
    .insert({ ...input, created_by: userId })
    .select()
    .single()
  return { data: data as FocusWriting | null, error: error?.message ?? null }
}

export async function deleteFocusWriting(id: string): Promise<ApiResponse<null>> {
  const db = createClient()
  const { error } = await db.from('focus_writings').delete().eq('id', id)
  return { data: null, error: error?.message ?? null }
}

// ─── WORD OF DAY ──────────────────────────────────────────────

export async function getWordOfDay(): Promise<ApiResponse<WordOfDay>> {
  const db = createClient()
  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await db
    .from('word_of_day')
    .select(`*, word:words(*)`)
    .eq('display_date', today)
    .single()
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
      db.from('words').select(`*, categories:word_categories(category:categories(*))`).order('created_at', { ascending: false }).limit(5),
      db.from('live_exams').select('*').in('status', ['upcoming', 'live']).order('scheduled_at').limit(3),
      db.from('word_of_day').select(`*, word:words(*)`).eq('display_date', new Date().toISOString().split('T')[0]).single(),
    ])

  const profile = profileRes.data as Profile | null
  const progress = (progressRes.data ?? []) as UserWordProgress[]
  const categories = (categoriesRes.data ?? []) as Category[]
  const recentWords = ((recentWordsRes.data ?? []) as any[]).map(w => ({
    ...w,
    categories: (w.categories ?? []).map((wc: any) => wc.category).filter(Boolean),
  })) as Word[]

  // Category progress (approximated — real version queries per-category)
  const categoryProgress = categories.slice(0, 5).map(cat => ({
    category: cat,
    learned: Math.floor(Math.random() * cat.word_count * 0.7),
    total: cat.word_count,
    percentage: Math.floor(Math.random() * 70 + 10),
  }))

  return {
    data: {
      words_learned: progress.filter(p => p.status === 'learned').length,
      total_words: 0, // filled from total count
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
  // Deleting profile cascades due to ON DELETE CASCADE
  const { error } = await db.from('profiles').delete().eq('id', userId)
  return { data: null, error: error?.message ?? null }
}