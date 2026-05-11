/**
 * Gemini AI Service
 * Using gemini-2.5-flash via v1 stable endpoint
 * ADMIN ONLY — never call these from user-facing components without role check
 */

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
        topP: 0.95,
      },
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    console.error('Gemini API Error:', err)
    throw new Error(err?.error?.message ?? `Gemini API error: ${res.status}`)
  }

  const data = await res.json()
  const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  if (!text) throw new Error('Empty response from Gemini')
  return text.trim()
}

// Robust JSON extraction — strips markdown fences if model adds them
function extractJSON(raw: string): string {
  const match = raw.match(/\{[\s\S]*\}/)
  return match ? match[0] : raw
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
  const prompt = `Task: Generate vocabulary data for "${word}" for BCS/Bank Job exam prep.
Return ONLY a JSON object. No markdown, no explanation.

{
  "bangla_meaning": "Bengali meaning of the word",
  "english_meaning": "Clear English definition (1-2 sentences)",
  "synonyms": ["syn1", "syn2", "syn3", "syn4"],
  "antonyms": ["ant1", "ant2", "ant3"],
  "example": "A natural exam-style sentence using the word",
  "part_of_speech": "noun|verb|adjective|adverb|preposition|conjunction|interjection|pronoun",
  "pronunciation": "/phonetic-spelling/"
}`

  const raw    = await callGemini(prompt)
  const parsed = JSON.parse(extractJSON(raw)) as GeneratedWordData

  return {
    bangla_meaning: parsed.bangla_meaning  ?? '',
    english_meaning: parsed.english_meaning ?? '',
    synonyms:  Array.isArray(parsed.synonyms)  ? parsed.synonyms.slice(0, 5)  : [],
    antonyms:  Array.isArray(parsed.antonyms)  ? parsed.antonyms.slice(0, 4)  : [],
    example:   parsed.example        ?? '',
    part_of_speech: parsed.part_of_speech ?? 'noun',
    pronunciation:  parsed.pronunciation  ?? '',
  }
}

// ─── Focus Writing Generation ─────────────────────────────────

export type FocusLanguage = 'english' | 'bangla'

export interface GeneratedFocusWriting {
  title: string
  content: string
  tags: string[]
  word_count: number
}

export async function generateFocusWriting(
  topic: string,
  category: string,
  language: FocusLanguage = 'english'
): Promise<GeneratedFocusWriting> {
  const langInstruction =
    language === 'bangla'
      ? 'Write the ENTIRE content in Bengali (Bangla) script. Use formal Bengali suitable for BCS exam preparation.'
      : 'Write in formal English suitable for competitive exam preparation.'

  const prompt = `Task: Write a model focus writing / essay answer for competitive exam prep in Bangladesh.

Topic: "${topic}"
Category: ${category}
Language instruction: ${langInstruction}
Length: 250–350 words
Structure: Introduction → 3-4 body paragraphs covering key points → Conclusion

Return ONLY a valid JSON object. No markdown, no code fences.

{
  "title": "The topic title exactly as given",
  "content": "Full essay text here. Use \\n\\n between paragraphs.",
  "tags": ["tag1", "tag2", "tag3"],
  "word_count": 300
}`

  const raw    = await callGemini(prompt)
  const parsed = JSON.parse(extractJSON(raw)) as GeneratedFocusWriting

  return {
    title:      parsed.title      ?? topic,
    content:    parsed.content    ?? '',
    tags:       Array.isArray(parsed.tags) ? parsed.tags.slice(0, 6) : [],
    word_count: parsed.word_count ?? 0,
  }
}

// ─── Mnemonic Hint ────────────────────────────────────────────

export async function generateWordHint(word: string, meaning: string): Promise<string> {
  const prompt = `Give a single memorable mnemonic (1 sentence max) to remember that "${word}" means "${meaning}". Be creative and concise.`
  return callGemini(prompt)
}

// ─── Example Sentence Generation ─────────────────────────────
// Used for fill-in-the-blank. Generated ONCE per word, saved to DB.

export interface GeneratedExample {
  example: string        // sentence with the word used naturally
  verified: boolean      // true if the word literally appears in the sentence
}

export async function generateExampleSentence(
  word: string,
  meaning: string,
  partOfSpeech?: string
): Promise<GeneratedExample> {
  const prompt = `Generate ONE natural example sentence for the English word "${word}" (${partOfSpeech ?? 'word'}) which means "${meaning}".

Rules:
- The sentence must contain the EXACT word "${word}" (same form, not a variation)
- It should be exam-appropriate (BCS/GRE level)
- Between 10–20 words
- The word should appear mid-sentence so it can become a fill-in-the-blank

Return ONLY a JSON object, no markdown:
{"example": "Your sentence here."}`

  const raw    = await callGemini(prompt)
  const parsed = JSON.parse(extractJSON(raw)) as { example: string }
  const example = (parsed.example ?? '').trim()

  // Verify the word actually appears in the sentence
  const regex   = new RegExp(`\\b${word}\\b`, 'i')
  const verified = regex.test(example)

  return { example, verified }
}

// ─── Batch example generation for multiple words ──────────────
// Generates up to 5 words in one API call to save quota

export interface WordForExample {
  id: string
  word: string
  english_meaning: string
  part_of_speech?: string | null
}

export interface BatchExampleResult {
  word_id: string
  word: string
  example: string | null
  error?: string
}

export async function generateExamplesBatch(
  words: WordForExample[]
): Promise<BatchExampleResult[]> {
  const prompt = `Generate ONE natural example sentence for each English word below.
Each sentence MUST contain the exact word shown.
Sentences should be 10–20 words, exam-appropriate (BCS/GRE level).

Words:
${words.map((w, i) => `${i + 1}. "${w.word}" (${w.part_of_speech ?? 'word'}) — means: "${w.english_meaning}"`).join('\n')}

Return ONLY a JSON array matching the order above, no markdown:
[
  {"word": "word1", "example": "sentence1"},
  {"word": "word2", "example": "sentence2"}
]`

  const raw    = await callGemini(prompt)
  const parsed = JSON.parse(extractJSON(raw)) as { word: string; example: string }[]

  return words.map((w, i) => {
    const res   = parsed[i]
    const ex    = res?.example?.trim() ?? null
    // Verify word appears
    const regex = new RegExp(`\\b${w.word}\\b`, 'i')
    if (ex && regex.test(ex)) {
      return { word_id: w.id, word: w.word, example: ex }
    }
    // Word doesn't appear — try to splice it in as fallback
    if (ex) {
      return { word_id: w.id, word: w.word, example: ex, error: 'word may not appear verbatim' }
    }
    return { word_id: w.id, word: w.word, example: null, error: 'no example generated' }
  })
}
