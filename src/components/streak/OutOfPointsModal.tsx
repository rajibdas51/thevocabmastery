'use client'
/**
 * FILE: src/components/streak/OutOfPointsModal.tsx
 *
 * Shown when free user runs out of daily points.
 * Options: Watch ad (refill 5 pts) | Go Premium | Come back tomorrow.
 *
 * INTEGRATION: import and render in quiz/fill-blank pages.
 * Show when deductPoint() returns out_of_points=true.
 */
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { watchAd } from '@/lib/streak'
import { useAuthStore } from '@/store/auth'
import { useStreakStore } from '@/store/streak'
import { useToast } from '@/components/ui/Toast'
import Button from '@/components/ui/Button'
import { useRouter } from 'next/navigation'
import { PLAN_CONFIG } from '@/types/streak'

interface OutOfPointsModalProps {
  open:    boolean
  onClose: () => void
  onAdWatched?: () => void   // called when points are successfully refilled
}

// Simulated ad — replace with real ad SDK (Google AdMob, AdSense, etc.)
function SimulatedAd({ onComplete, onSkip }: { onComplete: () => void; onSkip: () => void }) {
  const [seconds, setSeconds] = useState(5)

  useState(() => {
    const t = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) { clearInterval(t); return 0 }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(t)
  })

  return (
    <div className="text-center space-y-4">
      <div className="rounded-xl overflow-hidden"
        style={{ background: 'var(--bg3)', border: '1px solid var(--border)', height: '200px' }}>
        <div className="h-full flex flex-col items-center justify-center gap-2">
          <div className="text-3xl">📺</div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
            Advertisement
          </p>
          <p className="text-xs" style={{ color: 'var(--text3)' }}>
            {/* Replace this with your actual ad component */}
            Your ad integration here (Google AdSense / AdMob)
          </p>
          {seconds > 0 && (
            <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold"
              style={{ borderColor: 'var(--accent)', color: 'var(--accent2)' }}>
              {seconds}
            </div>
          )}
        </div>
      </div>
      <Button
        onClick={onComplete}
        disabled={seconds > 0}
        className="w-full"
      >
        {seconds > 0 ? `Watch for ${seconds}s...` : '✓ Claim +5 Points'}
      </Button>
      <button onClick={onSkip} className="text-xs" style={{ color: 'var(--text3)' }}>
        No thanks, come back tomorrow
      </button>
    </div>
  )
}

export default function OutOfPointsModal({ open, onClose, onAdWatched }: OutOfPointsModalProps) {
  const router      = useRouter()
  const { profile } = useAuthStore()
  const { refresh, streak, config } = useStreakStore()
  const { add: toast } = useToast()
  const [view, setView] = useState<'menu' | 'ad'>('menu')
  const [loading, setLoading] = useState(false)

  if (!open || typeof document === 'undefined') return null

  const maxAds = config?.max_ads_per_day ?? 3
  const adPts  = config?.ad_reward_points ?? 5

  const handleAdComplete = async () => {
    if (!profile) return
    setLoading(true)
    const result = await watchAd(profile.id)
    setLoading(false)
    if (result.success) {
      await refresh(profile.id)
      toast(`+${result.points_added} points! Keep going 🔥`, 'success')
      setView('menu')
      onAdWatched?.()
      onClose()
    } else {
      toast(result.reason, 'error')
      setView('menu')
    }
  }

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.70)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6 animate-fade-up"
        style={{
          background:  'var(--modal-bg)',
          border:      '1px solid var(--border2)',
          boxShadow:   '0 25px 60px rgba(0,0,0,0.4)',
        }}
      >
        {view === 'ad' ? (
          <SimulatedAd onComplete={handleAdComplete} onSkip={() => setView('menu')} />
        ) : (
          <div className="text-center space-y-5">
            {/* Icon */}
            <div className="text-5xl">💔</div>

            <div>
              <h2 className="font-playfair text-2xl font-black" style={{ color: 'var(--text)' }}>
                Out of Points!
              </h2>
              <p className="text-sm mt-2" style={{ color: 'var(--text2)' }}>
                You've used all {streak?.max_points ?? 10} daily points.
                Come back tomorrow for a fresh start!
              </p>
            </div>

            {/* Options */}
            <div className="space-y-3">
              {/* Watch ad */}
              <button
                onClick={() => setView('ad')}
                className="w-full p-4 rounded-xl border text-left transition-all hover:-translate-y-0.5"
                style={{
                  background:  'rgba(34,211,160,0.06)',
                  borderColor: 'rgba(34,211,160,0.25)',
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📺</span>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
                      Watch a short ad
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text3)' }}>
                      Get +{adPts} points free · Up to {maxAds}× per day
                    </p>
                  </div>
                  <div className="ml-auto px-2 py-1 rounded-lg text-xs font-bold"
                    style={{ background: 'rgba(34,211,160,0.12)', color: '#22d3a0' }}>
                    FREE
                  </div>
                </div>
              </button>

              {/* Go premium */}
              <button
                onClick={() => { router.push('/premium'); onClose() }}
                className="w-full p-4 rounded-xl border text-left transition-all hover:-translate-y-0.5"
                style={{
                  background:  'rgba(124,106,247,0.08)',
                  borderColor: 'rgba(124,106,247,0.30)',
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">⚡</span>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
                      Upgrade to Premium
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text3)' }}>
                      Unlimited points · No ads · From ৳{PLAN_CONFIG.monthly.price_bdt}/mo
                    </p>
                  </div>
                  <div className="ml-auto px-2 py-1 rounded-lg text-xs font-bold"
                    style={{ background: 'rgba(124,106,247,0.15)', color: 'var(--accent2)' }}>
                    BEST
                  </div>
                </div>
              </button>

              {/* Come back tomorrow */}
              <button
                onClick={onClose}
                className="w-full py-3 text-sm font-medium"
                style={{ color: 'var(--text3)' }}
              >
                Come back tomorrow 📅
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
