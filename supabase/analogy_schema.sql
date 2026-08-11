-- ============================================================
-- FILE: supabase/analogy_schema.sql
-- Run in Supabase SQL Editor
-- ============================================================

-- ── ANALOGIES TABLE ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.analogies (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

  -- The stem pair e.g. "SEDATIVE : DROWSINESS"
  word_a          TEXT NOT NULL,   -- SEDATIVE
  word_b          TEXT NOT NULL,   -- DROWSINESS
  relationship    TEXT NOT NULL,   -- 'A causes B' / stored for filtering/study

  -- Bangla meanings of stem words
  word_a_bn       TEXT,            -- ঘুমের ওষুধ
  word_b_bn       TEXT,            -- তন্দ্রালুতা

  -- 4 MCQ options (one is correct)
  options         JSONB NOT NULL,
  -- Structure:
  -- [
  --   { "id": "a", "word_c": "epidemic",  "word_d": "contagiousness",
  --     "word_c_bn": "মহামারী", "word_d_bn": "সংক্রামকতা" },
  --   { "id": "b", "word_c": "vaccine",   "word_d": "virus",
  --     "word_c_bn": "টিকা",   "word_d_bn": "ভাইরাস" },
  --   { "id": "c", "word_c": "laxative",  "word_d": "drug",
  --     "word_c_bn": "রেচক",   "word_d_bn": "ওষুধ" },
  --   { "id": "d", "word_c": "anesthetic","word_d": "numbness",
  --     "word_c_bn": "অনুভূতিনাশক", "word_d_bn": "অবশতা" }
  -- ]

  correct_option  TEXT NOT NULL,   -- 'd'

  -- Explanation in Bangla (rich text / plain)
  explanation_bn  TEXT NOT NULL,   -- full Bangla explanation of why d is correct

  -- Relationship explanation in English (for admin/study)
  relationship_explanation TEXT,

  -- Source exam info
  source          TEXT,            -- 'AB Bank MT-2011, UCB Officer-2011'
  difficulty      TEXT NOT NULL DEFAULT 'medium'
    CHECK (difficulty IN ('easy','medium','hard')),

  -- Categorize by relationship type for filtering
  relationship_type TEXT NOT NULL DEFAULT 'cause_effect'
    CHECK (relationship_type IN (
      'cause_effect',      -- A causes B (sedative:drowsiness)
      'part_whole',        -- A is part of B
      'type_category',     -- A is a type of B
      'degree',            -- A is a more intense form of B
      'tool_purpose',      -- A is used for B
      'worker_tool',       -- A uses B as tool
      'worker_product',    -- A produces B
      'antonym',           -- A is opposite of B
      'synonym',           -- A means same as B
      'characteristic',    -- A is characteristic of B
      'location',          -- A is found in B
      'sequence',          -- A comes before B
      'other'
    )),

  is_published    BOOLEAN NOT NULL DEFAULT TRUE,
  created_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analogies_type       ON public.analogies (relationship_type);
CREATE INDEX IF NOT EXISTS idx_analogies_difficulty ON public.analogies (difficulty);
CREATE INDEX IF NOT EXISTS idx_analogies_published  ON public.analogies (is_published);

-- ── ANALOGY ATTEMPTS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.analogy_attempts (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id         UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  analogy_id      UUID REFERENCES public.analogies(id) ON DELETE CASCADE NOT NULL,
  selected_option TEXT NOT NULL,
  is_correct      BOOLEAN NOT NULL,
  time_taken_ms   INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analogy_attempts_user ON public.analogy_attempts (user_id, created_at DESC);

-- ── RLS ───────────────────────────────────────────────────────
ALTER TABLE public.analogies         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analogy_attempts  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read analogies"   ON public.analogies;
DROP POLICY IF EXISTS "Admin manage analogies"  ON public.analogies;
DROP POLICY IF EXISTS "Own analogy attempts"    ON public.analogy_attempts;

CREATE POLICY "Public read analogies"  ON public.analogies        FOR SELECT USING (is_published = true);
CREATE POLICY "Admin manage analogies" ON public.analogies        FOR ALL    USING (true);
CREATE POLICY "Own analogy attempts"   ON public.analogy_attempts FOR ALL    USING (user_id = auth.uid());

-- ── SAMPLE DATA ───────────────────────────────────────────────
INSERT INTO public.analogies (
  word_a, word_b, word_a_bn, word_b_bn,
  relationship, relationship_type,
  options, correct_option,
  explanation_bn, relationship_explanation,
  source, difficulty
) VALUES (
  'SEDATIVE', 'DROWSINESS',
  'ঘুমের ওষুধ / প্রশমক', 'তন্দ্রালুতা / ঝিমুনি',
  'causes', 'cause_effect',
  '[
    {"id":"a","word_c":"epidemic","word_d":"contagiousness","word_c_bn":"মহামারী","word_d_bn":"সংক্রামকতা"},
    {"id":"b","word_c":"vaccine","word_d":"virus","word_c_bn":"টিকা","word_d_bn":"ভাইরাস"},
    {"id":"c","word_c":"laxative","word_d":"drug","word_c_bn":"রেচক/পায়খানা নরম করার ওষুধ","word_d_bn":"ওষুধ"},
    {"id":"d","word_c":"anesthetic","word_d":"numbness","word_c_bn":"অনুভূতিনাশক পদার্থ","word_d_bn":"অবশতা/অনুভূতিশূন্যতা"}
  ]',
  'd',
  'Sedative (ঘুমের ওষুধ) যেভাবে Drowsiness (ঘুম ঘুম ভাব) আনে, ঠিক তেমনি Anesthetic (অবশ করার ওষুধ) দ্বারা Numbness (অবশতা) হয়।

সব শব্দের অর্থ:
• Sedative = প্রশান্তিদায়ক ওষুধ, ঘুমের ওষুধ
• Drowsiness = তন্দ্রালুতা, ঝিমুনি
• Epidemic = মহামারী
• Contagiousness = সংক্রামকতা
• Vaccine = টিকা
• Virus = ভাইরাস, জীবাণু
• Laxative = রেচক, পায়খানা নরম করে এমন ওষুধ
• Drug = ওষুধ
• Anesthetic = অনুভূতিনাশক পদার্থ
• Numbness = অনুভূতিশূন্যতা, অবশতা

সম্পর্ক: কারণ → ফলাফল (Cause → Effect)
Sedative → Drowsiness ঘটায়
Anesthetic → Numbness ঘটায়

অন্য অপশনগুলো কেন ভুল:
(a) Epidemic → Contagiousness নয়, বরং Contagiousness থেকে Epidemic হয় — সম্পর্ক উল্টো
(b) Vaccine → Virus এর কারণ নয়, বরং Vaccine ভাইরাস প্রতিরোধ করে
(c) Laxative → Drug নয়, Laxative নিজেই এক ধরনের Drug — সম্পর্ক ভুল',
  'A causes B — a sedative causes drowsiness; an anesthetic causes numbness',
  'AB Bank MT-2011, UCB Officer-2011',
  'medium'
) ON CONFLICT DO NOTHING;

SELECT 'Analogy schema created!' as status;
