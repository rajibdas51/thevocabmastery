-- ============================================================
-- VocabMaster - Complete Database Schema v2
-- Run this in Supabase SQL Editor
-- Dashboard → SQL Editor → New Query → Paste → Run
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ── PROFILES ──────────────────────────────────────────────────
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

-- ── CATEGORIES ────────────────────────────────────────────────
CREATE TABLE public.categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#6366f1',
  is_global BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  word_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── WORDS ─────────────────────────────────────────────────────
CREATE TABLE public.words (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  word TEXT NOT NULL,
  bangla_meaning TEXT,
  english_meaning TEXT NOT NULL,
  synonyms TEXT[] NOT NULL DEFAULT '{}',
  antonyms TEXT[] NOT NULL DEFAULT '{}',
  example TEXT,
  part_of_speech TEXT CHECK (part_of_speech IN ('noun','verb','adjective','adverb','preposition','conjunction','interjection','pronoun')),
  pronunciation TEXT,
  is_global BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX words_search_idx ON public.words USING GIN (
  to_tsvector('english', coalesce(word,'') || ' ' || coalesce(english_meaning,'') || ' ' || coalesce(bangla_meaning,''))
);
CREATE INDEX words_trgm_idx ON public.words USING GIN (word gin_trgm_ops);

-- ── WORD CATEGORIES ───────────────────────────────────────────
CREATE TABLE public.word_categories (
  word_id UUID REFERENCES public.words(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  PRIMARY KEY (word_id, category_id)
);

-- ── USER PROGRESS ─────────────────────────────────────────────
CREATE TABLE public.user_word_progress (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  word_id UUID REFERENCES public.words(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','learning','learned')),
  review_count INTEGER NOT NULL DEFAULT 0,
  last_reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, word_id)
);

-- ── QUIZ ATTEMPTS ─────────────────────────────────────────────
CREATE TABLE public.quiz_attempts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  quiz_type TEXT NOT NULL DEFAULT 'meaning' CHECK (quiz_type IN ('meaning','synonym','antonym','mixed')),
  score INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL,
  percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  time_taken_seconds INTEGER,
  answers JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── LIVE EXAMS ────────────────────────────────────────────────
CREATE TABLE public.live_exams (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  question_count INTEGER NOT NULL DEFAULT 20,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming','live','completed','cancelled')),
  questions JSONB,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── EXAM REGISTRATIONS ────────────────────────────────────────
CREATE TABLE public.exam_registrations (
  exam_id UUID REFERENCES public.live_exams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (exam_id, user_id)
);

-- ── EXAM RESULTS ──────────────────────────────────────────────
CREATE TABLE public.exam_results (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  exam_id UUID REFERENCES public.live_exams(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL,
  percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  time_taken_seconds INTEGER,
  answers JSONB,
  rank INTEGER,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (exam_id, user_id)
);

-- ── FOCUS WRITINGS ────────────────────────────────────────────
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

-- ── WORD OF THE DAY ───────────────────────────────────────────
CREATE TABLE public.word_of_day (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  word_id UUID REFERENCES public.words(id) ON DELETE CASCADE NOT NULL,
  display_date DATE NOT NULL UNIQUE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── GOVT JOB QUESTIONS ────────────────────────────────────────
CREATE TABLE public.govt_questions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  explanation TEXT,
  exam_name TEXT NOT NULL,
  exam_year INTEGER,
  subject TEXT,
  topic TEXT,
  difficulty TEXT CHECK (difficulty IN ('easy','medium','hard')),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── TRIGGERS ──────────────────────────────────────────────────

-- Auto-create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'user'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update category word_count on insert/delete
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

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER t_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER t_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER t_words_updated_at BEFORE UPDATE ON public.words FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER t_live_exams_updated_at BEFORE UPDATE ON public.live_exams FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER t_focus_writings_updated_at BEFORE UPDATE ON public.focus_writings FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── ROW LEVEL SECURITY ────────────────────────────────────────

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
ALTER TABLE public.word_of_day ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.govt_questions ENABLE ROW LEVEL SECURITY;

-- Helper function
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- PROFILES
CREATE POLICY "View all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admin update any" ON public.profiles FOR UPDATE USING (is_admin());
CREATE POLICY "Admin delete users" ON public.profiles FOR DELETE USING (is_admin());

-- CATEGORIES
CREATE POLICY "View accessible categories" ON public.categories FOR SELECT USING (is_global = true OR created_by = auth.uid() OR is_admin());
CREATE POLICY "Auth users create categories" ON public.categories FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Owner or admin update" ON public.categories FOR UPDATE USING (created_by = auth.uid() OR is_admin());
CREATE POLICY "Owner or admin delete" ON public.categories FOR DELETE USING (created_by = auth.uid() OR is_admin());

-- WORDS
CREATE POLICY "View accessible words" ON public.words FOR SELECT USING (is_global = true OR created_by = auth.uid() OR is_admin());
CREATE POLICY "Auth users create words" ON public.words FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Owner or admin update words" ON public.words FOR UPDATE USING (created_by = auth.uid() OR is_admin());
CREATE POLICY "Owner or admin delete words" ON public.words FOR DELETE USING (created_by = auth.uid() OR is_admin());

-- WORD CATEGORIES
CREATE POLICY "View word_categories" ON public.word_categories FOR SELECT USING (true);
CREATE POLICY "Auth insert word_categories" ON public.word_categories FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admin delete word_categories" ON public.word_categories FOR DELETE USING (is_admin());

-- USER PROGRESS
CREATE POLICY "Own progress only" ON public.user_word_progress FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Admin view progress" ON public.user_word_progress FOR SELECT USING (is_admin());

-- QUIZ ATTEMPTS
CREATE POLICY "Own quiz attempts" ON public.quiz_attempts FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Admin view attempts" ON public.quiz_attempts FOR SELECT USING (is_admin());

-- LIVE EXAMS
CREATE POLICY "View all exams" ON public.live_exams FOR SELECT USING (true);
CREATE POLICY "Admin manage exams" ON public.live_exams FOR ALL USING (is_admin());

-- EXAM REGISTRATIONS
CREATE POLICY "Own registrations" ON public.exam_registrations FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Admin view registrations" ON public.exam_registrations FOR SELECT USING (is_admin());

-- EXAM RESULTS
CREATE POLICY "Insert own result" ON public.exam_results FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Anyone view results (leaderboard)" ON public.exam_results FOR SELECT USING (true);
CREATE POLICY "Admin manage results" ON public.exam_results FOR ALL USING (is_admin());

-- FOCUS WRITINGS
CREATE POLICY "View published writings" ON public.focus_writings FOR SELECT USING (is_published = true OR is_admin());
CREATE POLICY "Admin manage writings" ON public.focus_writings FOR ALL USING (is_admin());

-- WORD OF DAY
CREATE POLICY "View word of day" ON public.word_of_day FOR SELECT USING (true);
CREATE POLICY "Admin manage wotd" ON public.word_of_day FOR ALL USING (is_admin());

-- GOVT QUESTIONS
CREATE POLICY "View govt questions" ON public.govt_questions FOR SELECT USING (true);
CREATE POLICY "Admin manage govt questions" ON public.govt_questions FOR ALL USING (is_admin());

-- ── SEED DATA ─────────────────────────────────────────────────
-- Run AFTER your first admin account is created.
-- Step 1: Sign up on your app
-- Step 2: In Supabase → Table Editor → profiles → find your row → change role to 'admin'
-- Step 3: Uncomment and run these INSERT statements (replace YOUR-USER-ID):

/*
INSERT INTO public.categories (name, description, color, is_global, created_by) VALUES
('Barron''s 333 Words', 'Essential words from Barron''s GRE list', '#6366f1', true, 'YOUR-USER-ID'),
('Word Smart I', 'Princeton Review Word Smart vocabulary', '#f59e0b', true, 'YOUR-USER-ID'),
('Word Smart II', 'Advanced Princeton Review vocabulary', '#10b981', true, 'YOUR-USER-ID'),
('Bank Vocabulary', 'Essential words for bank job exams', '#ef4444', true, 'YOUR-USER-ID'),
('BCS Preparation', 'Bangladesh Civil Service vocabulary', '#8b5cf6', true, 'YOUR-USER-ID'),
('GRE Vocabulary', 'Graduate Record Examination word list', '#06b6d4', true, 'YOUR-USER-ID'),
('Daily Newspaper', 'Words from daily English newspapers', '#f97316', true, 'YOUR-USER-ID');
*/