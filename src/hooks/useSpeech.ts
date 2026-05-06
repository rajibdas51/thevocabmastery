/**
 * useSpeech — Text-to-Speech hook
 *
 * Strategy for picking a natural-sounding voice:
 *  1. Prefer voices whose name contains "Natural", "Neural", "Premium",
 *     "Enhanced", "Samantha", "Daniel", "Google" — these are consistently
 *     the best-quality voices across platforms.
 *  2. Among qualifying voices, prefer online/network voices (isLocalService=false)
 *     which are usually the high-quality cloud voices (e.g. Google TTS).
 *  3. Fall back to any voice matching the accent, then any English voice.
 *
 * This avoids the robotic default Microsoft/system voices that browsers
 * sometimes select for en-US.
 */

import { useEffect, useRef, useCallback } from 'react'

// Score a voice — higher = better quality
function scoreVoice(v: SpeechSynthesisVoice): number {
  let score = 0
  const name = v.name.toLowerCase()

  // High-quality voice name signals
  if (name.includes('natural'))  score += 40
  if (name.includes('neural'))   score += 40
  if (name.includes('premium'))  score += 35
  if (name.includes('enhanced')) score += 30
  if (name.includes('google'))   score += 25   // Google voices are consistently good
  if (name.includes('siri'))     score += 20
  // Known good macOS / iOS voices
  if (name.includes('samantha')) score += 20   // macOS US — very natural
  if (name.includes('daniel'))   score += 20   // macOS UK — very natural
  if (name.includes('karen'))    score += 15
  if (name.includes('moira'))    score += 15
  // Avoid robotic ones
  if (name.includes('zira'))     score -= 20   // Windows robotic
  if (name.includes('david'))    score -= 20   // Windows robotic
  if (name.includes('mark'))     score -= 15

  // Cloud voices (not local) tend to be higher quality
  if (!v.localService) score += 10

  return score
}

function pickVoice(
  voices: SpeechSynthesisVoice[],
  accent: 'en-US' | 'en-GB'
): SpeechSynthesisVoice | null {
  const tag    = accent                           // 'en-US' or 'en-GB'
  const prefix = accent.split('-')[0]             // 'en'

  // Candidates by precision
  const exact  = voices.filter(v => v.lang === tag)
  const approx = voices.filter(v => v.lang.startsWith(tag))
  const anyEn  = voices.filter(v => v.lang.startsWith(prefix))

  const pool = exact.length ? exact : approx.length ? approx : anyEn
  if (!pool.length) return null

  // Sort by quality score, pick the best
  const sorted = [...pool].sort((a, b) => scoreVoice(b) - scoreVoice(a))
  return sorted[0]
}

export function useSpeech() {
  const voicesRef = useRef<SpeechSynthesisVoice[]>([])
  const loadedRef = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return

    const load = () => {
      const v = window.speechSynthesis.getVoices()
      if (v.length) { voicesRef.current = v; loadedRef.current = true }
    }

    load()
    window.speechSynthesis.addEventListener('voiceschanged', load)
    // Some browsers need a tiny delay
    const t = setTimeout(load, 200)

    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', load)
      clearTimeout(t)
    }
  }, [])

  const speak = useCallback((text: string, accent: 'en-US' | 'en-GB') => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    window.speechSynthesis.cancel()

    const utt   = new SpeechSynthesisUtterance(text)
    utt.lang    = accent
    utt.rate    = 0.88
    utt.pitch   = 1.0
    utt.volume  = 1.0

    const voice = pickVoice(voicesRef.current, accent)
    if (voice) utt.voice = voice

    // Workaround: some browsers cut off speech after ~15s — re-trigger
    const resume = setInterval(() => {
      if (!window.speechSynthesis.speaking) { clearInterval(resume); return }
      window.speechSynthesis.pause()
      window.speechSynthesis.resume()
    }, 10000)

    utt.onend = () => clearInterval(resume)

    window.speechSynthesis.speak(utt)
  }, [])

  return speak
}