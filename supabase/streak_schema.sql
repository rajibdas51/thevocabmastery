-- ============================================================
-- VocabMaster — Streak & Gamification Schema
-- Run AFTER the base schema.sql in Supabase SQL Editor
-- ============================================================

CREATE TABLE public.user_streaks (
  user_id              UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  current_streak       INTEGER NOT NULL DEFAULT 0,
  longest_streak       INTEGER NOT NULL DEFAULT 0,
  last_activity_date   DATE,
  streak_frozen_today  BOOLEAN NOT NULL DEFAULT FALSE,
  freeze_count         INTEGER NOT NULL DEFAULT 0,
  total_xp             INTEGER NOT NULL DEFAULT 0,
  weekly_xp            INTEGER NOT NULL DEFAULT 0,
  daily_xp_today       INTEGER NOT NULL DEFAULT 0,
  daily_goal_xp        INTEGER NOT NULL DEFAULT 50,
  league               TEXT NOT NULL DEFAULT 'bronze'
    CHECK (league IN ('bronze','silver','gold','platinum','diamond')),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.daily_activity_log (
  id             UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id        UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  activity_date  DATE NOT NULL,
  activity_type  TEXT NOT NULL CHECK (activity_type IN (
    'quiz','flashcard','multiplayer','word_learned','time_spent'
  )),
  activity_count INTEGER NOT NULL DEFAULT 1,
  xp_earned      INTEGER NOT NULL DEFAULT 0,
  metadata       JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX daily_activity_user_date_idx ON public.daily_activity_log (user_id, activity_date);

CREATE TABLE public.streak_freeze_log (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  freeze_date DATE NOT NULL,
  source      TEXT NOT NULL DEFAULT 'inventory',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, freeze_date)
);

CREATE TABLE public.xp_transactions (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id    UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount     INTEGER NOT NULL,
  reason     TEXT NOT NULL,
  multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.0,
  metadata   JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX xp_transactions_user_idx ON public.xp_transactions (user_id, created_at DESC);

CREATE TABLE public.user_milestones (
  id             UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id        UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  milestone_key  TEXT NOT NULL,
  achieved_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reward_claimed BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (user_id, milestone_key)
);

CREATE TABLE public.notification_prefs (
  user_id           UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  streak_reminder   BOOLEAN NOT NULL DEFAULT TRUE,
  reminder_hour_utc INTEGER NOT NULL DEFAULT 18
    CHECK (reminder_hour_utc BETWEEN 0 AND 23),
  streak_danger     BOOLEAN NOT NULL DEFAULT TRUE,
  milestone_alerts  BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-init on signup
CREATE OR REPLACE FUNCTION public.init_user_streak()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_streaks (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  INSERT INTO public.notification_prefs (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_created_init_streak
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.init_user_streak();

-- RLS
ALTER TABLE public.user_streaks       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streak_freeze_log  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_transactions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_milestones    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own streak"       ON public.user_streaks FOR ALL    USING (user_id = auth.uid());
CREATE POLICY "View all streaks" ON public.user_streaks FOR SELECT USING (true);
CREATE POLICY "Own activity"     ON public.daily_activity_log FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Own freeze"       ON public.streak_freeze_log  FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Own xp"           ON public.xp_transactions    FOR ALL USING (user_id = auth.uid());
CREATE POLICY "View xp"          ON public.xp_transactions    FOR SELECT USING (true);
CREATE POLICY "Own milestones"   ON public.user_milestones    FOR ALL USING (user_id = auth.uid());
CREATE POLICY "View milestones"  ON public.user_milestones    FOR SELECT USING (true);
CREATE POLICY "Own notif"        ON public.notification_prefs FOR ALL USING (user_id = auth.uid());

-- Backfill existing users (run once):
-- INSERT INTO public.user_streaks (user_id) SELECT id FROM public.profiles ON CONFLICT DO NOTHING;
-- INSERT INTO public.notification_prefs (user_id) SELECT id FROM public.profiles ON CONFLICT DO NOTHING;