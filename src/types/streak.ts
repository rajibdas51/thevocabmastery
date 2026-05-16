/**
 * FILE: src/types/streak.ts
 * All gamification, streak, subscription, and points types.
 */

// ─── Core enums ───────────────────────────────────────────────
export type ActivityType =
  | 'quiz_complete'
  | 'flashcard_session'
  | 'word_learned'
  | 'live_exam'
  | 'fill_blank'

export type League = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'

export type SubscriptionPlan = 'free' | 'monthly' | 'biannual' | 'annual'

export type MilestoneKey =
  | 'streak_3' | 'streak_7' | 'streak_14' | 'streak_30'
  | 'streak_100' | 'streak_365'
  | 'xp_100' | 'xp_1000' | 'xp_5000'
  | 'words_10' | 'words_50' | 'words_100'
  | 'quiz_10' | 'quiz_50' | 'quiz_100'
  | 'perfect_week'

// ─── Database row types ───────────────────────────────────────

/** user_streaks table — one row per user */
export interface UserStreak {
  user_id:             string
  current_streak:      number
  longest_streak:      number
  last_activity_date:  string | null   // 'YYYY-MM-DD' UTC
  streak_frozen_today: boolean
  freeze_count:        number
  total_xp:            number
  weekly_xp:           number
  daily_xp_today:      number
  daily_goal_xp:       number
  league:              League
  // Hearts / points system
  current_points:      number   // remaining daily points (like Duolingo hearts)
  max_points:          number   // daily cap (set by admin per plan)
  points_reset_at:     string   // ISO datetime of next daily reset
  // Subscription
  subscription_plan:   SubscriptionPlan
  subscription_expires_at: string | null
  updated_at:          string
}

/** daily_activity_log table */
export interface DailyActivityLog {
  id:             string
  user_id:        string
  activity_date:  string
  activity_type:  ActivityType
  activity_count: number
  xp_earned:      number
  points_used:    number   // how many points were deducted in this session
  metadata:       Record<string, any> | null
  created_at:     string
}

/** user_milestones table */
export interface UserMilestone {
  id:             string
  user_id:        string
  milestone_key:  MilestoneKey
  achieved_at:    string
  reward_claimed: boolean
}

/** point_system_config table — admin-controlled */
export interface PointSystemConfig {
  id:                      string   // always 'singleton'
  free_daily_points:       number   // default 10
  premium_daily_points:    number   // default 999 (unlimited)
  points_lost_per_mistake: number   // default 1
  ad_reward_points:        number   // default 5
  max_ads_per_day:         number   // default 3
  // Subscription pricing (in BDT taka)
  price_monthly:           number   // 100
  price_biannual:          number   // 500
  price_annual:            number   // 1000
  updated_at:              string
}

/** subscriptions table */
export interface Subscription {
  id:           string
  user_id:      string
  plan:         SubscriptionPlan
  status:       'active' | 'expired' | 'cancelled'
  starts_at:    string
  expires_at:   string
  payment_ref:  string | null  // SSLCommerz transaction ID
  amount_bdt:   number
  created_at:   string
}

/** ad_watches table — tracks daily ad limit */
export interface AdWatch {
  id:         string
  user_id:    string
  watch_date: string   // 'YYYY-MM-DD'
  points_rewarded: number
  created_at: string
}

// ─── XP constants ─────────────────────────────────────────────
export const XP_VALUES = {
  quiz_complete:      20,
  quiz_perfect_bonus: 30,   // extra if 100% score
  flashcard_per_10:   10,
  word_learned:        5,
  live_exam:          25,
  fill_blank:         20,
  daily_goal_bonus:   20,
  streak_7_bonus:     25,
  streak_30_bonus:   100,
} as const

// ─── Daily qualification thresholds ──────────────────────────
// User keeps streak alive if ANY ONE is met
export const STREAK_THRESHOLDS = {
  quiz_complete:     1,   // finish 1 quiz
  flashcard_session: 10,  // flip 10 cards
  word_learned:      5,   // mark 5 words learned
  live_exam:         1,   // complete 1 live exam
  fill_blank:        1,   // complete 1 fill-blank session
} as const

// ─── Milestones ───────────────────────────────────────────────
export interface MilestoneDef {
  key:           MilestoneKey
  label:         string
  description:   string
  icon:          string
  xp_reward:     number
  freeze_reward: number
  badge_color:   string
}

export const MILESTONES: MilestoneDef[] = [
  { key:'streak_3',    label:'3-Day Streak!',      description:'3 days in a row',     icon:'🔥', xp_reward:50,    freeze_reward:0, badge_color:'#fb923c' },
  { key:'streak_7',    label:'One Week!',           description:'7 days in a row',     icon:'⚡', xp_reward:150,   freeze_reward:1, badge_color:'#7c6af7' },
  { key:'streak_14',   label:'Two Weeks!',          description:'14 days in a row',    icon:'🌟', xp_reward:300,   freeze_reward:1, badge_color:'#f5c842' },
  { key:'streak_30',   label:'One Month!',          description:'30 days in a row',    icon:'💎', xp_reward:750,   freeze_reward:2, badge_color:'#60a5fa' },
  { key:'streak_100',  label:'100 Days!',           description:'100 days in a row',   icon:'👑', xp_reward:2000,  freeze_reward:3, badge_color:'#22d3a0' },
  { key:'streak_365',  label:'Full Year!',          description:'365 days in a row',   icon:'🏆', xp_reward:10000, freeze_reward:7, badge_color:'#f5c842' },
  { key:'xp_100',      label:'First 100 XP',       description:'Earn 100 total XP',   icon:'✨', xp_reward:0,     freeze_reward:0, badge_color:'#a78bfa' },
  { key:'xp_1000',     label:'1000 XP Club',       description:'Earn 1000 total XP',  icon:'🎯', xp_reward:50,    freeze_reward:1, badge_color:'#7c6af7' },
  { key:'xp_5000',     label:'XP Master',          description:'Earn 5000 total XP',  icon:'🚀', xp_reward:200,   freeze_reward:2, badge_color:'#f5c842' },
  { key:'words_10',    label:'Word Explorer',      description:'Learn 10 words',       icon:'📖', xp_reward:30,    freeze_reward:0, badge_color:'#22d3a0' },
  { key:'words_100',   label:'Vocab Builder',      description:'Learn 100 words',      icon:'📚', xp_reward:200,   freeze_reward:1, badge_color:'#60a5fa' },
  { key:'quiz_10',     label:'Quiz Taker',         description:'Complete 10 quizzes',  icon:'✏️', xp_reward:50,    freeze_reward:0, badge_color:'#fb923c' },
  { key:'quiz_100',    label:'Quiz Champion',      description:'Complete 100 quizzes', icon:'🎖', xp_reward:500,   freeze_reward:2, badge_color:'#f5c842' },
  { key:'perfect_week',label:'Perfect Week',       description:'All 7 days in a week', icon:'💯', xp_reward:200,   freeze_reward:1, badge_color:'#22d3a0' },
]

export const MILESTONE_MAP = Object.fromEntries(
  MILESTONES.map(m => [m.key, m])
) as Record<MilestoneKey, MilestoneDef>

// ─── League config ────────────────────────────────────────────
export const LEAGUE_CONFIG: Record<League, {
  label: string; icon: string; color: string; min_weekly_xp: number
}> = {
  bronze:   { label:'Bronze',   icon:'🥉', color:'#cd7f32', min_weekly_xp:0    },
  silver:   { label:'Silver',   icon:'🥈', color:'#9ca3af', min_weekly_xp:200  },
  gold:     { label:'Gold',     icon:'🥇', color:'#f5c842', min_weekly_xp:500  },
  platinum: { label:'Platinum', icon:'💎', color:'#60a5fa', min_weekly_xp:1000 },
  diamond:  { label:'Diamond',  icon:'💠', color:'#a78bfa', min_weekly_xp:2000 },
}

// ─── Subscription plan config (for UI display) ────────────────
export const PLAN_CONFIG: Record<SubscriptionPlan, {
  label: string; price_bdt: number; duration_days: number
  description: string; color: string; popular?: boolean
}> = {
  free:      { label:'Free',       price_bdt:0,    duration_days:0,   description:'10 points/day, ads to refill', color:'#9090a8'  },
  monthly:   { label:'Monthly',    price_bdt:100,  duration_days:30,  description:'Unlimited points, no ads',     color:'#7c6af7'  },
  biannual:  { label:'6 Months',   price_bdt:500,  duration_days:180, description:'Unlimited points, no ads',     color:'#22d3a0', popular:true },
  annual:    { label:'1 Year',     price_bdt:1000, duration_days:365, description:'Unlimited points + all perks', color:'#f5c842'  },
}

// ─── Computed status (no DB — pure calculation) ───────────────
export interface StreakStatus {
  isActive:            boolean
  isDanger:            boolean   // past 6pm and not yet active
  isAtRisk:            boolean   // yesterday was last day
  streakSavedByFreeze: boolean
  dailyGoalProgress:   number    // 0–100
  dailyGoalMet:        boolean
  xpToNextLeague:      number
  nextLeague:          League | null
  pointsEmpty:         boolean
  isPremium:           boolean
}

// ─── Result returned to calling code ─────────────────────────
export interface RecordActivityResult {
  xp_earned:              number
  points_deducted:        number
  points_remaining:       number
  streak_updated:         boolean
  new_streak:             number
  streak_saved_by_freeze: boolean
  milestones_unlocked:    MilestoneKey[]
  daily_goal_just_met:    boolean
  out_of_points:          boolean   // true if points hit 0 this action
}
