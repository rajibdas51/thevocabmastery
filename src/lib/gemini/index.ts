/**
 * Gemini AI Service - Fixed for May 2026
 * Using the stable v1 endpoint with the high-performance Gemini 2.5 Flash model.
 */

// OPTION A (Most Stable): gemini-2.5-flash
// OPTION B (Latest Preview): gemini-3-flash-preview (Use v1beta for this)
const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent'

async function callGemini(prompt: string): Promise<string> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY
  if (!apiKey) throw new Error('NEXT_PUBLIC_GEMINI_API_KEY is not set in .env.local')

  const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { 
        temperature: 0.1, 
        maxOutputTokens: 2048,
        topP: 0.95
      },
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    // This will now print the exact model list if it fails again
    console.error('API Error:', err)
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
  const prompt = `Task: Generate vocabulary data for "${word}" for BCS/Bank Job prep.
Return ONLY a JSON object. No markdown.

{
  "bangla_meaning": "Bengali meaning",
  "english_meaning": "English definition",
  "synonyms": ["syn1", "syn2"],
  "antonyms": ["ant1", "ant2"],
  "example": "Exam style sentence",
  "part_of_speech": "noun|verb|adjective|adverb",
  "pronunciation": "/phonetic/"
}`

  const raw = await callGemini(prompt)
  
  // Robust JSON extraction logic
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  const clean = jsonMatch ? jsonMatch[0] : raw;
  
  try {
    const parsed = JSON.parse(clean) as GeneratedWordData
    return {
      bangla_meaning: parsed.bangla_meaning || '',
      english_meaning: parsed.english_meaning || '',
      synonyms: Array.isArray(parsed.synonyms) ? parsed.synonyms.slice(0, 5) : [],
      antonyms: Array.isArray(parsed.antonyms) ? parsed.antonyms.slice(0, 4) : [],
      example: parsed.example || '',
      part_of_speech: parsed.part_of_speech || 'noun',
      pronunciation: parsed.pronunciation || '',
    }
  } catch (e) {
    throw new Error("Invalid JSON format from AI")
  }
}

// ─── Focus Writing ──────────────────────────────────────────

export interface GeneratedFocusWriting {
  title: string
  content: string
  tags: string[]
  word_count: number
}

export async function generateFocusWriting(topic: string, category: string): Promise<GeneratedFocusWriting> {
  const prompt = `Task: Formal Focus Writing (250-350 words).
Topic: "${topic}" (${category})
Output: Return ONLY a JSON object: {"title": "...", "content": "...", "tags": [], "word_count": 0}`

  const raw = await callGemini(prompt)
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  const clean = jsonMatch ? jsonMatch[0] : raw;
  
  try {
    const parsed = JSON.parse(clean) as GeneratedFocusWriting
    return {
      title: parsed.title || topic,
      content: parsed.content || '',
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      word_count: parsed.word_count || 0
    }
  } catch (e) {
    throw new Error("Failed to generate focus writing.")
  }
}

// ─── Mnemonic Hint ─────────────────────────────────────

export async function generateWordHint(word: string, meaning: string): Promise<string> {
  const prompt = `Give a 1-sentence mnemonic to remember "${word}" means "${meaning}".`
  return callGemini(prompt)
}