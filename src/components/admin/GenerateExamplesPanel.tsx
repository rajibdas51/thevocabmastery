'use client'
import { useState, useEffect } from 'react'
import { getCategories, getWordsMissingExamples, bulkSaveExamples, countWordsWithExamples } from '@/lib/db'
import { generateExamplesBatch, type WordForExample } from '@/lib/gemini'
import { useToast } from '@/components/ui/Toast'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import ProgressBar from '@/components/ui/Progressbar'
import Card from '@/components/ui/Card'
import { Sparkles, CheckCircle, AlertCircle, Zap } from 'lucide-react'
import type { Category } from '@/types'

interface Log { type: 'success' | 'error' | 'info'; message: string }

export default function GenerateExamplesPanel() {
  const { add: toast } = useToast()
  const [categories,    setCategories]    = useState<Category[]>([])
  const [catId,         setCatId]         = useState('')
  const [missing,       setMissing]       = useState<number | null>(null)
  const [withExamples,  setWithExamples]  = useState<number | null>(null)
  const [batchSize,     setBatchSize]     = useState('5')
  const [running,       setRunning]       = useState(false)
  const [progress,      setProgress]      = useState(0)
  const [total,         setTotal]         = useState(0)
  const [logs,          setLogs]          = useState<Log[]>([])

  useEffect(() => {
    getCategories().then(({ data }) => {
      setCategories(data ?? [])
      if (data?.[0]) setCatId(data[0].id)
    })
  }, [])

  useEffect(() => {
    if (!catId) return
    setMissing(null); setWithExamples(null)
    Promise.all([
      getWordsMissingExamples(catId, 500),
      countWordsWithExamples(catId),
    ]).then(([m, w]) => {
      setMissing(m.data?.length ?? 0)
      setWithExamples(w)
    })
  }, [catId])

  const addLog = (log: Log) => setLogs(prev => [log, ...prev].slice(0, 100))

  const handleGenerate = async () => {
    if (!catId) return
    setRunning(true); setProgress(0); setLogs([])

    const { data: wordsToProcess } = await getWordsMissingExamples(catId, 200)
    if (!wordsToProcess?.length) {
      toast('All words in this category already have examples!', 'success')
      setRunning(false); return
    }

    const batch = parseInt(batchSize) || 5
    setTotal(wordsToProcess.length)
    addLog({ type: 'info', message: `Starting generation for ${wordsToProcess.length} words in batches of ${batch}…` })

    let saved = 0, failed = 0

    // Process in batches to respect free-tier rate limits
    // Free tier: ~15 RPM → batch of 5 words per call, 1 call per 4 seconds = safe
    const chunks: WordForExample[][] = []
    for (let i = 0; i < wordsToProcess.length; i += batch) {
      chunks.push(wordsToProcess.slice(i, i + batch).map((w: any) => ({
        id: w.id, word: w.word,
        english_meaning: w.english_meaning,
        part_of_speech: w.part_of_speech,
      })))
    }

    for (let ci = 0; ci < chunks.length; ci++) {
      const chunk = chunks[ci]
      try {
        addLog({ type: 'info', message: `Batch ${ci + 1}/${chunks.length}: generating for "${chunk.map(w => w.word).join('", "')}"…` })

        const results = await generateExamplesBatch(chunk)
        const toSave  = results.filter(r => r.example).map(r => ({ id: r.word_id, example: r.example! }))
        const toFail  = results.filter(r => !r.example)

        if (toSave.length) {
          await bulkSaveExamples(toSave)
          saved += toSave.length
          toSave.forEach(s => {
            const w = results.find(r => r.word_id === s.id)
            addLog({ type: 'success', message: `✓ ${w?.word}: "${s.example}"` })
          })
        }
        toFail.forEach(r => {
          failed++
          addLog({ type: 'error', message: `✗ ${r.word}: ${r.error ?? 'failed'}` })
        })

        setProgress(Math.round(((ci + 1) / chunks.length) * 100))

        // Rate limit buffer between batches (4 seconds for free tier safety)
        if (ci < chunks.length - 1) {
          addLog({ type: 'info', message: `⏳ Waiting 4s to respect API rate limits…` })
          await new Promise(r => setTimeout(r, 4000))
        }
      } catch (err: any) {
        addLog({ type: 'error', message: `Batch ${ci + 1} error: ${err.message}` })
        failed += chunk.length
        // Wait longer if rate-limited
        if (err.message?.includes('429') || err.message?.toLowerCase().includes('quota')) {
          addLog({ type: 'info', message: '⏳ Rate limit hit. Waiting 30 seconds…' })
          await new Promise(r => setTimeout(r, 30000))
        }
      }
    }

    // Refresh counts
    const [m, w] = await Promise.all([getWordsMissingExamples(catId, 500), countWordsWithExamples(catId)])
    setMissing(m.data?.length ?? 0)
    setWithExamples(w)

    addLog({ type: 'info', message: `─── Done! Saved: ${saved}, Failed: ${failed} ───` })
    toast(`Generated ${saved} examples! ${failed} failed.`, saved > 0 ? 'success' : 'error')
    setRunning(false)
  }

  const cat = categories.find(c => c.id === catId)
  const totalWords = (missing ?? 0) + (withExamples ?? 0)
  const coveragePct = totalWords ? Math.round(((withExamples ?? 0) / totalWords) * 100) : 0

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5" style={{ color: 'var(--accent2)' }} />
        <h3 className="font-semibold" style={{ color: 'var(--text)' }}>Generate Example Sentences</h3>
      </div>

      <p className="text-sm" style={{ color: 'var(--text2)' }}>
        Automatically generate fill-in-the-blank example sentences using Gemini AI.
        Generated sentences are <strong>saved permanently</strong> to each word — 
        future quizzes use the stored sentences with zero API calls.
      </p>

      {/* Config */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Category"
          value={catId}
          onChange={setCatId}
          options={categories.map(c => ({ value: c.id, label: c.name }))}
        />
        <Select
          label="Batch Size (words per API call)"
          value={batchSize}
          onChange={setBatchSize}
          options={[
            { value: '3', label: '3 — Very safe (slow)' },
            { value: '5', label: '5 — Recommended' },
            { value: '8', label: '8 — Faster (may hit limits)' },
          ]}
        />
      </div>

      {/* Coverage stats */}
      {catId && (
        <div className="p-4 rounded-xl border space-y-3"
          style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between text-sm">
            <span style={{ color: 'var(--text2)' }}>
              {cat?.name} — example sentence coverage
            </span>
            <span className="font-mono font-bold" style={{ color: 'var(--text)' }}>
              {withExamples ?? '…'} / {totalWords || '…'}
            </span>
          </div>
          <ProgressBar value={coveragePct} />
          <div className="flex gap-4 text-xs">
            <span className="text-emerald-500">✓ {withExamples ?? '…'} have examples</span>
            <span className="text-amber-400">⚠ {missing ?? '…'} missing — will be generated</span>
          </div>

          {missing === 0 && withExamples !== null && (
            <div className="flex items-center gap-2 text-emerald-500 text-sm font-medium">
              <CheckCircle className="w-4 h-4" />
              All words have examples! Fill-in-the-blank is fully ready for this category.
            </div>
          )}
        </div>
      )}

      {/* Rate limit info */}
      <div className="flex items-start gap-2.5 p-3 rounded-xl border"
        style={{ background: 'var(--accent)' + '0d', borderColor: 'var(--accent)' + '25' }}>
        <Zap className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--accent2)' }} />
        <div className="text-xs space-y-0.5" style={{ color: 'var(--text2)' }}>
          <p><strong style={{ color: 'var(--text)' }}>Free tier safe:</strong> 4-second pause between batches keeps usage within Gemini free limits (~15 RPM).</p>
          <p>100 words ≈ 20 API calls ≈ ~1.5 minutes. Run once — results are permanent.</p>
        </div>
      </div>

      {/* Generate button */}
      <Button
        onClick={handleGenerate}
        loading={running}
        disabled={running || missing === 0}
        className="w-full"
        size="lg"
      >
        <Sparkles className="w-4 h-4" />
        {running
          ? `Generating… (${progress}%)`
          : missing === 0
          ? 'All examples already generated ✓'
          : `Generate Examples for ${missing ?? '…'} Words`}
      </Button>

      {/* Progress bar during run */}
      {running && (
        <div>
          <div className="flex justify-between text-xs mb-1.5" style={{ color: 'var(--text3)' }}>
            <span>Progress</span><span>{progress}%</span>
          </div>
          <ProgressBar value={progress} />
        </div>
      )}

      {/* Log output */}
      {logs.length > 0 && (
        <div
          className="rounded-xl border p-3 max-h-64 overflow-y-auto font-mono text-xs space-y-1"
          style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
        >
          {logs.map((log, i) => (
            <div key={i} className={
              log.type === 'success' ? 'text-emerald-500'
              : log.type === 'error' ? 'text-red-400'
              : 'text-[var(--text3)]'
            }>
              {log.message}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
