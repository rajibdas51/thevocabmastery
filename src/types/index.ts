// ============================================================
// Thevocabmastery - Central Type Definitions
// These mirror your Supabase schema 1:1 for easy migration
// ============================================================

export type UserRole = 'user' | 'admin'
export type WordStatus = 'new' | 'learning' | 'learned'
export type ExamStatus = 'upcoming' | 'live' | 'completed' | 'cancelled'
export type Difficulty = 'easy' | 'medium' | 'hard'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: UserRole
  words_learned: number
  tests_taken: number
  avg_score: number
  streak_days: number
  last_active_at: string | null
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  name: string
  description: string | null
  color: string
  is_global: boolean
  created_by: string | null
  word_count: number
  created_at: string
  updated_at: string
}

export interface Word {
  id: string
  word: string
  bangla_meaning: string | null
  english_meaning: string
  synonyms: string[]
  antonyms: string[]
  example: string | null
  is_global: boolean
  created_by: string | null
  created_at: string
  updated_at: string
  // Joined fields
  categories?: Category[]
  user_progress?: UserWordProgress | null
}

export interface WordCategory {
  word_id: string
  category_id: string
}

export interface UserWordProgress {
  id: string
  user_id: string
  word_id: string
  status: WordStatus
  review_count: number
  last_reviewed_at: string | null
  created_at: string
}

export interface QuizAttempt {
  id: string
  user_id: string
  category_id: string | null
  score: number
  total_questions: number
  percentage: number
  time_taken_seconds: number | null
  answers: QuizAnswer[] | null
  created_at: string
}

export interface QuizAnswer {
  word_id: string
  word: string
  selected: string
  correct: string
  is_correct: boolean
}

export interface QuizQuestion {
  word_id: string
  word: string
  bangla_meaning: string | null
  correct_answer: string
  options: string[]
}

export interface LiveExam {
  id: string
  title: string
  description: string | null
  category_id: string | null
  scheduled_at: string
  duration_minutes: number
  question_count: number
  status: ExamStatus
  questions: ExamQuestion[] | null
  created_by: string | null
  created_at: string
  updated_at: string
  // Joined
  category?: Category | null
  registration?: ExamRegistration | null
  result?: ExamResult | null
  registrant_count?: number
}

export interface ExamQuestion {
  id: string
  word_id: string
  word: string
  options: ExamOption[]
}

export interface ExamOption {
  text: string
  is_correct: boolean
}

export interface ExamRegistration {
  exam_id: string
  user_id: string
  registered_at: string
}

export interface ExamResult {
  id: string
  exam_id: string
  user_id: string
  score: number
  total_questions: number
  percentage: number
  time_taken_seconds: number | null
  answers: QuizAnswer[] | null
  rank: number | null
  submitted_at: string
  // Joined
  profile?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>
}

export interface FocusWriting {
  id: string
  title: string
  category: string
  content: string
  tags: string[]
  is_published: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface GovtQuestion {
  id: string
  question: string
  options: GovtQuestionOption[]
  explanation: string | null
  exam_name: string
  exam_year: number | null
  subject: string | null
  topic: string | null
  difficulty: Difficulty | null
  created_by: string | null
  created_at: string
}

export interface GovtQuestionOption {
  label: string
  text: string
  is_correct: boolean
}

export interface WordOfDay {
  id: string
  word_id: string
  display_date: string
  created_by: string | null
  created_at: string
  // Joined
  word?: Word
}

// ============================================================
// API Response types (abstract layer for easy migration)
// ============================================================
export interface ApiResponse<T> {
  data: T | null
  error: string | null
}

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  pageSize: number
  totalPages: number
  error: string | null
}

// ============================================================
// Form / Input types
// ============================================================
export interface CreateWordInput {
  word: string
  bangla_meaning?: string
  english_meaning: string
  synonyms: string[]
  antonyms: string[]
  example?: string
  category_ids: string[]
  new_category_name?: string
  new_category_color?: string
}

export interface CreateCategoryInput {
  name: string
  description?: string
  color: string
  is_global?: boolean
}

export interface CreateExamInput {
  title: string
  description?: string
  category_id?: string
  scheduled_at: string
  duration_minutes: number
  question_count: number
}

export interface CreateFocusWritingInput {
  title: string
  category: string
  content: string
  tags?: string[]
}

export interface QuizConfig {
  category_id: string
  question_count: number
  mode: 'eng_to_meaning' | 'eng_to_bangla' | 'bangla_to_eng'
}

export interface FlashcardConfig {
  category_id: string
  mode: 'eng_to_bangla' | 'bangla_to_eng' | 'eng_to_meaning'
}

// Dashboard stats
export interface DashboardStats {
  words_learned: number
  total_words: number
  tests_taken: number
  avg_score: number
  streak_days: number
  category_progress: CategoryProgress[]
  recent_words: Word[]
  upcoming_exams: LiveExam[]
  word_of_day: WordOfDay | null
}

export interface CategoryProgress {
  category: Category
  learned: number
  total: number
  percentage: number
}