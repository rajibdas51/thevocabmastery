-- ============================================================
-- VocabMaster - Complete Database Schema
-- Run this in Supabase SQL Editor (https://app.supabase.com)
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for fuzzy search

-- ============================================================
-- USERS (extends Supabase auth.users)
-- ============================================================
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  words_learned INTEGER NOT NULL DEFAULT 0,
  tests_taken INTEGER NOT NULL DEFAULT 0,
  avg_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  streak_days INTEGER NOT NULL DEFAULT 0,
  last_active_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CATEGORIES / LISTS
-- ============================================================
CREATE TABLE public.categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#6366f1',
  is_global BOOLEAN NOT NULL DEFAULT FALSE, -- global = visible to all users
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  word_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- WORDS
-- ============================================================
CREATE TABLE public.words (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  word TEXT NOT NULL,
  bangla_meaning TEXT,
  english_meaning TEXT NOT NULL,
  synonyms TEXT[] NOT NULL DEFAULT '{}',
  antonyms TEXT[] NOT NULL DEFAULT '{}',
  example TEXT,
  is_global BOOLEAN NOT NULL DEFAULT FALSE, -- false = private to created_by user
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Full text search index
CREATE INDEX words_search_idx ON public.words USING GIN (
  to_tsvector('english', coalesce(word, '') || ' ' || coalesce(english_meaning, '') || ' ' || coalesce(bangla_meaning, ''))
);
CREATE INDEX words_trgm_idx ON public.words USING GIN (word gin_trgm_ops);

-- ============================================================
-- WORD <-> CATEGORY junction
-- ============================================================
CREATE TABLE public.word_categories (
  word_id UUID REFERENCES public.words(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  PRIMARY KEY (word_id, category_id)
);

-- ============================================================
-- USER WORD PROGRESS (per-user learning state)
-- ============================================================
CREATE TABLE public.user_word_progress (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  word_id UUID REFERENCES public.words(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'learning', 'learned')),
  review_count INTEGER NOT NULL DEFAULT 0,
  last_reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, word_id)
);

-- ============================================================
-- QUIZ ATTEMPTS
-- ============================================================
CREATE TABLE public.quiz_attempts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  score INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL,
  percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  time_taken_seconds INTEGER,
  answers JSONB, -- [{word_id, selected, correct, is_correct}]
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- LIVE MCQ EXAMS
-- ============================================================
CREATE TABLE public.live_exams (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  question_count INTEGER NOT NULL DEFAULT 20,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'live', 'completed', 'cancelled')),
  questions JSONB, -- [{id, word_id, word, options:[{text,is_correct}]}]
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- EXAM REGISTRATIONS
-- ============================================================
CREATE TABLE public.exam_registrations (
  exam_id UUID REFERENCES public.live_exams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (exam_id, user_id)
);

-- ============================================================
-- EXAM RESULTS (leaderboard data)
-- ============================================================
CREATE TABLE public.exam_results (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  exam_id UUID REFERENCES public.live_exams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL,
  percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  time_taken_seconds INTEGER,
  answers JSONB,
  rank INTEGER, -- computed after exam ends
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (exam_id, user_id)
);

-- ============================================================
-- FOCUS WRITING TOPICS
-- ============================================================
CREATE TABLE public.focus_writings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  content TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- GOVT JOB QUESTIONS (BCS, Bank, etc.)
-- ============================================================
CREATE TABLE public.govt_questions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  question TEXT NOT NULL,
  options JSONB NOT NULL, -- [{label:"A", text:"...", is_correct: bool}]
  explanation TEXT,
  exam_name TEXT NOT NULL, -- e.g. "BCS 43rd", "Sonali Bank 2023"
  exam_year INTEGER,
  subject TEXT, -- "English", "Math", "General Knowledge"
  topic TEXT,   -- "Vocabulary", "Grammar", "Comprehension"
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- WORD OF THE DAY (admin curates)
-- ============================================================
CREATE TABLE public.word_of_day (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  word_id UUID REFERENCES public.words(id) ON DELETE CASCADE NOT NULL,
  display_date DATE NOT NULL UNIQUE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    CASE WHEN NEW.email = current_setting('app.admin_email', true) THEN 'admin' ELSE 'user' END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update category word_count automatically
CREATE OR REPLACE FUNCTION update_category_word_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.categories SET word_count = word_count + 1 WHERE id = NEW.category_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.categories SET word_count = GREATEST(word_count - 1, 0) WHERE id = OLD.category_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER word_categories_count_trigger
  AFTER INSERT OR DELETE ON public.word_categories
  FOR EACH ROW EXECUTE FUNCTION update_category_word_count();

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_words_updated_at BEFORE UPDATE ON public.words FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_live_exams_updated_at BEFORE UPDATE ON public.live_exams FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_focus_writings_updated_at BEFORE UPDATE ON public.focus_writings FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.words ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.word_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_word_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.focus_writings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.govt_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.word_of_day ENABLE ROW LEVEL SECURITY;

-- Helper: check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- PROFILES
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admin can update any profile" ON public.profiles FOR UPDATE USING (is_admin());
CREATE POLICY "Admin can delete users" ON public.profiles FOR DELETE USING (is_admin());

-- CATEGORIES
CREATE POLICY "Anyone can view global categories" ON public.categories FOR SELECT USING (is_global = true OR created_by = auth.uid() OR is_admin());
CREATE POLICY "Authenticated users can create categories" ON public.categories FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Owner or admin can update categories" ON public.categories FOR UPDATE USING (created_by = auth.uid() OR is_admin());
CREATE POLICY "Owner or admin can delete categories" ON public.categories FOR DELETE USING (created_by = auth.uid() OR is_admin());

-- WORDS
CREATE POLICY "Anyone can view global words" ON public.words FOR SELECT USING (is_global = true OR created_by = auth.uid() OR is_admin());
CREATE POLICY "Authenticated users can create words" ON public.words FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Owner or admin can update words" ON public.words FOR UPDATE USING (created_by = auth.uid() OR is_admin());
CREATE POLICY "Owner or admin can delete words" ON public.words FOR DELETE USING (created_by = auth.uid() OR is_admin());

-- WORD CATEGORIES
CREATE POLICY "Anyone can view word_categories" ON public.word_categories FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert word_categories" ON public.word_categories FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admin can delete word_categories" ON public.word_categories FOR DELETE USING (is_admin());

-- USER WORD PROGRESS
CREATE POLICY "Users can manage own progress" ON public.user_word_progress FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Admin can view all progress" ON public.user_word_progress FOR SELECT USING (is_admin());

-- QUIZ ATTEMPTS
CREATE POLICY "Users can manage own quiz attempts" ON public.quiz_attempts FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Admin can view all quiz attempts" ON public.quiz_attempts FOR SELECT USING (is_admin());

-- LIVE EXAMS
CREATE POLICY "Anyone can view live exams" ON public.live_exams FOR SELECT USING (true);
CREATE POLICY "Admin can manage live exams" ON public.live_exams FOR ALL USING (is_admin());

-- EXAM REGISTRATIONS
CREATE POLICY "Users can manage own registrations" ON public.exam_registrations FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Admin can view all registrations" ON public.exam_registrations FOR SELECT USING (is_admin());

-- EXAM RESULTS
CREATE POLICY "Users can insert own results" ON public.exam_results FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Anyone can view exam results (leaderboard)" ON public.exam_results FOR SELECT USING (true);
CREATE POLICY "Admin can manage exam results" ON public.exam_results FOR ALL USING (is_admin());

-- FOCUS WRITINGS
CREATE POLICY "Anyone can view published focus writings" ON public.focus_writings FOR SELECT USING (is_published = true OR is_admin());
CREATE POLICY "Admin can manage focus writings" ON public.focus_writings FOR ALL USING (is_admin());

-- GOVT QUESTIONS
CREATE POLICY "Anyone can view govt questions" ON public.govt_questions FOR SELECT USING (true);
CREATE POLICY "Admin can manage govt questions" ON public.govt_questions FOR ALL USING (is_admin());

-- WORD OF DAY
CREATE POLICY "Anyone can view word of day" ON public.word_of_day FOR SELECT USING (true);
CREATE POLICY "Admin can manage word of day" ON public.word_of_day FOR ALL USING (is_admin());

-- ============================================================
-- SEED DATA - Default Categories
-- ============================================================
-- NOTE: Run this AFTER your first admin user has been created
-- Replace 'YOUR-ADMIN-USER-ID' with actual UUID from auth.users

-- INSERT INTO public.categories (name, description, color, is_global, created_by) VALUES
-- ('Barron''s 333 Words', 'Essential GRE vocabulary from Barron''s', '#6366f1', true, 'YOUR-ADMIN-USER-ID'),
-- ('Word Smart I', 'Princeton Review Word Smart vocabulary', '#f59e0b', true, 'YOUR-ADMIN-USER-ID'),
-- ('Word Smart II', 'Advanced Princeton Review vocabulary', '#10b981', true, 'YOUR-ADMIN-USER-ID'),
-- ('Bank Vocabulary', 'Essential words for bank job preparation', '#ef4444', true, 'YOUR-ADMIN-USER-ID'),
-- ('BCS Preparation', 'Bangladesh Civil Service vocabulary', '#8b5cf6', true, 'YOUR-ADMIN-USER-ID'),
-- ('GRE Vocabulary', 'Graduate Record Examination word list', '#06b6d4', true, 'YOUR-ADMIN-USER-ID');