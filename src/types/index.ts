export type UserRole = 'user' | 'admin'
export type WordStatus = 'new' | 'learning' | 'learned'
export type ExamStatus = 'upcoming' | 'live' | 'completed' | 'cancelled'
export type Difficulty = 'easy' | 'medium' | 'hard'
export type PartOfSpeech =
  | 'noun' | 'verb' | 'adjective' | 'adverb'
  | 'preposition' | 'conjunction' | 'interjection' | 'pronoun'

// meaning_en: show English word → pick correct English meaning
// meaning_bn: show English word → pick correct Bangla meaning
// synonym / antonym: pick the right synonym/antonym
// fill_blank: fill in the blank sentence
// mixed: random mix of all types
export type QuizType = 'meaning_en' | 'meaning_bn' | 'synonym' | 'antonym' | 'fill_blank' | 'mixed'

export interface Profile {
  id: string; email: string; full_name: string | null; avatar_url: string | null
  role: UserRole; words_learned: number; tests_taken: number; avg_score: number
  streak_days: number; last_active_at: string | null; created_at: string; updated_at: string
}

export interface Category {
  id: string; name: string; description: string | null; color: string
  is_global: boolean; created_by: string | null; word_count: number
  created_at: string; updated_at: string
}

export interface Word {
  id: string; word: string; bangla_meaning: string | null; english_meaning: string
  synonyms: string[]; antonyms: string[]; example: string | null
  part_of_speech: PartOfSpeech | null; pronunciation: string | null
  is_global: boolean; created_by: string | null; created_at: string; updated_at: string
  categories?: Category[]; user_progress?: UserWordProgress | null
}

export interface UserWordProgress {
  id: string; user_id: string; word_id: string; status: WordStatus
  review_count: number; last_reviewed_at: string | null; created_at: string
}

export interface QuizAttempt {
  id: string; user_id: string; category_id: string | null; quiz_type: QuizType
  score: number; total_questions: number; percentage: number
  time_taken_seconds: number | null; answers: QuizAnswer[] | null; created_at: string
}

export interface QuizAnswer {
  word_id: string; word: string; selected: string; correct: string; is_correct: boolean
}

export interface QuizQuestion {
  word_id: string
  word: string
  bangla_meaning: string | null
  correct_answer: string
  options: string[]
  question_label: string   // the prompt shown above the word
  quiz_type: QuizType
  sentence?: string        // for fill_blank: the sentence with ___ placeholder
}

export interface LiveExam {
  id: string; title: string; description: string | null; category_id: string | null
  scheduled_at: string; duration_minutes: number; question_count: number
  status: ExamStatus; questions: ExamQuestion[] | null; created_by: string | null
  created_at: string; updated_at: string
  category?: Category | null; registration?: ExamRegistration | null
  result?: ExamResult | null; registrant_count?: number
}

export interface ExamQuestion {
  id: string; word_id: string; word: string; options: ExamOption[]
}
export interface ExamOption { text: string; is_correct: boolean }

export interface ExamRegistration {
  exam_id: string; user_id: string; registered_at: string
}

export interface ExamResult {
  id: string; exam_id: string; user_id: string; score: number
  total_questions: number; percentage: number; time_taken_seconds: number | null
  answers: QuizAnswer[] | null; rank: number | null; submitted_at: string
  profile?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>
}

export interface FocusWriting {
  id: string; title: string; category: string; content: string; tags: string[]
  is_published: boolean; created_by: string | null; created_at: string; updated_at: string
}

export interface WordOfDay {
  id: string; word_id: string; display_date: string
  created_by: string | null; created_at: string; word?: Word
}

export interface ApiResponse<T> { data: T | null; error: string | null }

export interface PaginatedResponse<T> {
  data: T[]; count: number; page: number; pageSize: number; totalPages: number; error: string | null
}

export interface CreateWordInput {
  word: string; bangla_meaning?: string; english_meaning: string
  synonyms: string[]; antonyms: string[]; example?: string
  part_of_speech?: PartOfSpeech; pronunciation?: string
  category_ids: string[]; new_category_name?: string; new_category_color?: string
}

export interface CreateFocusWritingInput {
  title: string; category: string; content: string; tags?: string[]
}

export interface CreateExamInput {
  title: string; description?: string; category_id?: string
  scheduled_at: string; duration_minutes: number; question_count: number
}

export interface DashboardStats {
  words_learned: number; total_words: number; tests_taken: number
  avg_score: number; streak_days: number; category_progress: CategoryProgress[]
  recent_words: Word[]; upcoming_exams: LiveExam[]; word_of_day: WordOfDay | null
}

export interface CategoryProgress {
  category: Category; learned: number; total: number; percentage: number
}

export const POS_LABELS: Record<PartOfSpeech, { short: string; color: string }> = {
  noun:         { short: 'n.',    color: '#60a5fa' },
  verb:         { short: 'v.',    color: '#34d399' },
  adjective:    { short: 'adj.',  color: '#a78bfa' },
  adverb:       { short: 'adv.',  color: '#fbbf24' },
  preposition:  { short: 'prep.', color: '#f87171' },
  conjunction:  { short: 'conj.', color: '#fb923c' },
  interjection: { short: 'int.',  color: '#e879f9' },
  pronoun:      { short: 'pron.', color: '#22d3ee' },
}

export interface Editorial {
  id: string
  title: string
  source: string        // e.g. 'The Daily Star', 'Prothom Alo'
  content: string       // HTML from rich text editor
  published_date: string // 'YYYY-MM-DD'
  tags: string[]
  is_published: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface CreateEditorialInput {
  title: string
  source: string
  content: string
  published_date: string
  tags?: string[]
}
