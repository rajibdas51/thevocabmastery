-- ============================================================
-- FILE: supabase/streak_schema.sql
-- Run this in Supabase Dashboard → SQL Editor → New Query
-- Run AFTER your base schema.sql
-- ============================================================

-- ── USER STREAKS ──────────────────────────────────────────────
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
  -- Points (Duolingo-style hearts)
  current_points       INTEGER NOT NULL DEFAULT 10,
  max_points           INTEGER NOT NULL DEFAULT 10,
  points_reset_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 day'),
  -- Subscription
  subscription_plan    TEXT NOT NULL DEFAULT 'free'
    CHECK (subscription_plan IN ('free','monthly','biannual','annual')),
  subscription_expires_at TIMESTAMPTZ,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── DAILY ACTIVITY LOG ────────────────────────────────────────
CREATE TABLE public.daily_activity_log (
  id             UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id        UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  activity_date  DATE NOT NULL,
  activity_type  TEXT NOT NULL CHECK (activity_type IN (
    'quiz_complete','flashcard_session','word_learned','live_exam','fill_blank'
  )),
  activity_count INTEGER NOT NULL DEFAULT 1,
  xp_earned      INTEGER NOT NULL DEFAULT 0,
  points_used    INTEGER NOT NULL DEFAULT 0,
  metadata       JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_activity_user_date ON public.daily_activity_log (user_id, activity_date);

-- ── XP TRANSACTIONS ───────────────────────────────────────────
CREATE TABLE public.xp_transactions (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id    UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount     INTEGER NOT NULL,
  reason     TEXT NOT NULL,
  metadata   JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_xp_user ON public.xp_transactions (user_id, created_at DESC);

-- ── STREAK FREEZE LOG ─────────────────────────────────────────
CREATE TABLE public.streak_freeze_log (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  freeze_date DATE NOT NULL,
  source      TEXT NOT NULL DEFAULT 'inventory',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, freeze_date)
);

-- ── USER MILESTONES ───────────────────────────────────────────
CREATE TABLE public.user_milestones (
  id             UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id        UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  milestone_key  TEXT NOT NULL,
  achieved_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reward_claimed BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (user_id, milestone_key)
);

-- ── SUBSCRIPTIONS ─────────────────────────────────────────────
CREATE TABLE public.subscriptions (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  plan        TEXT NOT NULL CHECK (plan IN ('monthly','biannual','annual')),
  status      TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','expired','cancelled')),
  starts_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL,
  payment_ref TEXT,          -- SSLCommerz tran_id
  amount_bdt  INTEGER NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_subscriptions_user ON public.subscriptions (user_id, status);

-- ── POINT SYSTEM CONFIG (Admin-controlled) ────────────────────
-- Single row — admin edits it from the admin panel
CREATE TABLE public.point_system_config (
  id                       TEXT PRIMARY KEY DEFAULT 'singleton',
  free_daily_points        INTEGER NOT NULL DEFAULT 10,
  premium_daily_points     INTEGER NOT NULL DEFAULT 999,
  points_lost_per_mistake  INTEGER NOT NULL DEFAULT 1,
  ad_reward_points         INTEGER NOT NULL DEFAULT 5,
  max_ads_per_day          INTEGER NOT NULL DEFAULT 3,
  -- Prices in BDT taka
  price_monthly            INTEGER NOT NULL DEFAULT 100,
  price_biannual           INTEGER NOT NULL DEFAULT 500,
  price_annual             INTEGER NOT NULL DEFAULT 1000,
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Seed the single config row
INSERT INTO public.point_system_config (id) VALUES ('singleton')
  ON CONFLICT DO NOTHING;

-- ── AD WATCHES ────────────────────────────────────────────────
CREATE TABLE public.ad_watches (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id         UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  watch_date      DATE NOT NULL,
  points_rewarded INTEGER NOT NULL DEFAULT 5,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_ad_watches_user_date ON public.ad_watches (user_id, watch_date);

-- ── TRIGGERS ──────────────────────────────────────────────────

-- Auto-create streak row when profile is created
CREATE OR REPLACE FUNCTION public.init_user_streak()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_streaks (user_id)
  VALUES (NEW.id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_created_init_streak ON public.profiles;
CREATE TRIGGER on_profile_created_init_streak
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.init_user_streak();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_streaks_updated_at
  BEFORE UPDATE ON public.user_streaks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER point_config_updated_at
  BEFORE UPDATE ON public.point_system_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── ROW LEVEL SECURITY ────────────────────────────────────────
ALTER TABLE public.user_streaks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_activity_log   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_transactions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streak_freeze_log    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_milestones      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_system_config  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_watches           ENABLE ROW LEVEL SECURITY;

-- user_streaks
CREATE POLICY "Own streak full access"    ON public.user_streaks FOR ALL    USING (user_id = auth.uid());
CREATE POLICY "Public streak read"        ON public.user_streaks FOR SELECT USING (true);  -- leaderboard

-- daily_activity_log
CREATE POLICY "Own activity log"          ON public.daily_activity_log FOR ALL    USING (user_id = auth.uid());
CREATE POLICY "Admin view all activity"   ON public.daily_activity_log FOR SELECT USING (is_admin());

-- xp_transactions
CREATE POLICY "Own xp transactions"       ON public.xp_transactions FOR ALL    USING (user_id = auth.uid());
CREATE POLICY "Public xp read"            ON public.xp_transactions FOR SELECT USING (true);

-- streak_freeze_log
CREATE POLICY "Own freeze log"            ON public.streak_freeze_log FOR ALL USING (user_id = auth.uid());

-- user_milestones
CREATE POLICY "Own milestones"            ON public.user_milestones FOR ALL    USING (user_id = auth.uid());
CREATE POLICY "Public milestones read"    ON public.user_milestones FOR SELECT USING (true);

-- subscriptions
CREATE POLICY "Own subscriptions"         ON public.subscriptions FOR ALL    USING (user_id = auth.uid());
CREATE POLICY "Admin view subscriptions"  ON public.subscriptions FOR SELECT USING (is_admin());

-- point_system_config — everyone reads, only admin writes
CREATE POLICY "Public config read"        ON public.point_system_config FOR SELECT USING (true);
CREATE POLICY "Admin config write"        ON public.point_system_config FOR ALL    USING (is_admin());

-- ad_watches
CREATE POLICY "Own ad watches"            ON public.ad_watches FOR ALL USING (user_id = auth.uid());

-- ── BACKFILL existing users ───────────────────────────────────
-- Run this ONCE after applying the schema:
INSERT INTO public.user_streaks (user_id)
SELECT id FROM public.profiles
ON CONFLICT DO NOTHING;