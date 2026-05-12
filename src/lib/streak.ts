/**
 * FILE: src/lib/streak.ts
 *
 * VocabMaster Streak + Points Service
 * Single source of truth for all gamification logic.
 *
 * INTEGRATION POINTS (call these from feature pages):
 *   recordActivity()    — after quiz, flashcard, word learned, etc.
 *   deductPoint()       — on every wrong answer in quiz
 *   checkPointsEmpty()  — before allowing quiz to start
 *   watchAd()           — when user watches an ad to refill
 *
 * All date math is UTC. No timezone bugs.
 * To swap Supabase → another DB, only change the DB calls here.
 */

import { createClient } from '@/lib/supabase/client'
import type {
  UserStreak, DailyActivityLog, UserMilestone,
  ActivityType, MilestoneKey, League,
  RecordActivityResult, StreakStatus,
  PointSystemConfig,
} from '@/types/streak'
import {
  XP_VALUES, STREAK_THRESHOLDS, MILESTONE_MAP, MILESTONES,
  LEAGUE_CONFIG,
} from '@/types/streak'

// ══════════════════════════════════════════════════════════════
// DATE UTILITIES — always UTC
// ══════════════════════════════════════════════════════════════

export function todayUTC(): string {
  return new Date().toISOString().split('T')[0]
}

export function yesterdayUTC(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().split('T')[0]
}

export function daysBetween(a: string, b: string): number {
  const msPerDay = 86_400_000
  const da = new Date(a + 'T00:00:00Z').getTime()
  const db = new Date(b + 'T00:00:00Z').getTime()
  return Math.abs(Math.round((db - da) / msPerDay))
}

export function isPointsResetDue(resetAt: string): boolean {
  return new Date(resetAt) <= new Date()
}

// ══════════════════════════════════════════════════════════════
// FETCH HELPERS
// ══════════════════════════════════════════════════════════════

export async function getUserStreak(userId: string): Promise<UserStreak | null> {
  const db = createClient()
  const { data } = await db
    .from('user_streaks')
    .select('*')
    .eq('user_id', userId)
    .single()
  return data as UserStreak | null
}

export async function getPointConfig(): Promise<PointSystemConfig | null> {
  const db = createClient()
  const { data } = await db
    .from('point_system_config')
    .select('*')
    .eq('id', 'singleton')
    .single()
  return data as PointSystemConfig | null
}

export async function getTodayActivity(userId: string): Promise<DailyActivityLog[]> {
  const db = createClient()
  const { data } = await db
    .from('daily_activity_log')
    .select('*')
    .eq('user_id', userId)
    .eq('activity_date', todayUTC())
  return (data ?? []) as DailyActivityLog[]
}

export async function getActivityCalendar(
  userId: string,
  months = 3
): Promise<{ date: string; xp: number; count: number }[]> {
  const db = createClient()
  const from = new Date()
  from.setUTCMonth(from.getUTCMonth() - months)
  const fromStr = from.toISOString().split('T')[0]

  const { data } = await db
    .from('daily_activity_log')
    .select('activity_date, xp_earned, activity_count')
    .eq('user_id', userId)
    .gte('activity_date', fromStr)
    .order('activity_date')

  const map = new Map<string, { xp: number; count: number }>()
  for (const row of (data ?? []) as any[]) {
    const e = map.get(row.activity_date) ?? { xp: 0, count: 0 }
    map.set(row.activity_date, {
      xp:    e.xp + (row.xp_earned ?? 0),
      count: e.count + (row.activity_count ?? 0),
    })
  }
  return Array.from(map.entries()).map(([date, v]) => ({ date, ...v }))
}

export async function getUserMilestones(userId: string): Promise<UserMilestone[]> {
  const db = createClient()
  const { data } = await db
    .from('user_milestones')
    .select('*')
    .eq('user_id', userId)
    .order('achieved_at', { ascending: false })
  return (data ?? []) as UserMilestone[]
}

export async function getAdWatchesToday(userId: string): Promise<number> {
  const db = createClient()
  const { count } = await db
    .from('ad_watches')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('watch_date', todayUTC())
  return count ?? 0
}

// ══════════════════════════════════════════════════════════════
// POINTS SYSTEM (Duolingo-style hearts)
// ══════════════════════════════════════════════════════════════

/** Reset points if it's past the reset time (called lazily on load) */
async function maybeResetPoints(
  userId: string,
  streak: UserStreak,
  config: PointSystemConfig
): Promise<UserStreak> {
  if (!isPointsResetDue(streak.points_reset_at)) return streak

  const db = createClient()
  const isPremium = isPremiumPlan(streak.subscription_plan)
  const maxPts = isPremium
    ? config.premium_daily_points
    : config.free_daily_points

  // Reset: next reset = tomorrow midnight UTC
  const tomorrow = new Date()
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  tomorrow.setUTCHours(0, 0, 0, 0)

  await db.from('user_streaks').update({
    current_points:  maxPts,
    max_points:      maxPts,
    daily_xp_today:  0,
    streak_frozen_today: false,
    points_reset_at: tomorrow.toISOString(),
  }).eq('user_id', userId)

  return { ...streak, current_points: maxPts, max_points: maxPts, daily_xp_today: 0 }
}

export function isPremiumPlan(plan: string): boolean {
  return plan === 'monthly' || plan === 'biannual' || plan === 'annual'
}

/** Called on every wrong answer. Returns remaining points. */
export async function deductPoint(userId: string): Promise<{
  points_remaining: number
  out_of_points: boolean
}> {
  const db = createClient()
  const [streak, config] = await Promise.all([getUserStreak(userId), getPointConfig()])
  if (!streak || !config) return { points_remaining: 0, out_of_points: true }

  // Premium users never lose points
  if (isPremiumPlan(streak.subscription_plan)) {
    return { points_remaining: streak.max_points, out_of_points: false }
  }

  const freshStreak = await maybeResetPoints(userId, streak, config)
  const newPoints = Math.max(0, freshStreak.current_points - config.points_lost_per_mistake)

  await db.from('user_streaks')
    .update({ current_points: newPoints })
    .eq('user_id', userId)

  return {
    points_remaining: newPoints,
    out_of_points:    newPoints === 0,
  }
}

/** Check if user can start a quiz (has points or is premium) */
export async function checkCanStartQuiz(userId: string): Promise<{
  can_start:  boolean
  reason:     'ok' | 'no_points' | 'premium_unlimited'
  points:     number
  max_points: number
  ads_available: number
  max_ads:    number
}> {
  const [streak, config] = await Promise.all([getUserStreak(userId), getPointConfig()])
  if (!streak || !config) return { can_start: false, reason: 'no_points', points: 0, max_points: 10, ads_available: 0, max_ads: 3 }

  const freshStreak = await maybeResetPoints(userId, streak, config)

  if (isPremiumPlan(freshStreak.subscription_plan)) {
    return { can_start: true, reason: 'premium_unlimited', points: freshStreak.max_points, max_points: freshStreak.max_points, ads_available: 0, max_ads: config.max_ads_per_day }
  }

  const adWatches = await getAdWatchesToday(userId)
  const adsAvailable = Math.max(0, config.max_ads_per_day - adWatches)

  if (freshStreak.current_points <= 0) {
    return { can_start: false, reason: 'no_points', points: 0, max_points: freshStreak.max_points, ads_available: adsAvailable, max_ads: config.max_ads_per_day }
  }

  return { can_start: true, reason: 'ok', points: freshStreak.current_points, max_points: freshStreak.max_points, ads_available: adsAvailable, max_ads: config.max_ads_per_day }
}

/** User watched an ad — refill points */
export async function watchAd(userId: string): Promise<{
  success:  boolean
  reason:   string
  points_added: number
  points_now:   number
}> {
  const db = createClient()
  const [streak, config] = await Promise.all([getUserStreak(userId), getPointConfig()])
  if (!streak || !config) return { success: false, reason: 'Error loading data', points_added: 0, points_now: 0 }

  const adWatches = await getAdWatchesToday(userId)
  if (adWatches >= config.max_ads_per_day) {
    return { success: false, reason: `Max ${config.max_ads_per_day} ads per day reached`, points_added: 0, points_now: streak.current_points }
  }

  const newPoints = Math.min(streak.max_points, streak.current_points + config.ad_reward_points)

  await Promise.all([
    db.from('user_streaks').update({ current_points: newPoints }).eq('user_id', userId),
    db.from('ad_watches').insert({
      user_id: userId,
      watch_date: todayUTC(),
      points_rewarded: config.ad_reward_points,
    }),
  ])

  return {
    success:      true,
    reason:       'ok',
    points_added: config.ad_reward_points,
    points_now:   newPoints,
  }
}

// ══════════════════════════════════════════════════════════════
// CORE: recordActivity — call this after every learning action
// ══════════════════════════════════════════════════════════════

export async function recordActivity(
  userId: string,
  type: ActivityType,
  count: number,                            // quizzes completed, cards flipped, words learned, etc.
  extras?: {
    perfect?: boolean                       // 100% quiz score
    quiz_wrong_count?: number               // wrong answers this quiz
    metadata?: Record<string, any>
  }
): Promise<RecordActivityResult> {
  const db = createClient()
  const today     = todayUTC()
  const yesterday = yesterdayUTC()

  // Load streak + config in parallel
  const [streakRaw, config] = await Promise.all([getUserStreak(userId), getPointConfig()])
  if (!streakRaw || !config) throw new Error('Streak data not found')

  // Maybe reset daily points
  const streak = await maybeResetPoints(userId, streakRaw, config)

  // ── Calculate XP ────────────────────────────────────────────
  let xp = 0
  switch (type) {
    case 'quiz_complete':
      xp = XP_VALUES.quiz_complete * count
      if (extras?.perfect) xp += XP_VALUES.quiz_perfect_bonus
      break
    case 'flashcard_session':
      xp = Math.floor(count / 10) * XP_VALUES.flashcard_per_10
      break
    case 'word_learned':
      xp = count * XP_VALUES.word_learned
      break
    case 'live_exam':
      xp = XP_VALUES.live_exam * count
      break
    case 'fill_blank':
      xp = XP_VALUES.fill_blank * count
      break
  }

  // ── Log activity ─────────────────────────────────────────────
  await db.from('daily_activity_log').insert({
    user_id:        userId,
    activity_date:  today,
    activity_type:  type,
    activity_count: count,
    xp_earned:      xp,
    points_used:    extras?.quiz_wrong_count ?? 0,
    metadata:       extras?.metadata ?? null,
  })

  // ── Check qualification ──────────────────────────────────────
  const todayLogs = await getTodayActivity(userId)
  const totals: Record<ActivityType, number> = {
    quiz_complete: 0, flashcard_session: 0, word_learned: 0,
    live_exam: 0, fill_blank: 0,
  }
  for (const log of todayLogs) {
    totals[log.activity_type] = (totals[log.activity_type] ?? 0) + log.activity_count
  }

  const qualifiesNow = (
    totals.quiz_complete     >= STREAK_THRESHOLDS.quiz_complete      ||
    totals.flashcard_session >= STREAK_THRESHOLDS.flashcard_session  ||
    totals.word_learned      >= STREAK_THRESHOLDS.word_learned       ||
    totals.live_exam         >= STREAK_THRESHOLDS.live_exam          ||
    totals.fill_blank        >= STREAK_THRESHOLDS.fill_blank
  )

  const alreadyQualifiedToday = streak.last_activity_date === today

  let streakUpdated  = false
  let freezeSaved    = false
  let newStreak      = streak.current_streak

  // ── Streak logic ─────────────────────────────────────────────
  if (qualifiesNow && !alreadyQualifiedToday) {
    // Was yesterday frozen?
    const { data: freezeRow } = await db
      .from('streak_freeze_log')
      .select('freeze_date')
      .eq('user_id', userId)
      .eq('freeze_date', yesterday)
      .maybeSingle()

    const lastDate     = streak.last_activity_date
    const daysSinceLast = lastDate ? daysBetween(lastDate, today) : 999

    if (daysSinceLast === 1 || freezeRow) {
      // Normal consecutive day (or yesterday was frozen)
      newStreak = streak.current_streak + 1
      if (freezeRow) freezeSaved = true
    } else if (daysSinceLast === 2 && streak.freeze_count > 0) {
      // Missed 1 day — auto-use a freeze
      await db.from('streak_freeze_log').upsert(
        { user_id: userId, freeze_date: yesterday, source: 'inventory' },
        { onConflict: 'user_id,freeze_date' }
      )
      await db.from('user_streaks')
        .update({ freeze_count: streak.freeze_count - 1 })
        .eq('user_id', userId)
      newStreak = streak.current_streak + 1
      freezeSaved = true
    } else {
      // Streak broken
      newStreak = 1
    }

    streakUpdated = true

    // Streak XP bonuses
    if (newStreak > 0 && newStreak % 7 === 0)  xp += XP_VALUES.streak_7_bonus
    if (newStreak > 0 && newStreak % 30 === 0) xp += XP_VALUES.streak_30_bonus
  }

  // ── Daily goal check ─────────────────────────────────────────
  const newDailyXp    = streak.daily_xp_today + xp
  const goalJustMet   = !alreadyQualifiedToday
    && streak.daily_xp_today < streak.daily_goal_xp
    && newDailyXp >= streak.daily_goal_xp
  if (goalJustMet) xp += XP_VALUES.daily_goal_bonus

  // ── Save XP transaction ──────────────────────────────────────
  if (xp > 0) {
    await db.from('xp_transactions').insert({
      user_id: userId, amount: xp, reason: type,
      metadata: extras?.metadata ?? null,
    })
  }

  // ── Update user_streaks ──────────────────────────────────────
  const updatePayload: Partial<UserStreak> & { updated_at: string } = {
    total_xp:       streak.total_xp + xp,
    weekly_xp:      streak.weekly_xp + xp,
    daily_xp_today: newDailyXp,
    updated_at:     new Date().toISOString(),
  }
  if (streakUpdated) {
    updatePayload.current_streak     = newStreak
    updatePayload.longest_streak     = Math.max(streak.longest_streak, newStreak)
    updatePayload.last_activity_date = today as any
  }
  await db.from('user_streaks').update(updatePayload).eq('user_id', userId)

  // ── Milestone checks ─────────────────────────────────────────
  const existingMilestones = await getUserMilestones(userId)
  const existingKeys       = new Set(existingMilestones.map(m => m.milestone_key))
  const finalStreak        = updatePayload.current_streak ?? streak.current_streak
  const finalXp            = updatePayload.total_xp       ?? streak.total_xp
  const unlockedKeys: MilestoneKey[] = []

  const checks: [number | [number, 'xp' | 'streak'], MilestoneKey][] = [
    [[3,   'streak'], 'streak_3'],   [[7,   'streak'], 'streak_7'],
    [[14,  'streak'], 'streak_14'],  [[30,  'streak'], 'streak_30'],
    [[100, 'streak'], 'streak_100'], [[365, 'streak'], 'streak_365'],
    [[100,  'xp'],    'xp_100'],     [[1000, 'xp'],    'xp_1000'],
    [[5000, 'xp'],    'xp_5000'],
  ]

  for (const [threshold, key] of checks) {
    if (existingKeys.has(key)) continue
    const [val, kind] = threshold as [number, 'xp' | 'streak']
    const meets = kind === 'streak' ? finalStreak >= val : finalXp >= val
    if (meets) unlockedKeys.push(key)
  }

  // Persist milestones + grant rewards
  for (const key of unlockedKeys) {
    const def = MILESTONE_MAP[key]
    if (!def) continue
    await db.from('user_milestones')
      .upsert({ user_id: userId, milestone_key: key }, { onConflict: 'user_id,milestone_key' })

    if (def.freeze_reward > 0) {
      const latest = await getUserStreak(userId)
      if (latest) {
        await db.from('user_streaks')
          .update({ freeze_count: latest.freeze_count + def.freeze_reward })
          .eq('user_id', userId)
      }
    }
    if (def.xp_reward > 0) {
      await db.from('xp_transactions').insert({
        user_id: userId, amount: def.xp_reward, reason: `milestone_${key}`,
      })
      await db.from('user_streaks')
        .update({ total_xp: (updatePayload.total_xp ?? streak.total_xp) + def.xp_reward })
        .eq('user_id', userId)
    }
  }

  return {
    xp_earned:              xp,
    points_deducted:        extras?.quiz_wrong_count ?? 0,
    points_remaining:       streak.current_points,
    streak_updated:         streakUpdated,
    new_streak:             newStreak,
    streak_saved_by_freeze: freezeSaved,
    milestones_unlocked:    unlockedKeys,
    daily_goal_just_met:    goalJustMet,
    out_of_points:          streak.current_points <= 0 && !isPremiumPlan(streak.subscription_plan),
  }
}

// ══════════════════════════════════════════════════════════════
// SUBSCRIPTION
// ══════════════════════════════════════════════════════════════

export async function activateSubscription(
  userId: string,
  plan: 'monthly' | 'biannual' | 'annual',
  paymentRef: string,
  amountBdt: number
): Promise<void> {
  const db = createClient()
  const config = await getPointConfig()

  const daysMap = { monthly: 30, biannual: 180, annual: 365 }
  const days    = daysMap[plan]
  const expires = new Date()
  expires.setUTCDate(expires.getUTCDate() + days)

  await Promise.all([
    db.from('subscriptions').insert({
      user_id:     userId,
      plan,
      status:      'active',
      expires_at:  expires.toISOString(),
      payment_ref: paymentRef,
      amount_bdt:  amountBdt,
    }),
    db.from('user_streaks').update({
      subscription_plan:       plan,
      subscription_expires_at: expires.toISOString(),
      // Immediately give premium points
      current_points:  config?.premium_daily_points ?? 999,
      max_points:      config?.premium_daily_points ?? 999,
    }).eq('user_id', userId),
  ])
}

export async function checkSubscriptionExpiry(userId: string): Promise<void> {
  const db     = createClient()
  const streak = await getUserStreak(userId)
  if (!streak) return
  if (!isPremiumPlan(streak.subscription_plan)) return
  if (!streak.subscription_expires_at) return

  const expired = new Date(streak.subscription_expires_at) < new Date()
  if (!expired) return

  const config = await getPointConfig()
  await db.from('user_streaks').update({
    subscription_plan:       'free',
    subscription_expires_at: null,
    current_points:  config?.free_daily_points ?? 10,
    max_points:      config?.free_daily_points ?? 10,
  }).eq('user_id', userId)
}

// ══════════════════════════════════════════════════════════════
// LEADERBOARD
// ══════════════════════════════════════════════════════════════

export async function getStreakLeaderboard(limit = 20) {
  const db = createClient()
  const { data } = await db
    .from('user_streaks')
    .select('*, profile:profiles(full_name, avatar_url)')
    .order('current_streak', { ascending: false })
    .limit(limit)

  return (data ?? []).map((r: any) => ({
    ...r as UserStreak,
    full_name:  r.profile?.full_name  ?? null,
    avatar_url: r.profile?.avatar_url ?? null,
  }))
}

export async function getXpLeaderboard(limit = 20) {
  const db = createClient()
  const { data } = await db
    .from('user_streaks')
    .select('*, profile:profiles(full_name, avatar_url)')
    .order('weekly_xp', { ascending: false })
    .limit(limit)

  return (data ?? []).map((r: any) => ({
    ...r as UserStreak,
    full_name:  r.profile?.full_name  ?? null,
    avatar_url: r.profile?.avatar_url ?? null,
  }))
}

// ══════════════════════════════════════════════════════════════
// COMPUTED STATUS — pure, no DB (use cached data)
// ══════════════════════════════════════════════════════════════

export function computeStreakStatus(
  streak: UserStreak,
  todayLogs: DailyActivityLog[]
): StreakStatus {
  const today     = todayUTC()
  const yesterday = yesterdayUTC()
  const hourUTC   = new Date().getUTCHours()

  const totals: Record<ActivityType, number> = {
    quiz_complete: 0, flashcard_session: 0, word_learned: 0,
    live_exam: 0, fill_blank: 0,
  }
  for (const log of todayLogs) {
    totals[log.activity_type] = (totals[log.activity_type] ?? 0) + log.activity_count
  }

  const isActive = (
    totals.quiz_complete     >= STREAK_THRESHOLDS.quiz_complete     ||
    totals.flashcard_session >= STREAK_THRESHOLDS.flashcard_session ||
    totals.word_learned      >= STREAK_THRESHOLDS.word_learned      ||
    totals.live_exam         >= STREAK_THRESHOLDS.live_exam         ||
    totals.fill_blank        >= STREAK_THRESHOLDS.fill_blank
  )

  const isAtRisk = !isActive && streak.last_activity_date === yesterday
  const isDanger = isAtRisk && hourUTC >= 18

  const dailyGoalProgress = Math.min(
    100, Math.round((streak.daily_xp_today / Math.max(1, streak.daily_goal_xp)) * 100)
  )

  const leagueOrder: League[] = ['bronze','silver','gold','platinum','diamond']
  const idx = leagueOrder.indexOf(streak.league)
  const nextLeague = idx < leagueOrder.length - 1 ? leagueOrder[idx + 1] : null
  const xpToNext   = nextLeague
    ? Math.max(0, LEAGUE_CONFIG[nextLeague].min_weekly_xp - streak.weekly_xp)
    : 0

  return {
    isActive,
    isDanger,
    isAtRisk,
    streakSavedByFreeze: streak.streak_frozen_today,
    dailyGoalProgress,
    dailyGoalMet:    streak.daily_xp_today >= streak.daily_goal_xp,
    xpToNextLeague:  xpToNext,
    nextLeague,
    pointsEmpty:     streak.current_points <= 0 && !isPremiumPlan(streak.subscription_plan),
    isPremium:       isPremiumPlan(streak.subscription_plan),
  }
}