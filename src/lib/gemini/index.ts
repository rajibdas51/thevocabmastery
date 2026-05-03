/**
 * Gemini AI Service
 * Uses Google Gemini Free API (gemini-1.5-flash)
 * Replace NEXT_PUBLIC_GEMINI_API_KEY in .env.local
 *
 * Migration note: swap this file only to change AI provider
 */

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'

async function callGemini(prompt: string): Promise<string> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY
  if (!apiKey) throw new Error('NEXT_PUBLIC_GEMINI_API_KEY is not set in .env.local')

  const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 1024 },
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message ?? `Gemini API error: ${res.status}`)
  }

  const data = await res.json()
  const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  if (!text) throw new Error('Empty response from Gemini')
  return text.trim()
}

// ─── Word Generation ──────────────────────────────────────────

export interface GeneratedWordData {
  bangla_meaning: string
  english_meaning: string
  synonyms: string[]
  antonyms: string[]
  example: string
  part_of_speech: string
  pronunciation?: string
}

export async function generateWordData(word: string): Promise<GeneratedWordData> {
  const prompt = `You are a vocabulary assistant for competitive exam preparation (BCS, Bank Jobs, GRE).
Given the English word "${word}", generate the following information.
Respond ONLY with a valid JSON object, no markdown, no explanation, no code fences.

{
  "bangla_meaning": "primary Bangla/Bengali meaning of the word",
  "english_meaning": "clear, concise English definition (1-2 sentences)",
  "synonyms": ["synonym1", "synonym2", "synonym3", "synonym4"],
  "antonyms": ["antonym1", "antonym2", "antonym3"],
  "example": "A natural example sentence using the word in context",
  "part_of_speech": "noun|verb|adjective|adverb|preposition|conjunction|interjection|pronoun",
  "pronunciation": "simple phonetic pronunciation like /ɛ-FEM-er-əl/"
}

Make sure:
- Bangla meaning is accurate and commonly used
- English meaning is exam-appropriate
- Synonyms and antonyms are vocabulary-level words (not basic)
- Example sentence is natural and shows clear meaning
- part_of_speech is one of the listed options`

  const raw = await callGemini(prompt)

  // Strip markdown fences if model adds them despite instruction
  const clean = raw.replace(/```json|```/gi, '').trim()
  const parsed = JSON.parse(clean) as GeneratedWordData

  // Validate required fields
  if (!parsed.english_meaning) throw new Error('Invalid response: missing english_meaning')

  return {
    bangla_meaning: parsed.bangla_meaning ?? '',
    english_meaning: parsed.english_meaning,
    synonyms: Array.isArray(parsed.synonyms) ? parsed.synonyms.slice(0, 5) : [],
    antonyms: Array.isArray(parsed.antonyms) ? parsed.antonyms.slice(0, 4) : [],
    example: parsed.example ?? '',
    part_of_speech: parsed.part_of_speech ?? 'adjective',
    pronunciation: parsed.pronunciation,
  }
}

// ─── Focus Writing Generation ─────────────────────────────────

export interface GeneratedFocusWriting {
  title: string
  content: string
  tags: string[]
  word_count: number
}

export async function generateFocusWriting(topic: string, category: string): Promise<GeneratedFocusWriting> {
  const prompt = `You are an expert writing teacher for competitive exam preparation in Bangladesh (BCS, Bank Jobs).
Write a model answer / focus writing for the following topic.

Topic: "${topic}"
Category: "${category}"

Respond ONLY with a valid JSON object, no markdown, no code fences.

{
  "title": "The exact topic title",
  "content": "A well-structured model answer of 250-350 words. Use clear paragraphs. Include introduction, 3-4 body paragraphs covering key points, and conclusion. Write in formal, exam-appropriate English.",
  "tags": ["tag1", "tag2", "tag3"],
  "word_count": 300
}

The content should:
- Be relevant to Bangladeshi competitive exam context
- Use vocabulary appropriate for BCS/Bank exam level
- Have clear structure with introduction, body, and conclusion
- Cover the topic comprehensively but concisely`

  const raw = await callGemini(prompt)
  const clean = raw.replace(/```json|```/gi, '').trim()
  const parsed = JSON.parse(clean) as GeneratedFocusWriting

  return {
    title: parsed.title ?? topic,
    content: parsed.content ?? '',
    tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5) : [],
    word_count: parsed.word_count ?? 0,
  }
}

// ─── Quiz Hint Generation ─────────────────────────────────────

export async function generateWordHint(word: string, meaning: string): Promise<string> {
  const prompt = `Give a short, memorable memory trick or mnemonic (1-2 sentences max) 
to remember the word "${word}" which means "${meaning}". 
Be creative, fun, and helpful. No JSON needed, just the hint text directly.`
  return callGemini(prompt)
}