"I'm building VocabMaster — a Next.js + Supabase vocabulary app. Here's our NOTES.md:

# VocabMaster — Dev Notes

## Architecture decisions

- Database: Supabase (PostgreSQL)
- AI: Gemini 2.5 Flash (gemini-2.5-flash via v1 endpoint)
- Auth: Supabase Auth + Google/GitHub OAuth
- Theme: CSS variables via data-theme attribute on <html>

## Latest file versions (from which tar)

- db.ts → vocabmaster-v5 (has fill_blank, meaning_en, meaning_bn)
- types/index.ts → vocabmaster-v5
- gemini/index.ts → vocabmaster-v5
- Sidebar.tsx → vocabmaster-v5
- flashcards/page.tsx → flashcards-page.tsx output
- quiz/page.tsx → vocabmaster-v5
- fill-blank/page.tsx → vocabmaster-v5 (new page)
- admin/page.tsx → vocabmaster-v5 (has Generate Examples tab)

## Quiz types implemented

- meaning_en: English word → pick correct English meaning
- meaning_bn: English word → pick correct Bangla meaning
- synonym: pick the correct synonym
- antonym: pick the correct antonym
- fill_blank: fill in the blank from example sentence
- mixed: random mix of meaning_en/meaning_bn/synonym/antonym

## Fill-in-the-blank strategy

- Admin must generate example sentences first (Admin Panel → Generate Examples tab)
- Uses Gemini in batches of 5 words per API call
- 4 second pause between batches (free tier safe)
- Sentences saved permanently to DB — zero AI calls during quiz

## Admin-only AI features

- Add Word → AI Fill button (admins only)
- Focus Writing → AI Write button (admins only)
- Admin Panel → Generate Examples tab

## Supabase schema

- See supabase/schema.sql in project root
- words table has: part_of_speech, pronunciation columns (added in v2)
- quiz_attempts has: quiz_type column

## Known issues fixed

- Modal uses React Portal (createPortal) → always centered in viewport
- Flashcard colors use resolved JS values, not CSS vars (theme-aware)
- TTS voice scoring: avoids Zira/David (robotic), prefers Google/Samantha

NOW I WANT TO BUILD:
An advanced production-grade DAILY STREAK + RETENTION SYSTEM inspired by:

Duolingo
modern mobile games
habit-building psychology

IMPORTANT:
This feature must deeply integrate with my EXISTING systems:

quizzes
flashcards
multiplayer
decks
learned words

GOALS

The system should:

Increase daily retention
Increase DAU
Create habit-forming behavior
Encourage daily learning
Make users emotionally invested in streaks
Reward consistency
Connect naturally with all existing learning activities

The experience should feel:

modern
premium
addictive in a healthy way
smooth
emotionally rewarding

Avoid:

childish UI
excessive notifications
spammy UX
gambling-style mechanics

CORE STREAK RULES

A streak continues if user completes ANY ONE:

1 quiz
10 flashcards
1 multiplayer match
learn 5 words
5 active learning minutes

Only count once per calendar day.

FEATURES I NEED

ADVANCED STREAK SYSTEM
Design:
streak tracking logic
longest streak
daily activity validation
timezone-aware handling
midnight reset logic
offline sync handling
multi-device handling
anti-cheat validation
duplicate prevention
STREAK FREEZE SYSTEM
Build:
streak freeze inventory
auto-use freeze
earning freezes through milestones
premium freeze support
emotional UX when streak is saved
DAILY RETENTION HOOKS
Need psychologically engaging loops:
momentum effect
fear of losing streak
progress visualization
“1 quick lesson keeps your streak alive”
return motivation systems
XP + REWARD SYSTEM
Integrate:
XP rewards
streak multipliers
milestone rewards
daily rewards
badges
profile cosmetics
achievement system
STREAK MILESTONES
Need milestone system for:
3 days
7 days
14 days
30 days
100 days
365 days

Generate:

reward ideas
animation ideas
UX celebration concepts
milestone popup UI
SOCIAL RETENTION
Integrate with multiplayer:
friend streak comparison
leaderboard
weekly leagues
win streaks
rivalry system
HOMEPAGE RETENTION DESIGN
Design a modern dashboard that shows:
current streak
longest streak
daily goal progress
XP progress
pending reviews
weak words
league position
next reward

Need:

UX structure
layout ideas
component hierarchy
STREAK CALENDAR
Build:
GitHub-style heatmap
monthly view
activity intensity
missed days
streak freeze indicators
SMART NOTIFICATIONS
Generate:
notification logic
smart reminder timing
streak danger alerts
comeback notifications
milestone notifications

Need 50 real notification examples.

DATABASE DESIGN
Generate:
PostgreSQL schema
optimized indexes
relations
migration strategy
Supabase-friendly structure
BACKEND ARCHITECTURE
Need:
scalable service architecture
TypeScript services
Supabase integration
API structure
cron jobs
scheduled streak checks
reward processing
notification queue logic
FRONTEND IMPLEMENTATION
Generate:
React component architecture
Tailwind styling approach
Framer Motion animation concepts
responsive mobile-first structure
state management recommendations
ANALYTICS
Need:
retention metrics
streak analytics
churn signals
DAU tracking
engagement tracking
A/B testing ideas
EDGE CASES
Handle:
timezone switching
offline progress sync
duplicate actions
midnight race conditions
device time manipulation
simultaneous sessions
DELIVERABLE FORMAT

I want:

production-grade architecture
clean scalable code structure
database schema
pseudocode
API examples
UI component examples
folder structure
implementation strategy
UX reasoning
gamification psychology explanation

The final system should feel like a premium modern learning platform that combines:

Duolingo retention
Notion-quality UI polish
modern mobile game engagement
professional educational UX
