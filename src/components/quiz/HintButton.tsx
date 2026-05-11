'use client'
import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

interface HintButtonProps {
  hint: string
  label?: string
}

/**
 * Shows a "Reveal Hint" button. The hint stays hidden until the user
 * explicitly clicks — so the quiz/fill-blank challenge is not spoiled.
 * Resets automatically when the parent re-mounts (key={current}).
 */
export default function HintButton({ hint, label = 'Reveal Hint' }: HintButtonProps) {
  const [shown, setShown] = useState(false)

  return (
    <div className="mt-2 mb-1">
      {!shown ? (
        <button
          onClick={() => setShown(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all"
          style={{
            background:   'var(--bg3)',
            borderColor:  'var(--border2)',
            color:        'var(--text3)',
          }}
        >
          <Eye className="w-3 h-3" />
          {label}
        </button>
      ) : (
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold"
          style={{
            background:  'rgba(245,200,66,0.10)',
            borderColor: 'rgba(245,200,66,0.30)',
          }}
        >
          <span style={{ color: 'var(--text3)' }}>Hint:</span>
          <span style={{ color: 'var(--gold)' }}>{hint}</span>
          <button
            onClick={() => setShown(false)}
            className="ml-1 opacity-50 hover:opacity-100 transition-opacity"
            style={{ color: 'var(--text3)' }}
            title="Hide hint"
          >
            <EyeOff className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  )
}
