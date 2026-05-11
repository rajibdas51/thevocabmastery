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
