'use client'
/**
 * FILE: src/app/(app)/premium/page.tsx
 * Path: src/app/(app)/premium/page.tsx
 *
 * The premium subscription / pricing page.
 * Also add to Sidebar nav under "Account" section.
 */
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { useStreakStore } from '@/store/streak'
import { useToast } from '@/components/ui/Toast'
import { isPremiumPlan } from '@/lib/streak'
import PageHeader from '@/components/layout/PageHeader'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { PLAN_CONFIG, LEAGUE_CONFIG } from '@/types/streak'
import { formatDate } from '@/lib/utils'
import { Check, Zap, Crown, Shield } from 'lucide-react'

const FEATURES_FREE = [
  '10 daily points',
  'All quiz types',
  'Flashcards & fill-blank',
  'Basic streak tracking',
  'Watch ads to refill (3×/day)',
]

const FEATURES_PREMIUM = [
  'Unlimited daily points',
  'No ads, ever',
  'All quiz types + priority',
  'Advanced streak analytics',
  'Streak freeze inventory',
  'League & leaderboard access',
  'Priority support',
]

type PlanKey = 'monthly' | 'biannual' | 'annual'

function PremiumContent() {
  const searchParams  = useSearchParams()
  const router        = useRouter()
  const { profile }   = useAuthStore()
  const { streak, refresh } = useStreakStore()
  const { add: toast } = useToast()
  const [loading, setLoading] = useState<PlanKey | null>(null)

  const status = searchParams.get('status')

  useEffect(() => {
    if (!profile) return
    if (status === 'success') {
      refresh(profile.id)
      toast('🎉 Premium activated! Enjoy unlimited learning!', 'success')
    } else if (status === 'failed') {
      toast('Payment failed. Please try again.', 'error')
    } else if (status === 'cancelled') {
      toast('Payment cancelled.', 'info')
    }
  }, [status])

  const handleSubscribe = async (plan: PlanKey) => {
    setLoading(plan)
    try {
      const res = await fetch('/api/payment/initiate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      // Redirect to SSLCommerz gateway
      window.location.href = data.payment_url
    } catch (err: any) {
      toast(err.message ?? 'Payment initiation failed', 'error')
      setLoading(null)
    }
  }

  const isPremium     = streak ? isPremiumPlan(streak.subscription_plan) : false
  const expiresAt     = streak?.subscription_expires_at
  const currentPlan   = streak?.subscription_plan ?? 'free'

  const plans: { key: PlanKey; saving?: string }[] = [
    { key: 'monthly' },
    { key: 'biannual', saving: 'Save 17%' },
    { key: 'annual',   saving: 'Save 17%' },
  ]

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="VocabMaster Premium"
        subtitle="Unlimited learning — no interruptions, no limits"
      />

      <div className="p-4 sm:p-8 max-w-4xl">
        {/* Current plan banner */}
        {isPremium && (
          <div
            className="mb-6 p-4 rounded-2xl border flex items-center gap-4"
            style={{
              background:  'rgba(124,106,247,0.08)',
              borderColor: 'rgba(124,106,247,0.30)',
            }}
          >
            <Crown className="w-8 h-8 flex-shrink-0" style={{ color: 'var(--accent2)' }} />
            <div>
              <p className="font-semibold" style={{ color: 'var(--text)' }}>
                You&apos;re on Premium {PLAN_CONFIG[currentPlan].label}!
              </p>
              {expiresAt && (
                <p className="text-sm mt-0.5" style={{ color: 'var(--text2)' }}>
                  Renews on {formatDate(expiresAt)}
                </p>
              )}
            </div>
            <Badge variant="purple" className="ml-auto flex-shrink-0">Active</Badge>
          </div>
        )}

        {/* Free vs Premium comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {/* Free plan */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">🆓</span>
              <div>
                <p className="font-semibold" style={{ color: 'var(--text)' }}>Free</p>
                <p className="text-2xl font-playfair font-black" style={{ color: 'var(--text)' }}>
                  ৳0
                </p>
              </div>
            </div>
            <ul className="space-y-2.5">
              {FEATURES_FREE.map(f => (
                <li key={f} className="flex items-center gap-2 text-sm" style={{ color: 'var(--text2)' }}>
                  <Check className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text3)' }} />
                  {f}
                </li>
              ))}
            </ul>
            {!isPremium && (
              <div className="mt-4 px-4 py-2 rounded-xl text-sm text-center font-semibold"
                style={{ background: 'var(--bg3)', color: 'var(--text3)' }}>
                Current Plan
              </div>
            )}
          </Card>

          {/* Premium plan */}
          <Card accent="var(--accent)" className="p-5 relative">
            <div className="absolute -top-3 right-4">
              <span className="px-3 py-1 rounded-full text-xs font-bold text-white"
                style={{ background: 'var(--accent)' }}>
                RECOMMENDED
              </span>
            </div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">⚡</span>
              <div>
                <p className="font-semibold" style={{ color: 'var(--text)' }}>Premium</p>
                <p className="text-2xl font-playfair font-black" style={{ color: 'var(--accent2)' }}>
                  From ৳100/mo
                </p>
              </div>
            </div>
            <ul className="space-y-2.5">
              {FEATURES_PREMIUM.map(f => (
                <li key={f} className="flex items-center gap-2 text-sm" style={{ color: 'var(--text)' }}>
                  <Check className="w-4 h-4 flex-shrink-0 text-emerald-500" />
                  {f}
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* Pricing cards */}
        <h2 className="font-playfair text-xl font-black mb-4" style={{ color: 'var(--text)' }}>
          Choose Your Plan
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {plans.map(({ key, saving }) => {
            const plan      = PLAN_CONFIG[key]
            const isPopular = plan.popular
            const isCurrent = currentPlan === key && isPremium

            return (
              <div
                key={key}
                className="rounded-2xl border p-5 relative"
                style={{
                  background:  isPopular ? 'rgba(124,106,247,0.06)' : 'var(--card-bg)',
                  borderColor: isPopular ? 'rgba(124,106,247,0.40)' : 'var(--border)',
                  boxShadow:   isPopular ? '0 0 30px rgba(124,106,247,0.10)' : 'none',
                }}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 rounded-full text-xs font-bold text-white"
                      style={{ background: 'var(--accent)' }}>
                      BEST VALUE
                    </span>
                  </div>
                )}
                {saving && (
                  <div className="absolute top-3 right-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold"
                      style={{ background: '#22d3a015', color: '#22d3a0', border: '1px solid #22d3a030' }}>
                      {saving}
                    </span>
                  </div>
                )}

                <p className="font-semibold mb-1" style={{ color: 'var(--text)' }}>{plan.label}</p>
                <p className="font-playfair text-3xl font-black mb-1"
                  style={{ color: isPopular ? 'var(--accent2)' : 'var(--text)' }}>
                  ৳{plan.price_bdt}
                </p>
                <p className="text-xs mb-4" style={{ color: 'var(--text3)' }}>
                  {plan.duration_days} days · {plan.description}
                </p>

                {isCurrent ? (
                  <div className="w-full py-2 rounded-xl text-sm text-center font-semibold"
                    style={{ background: 'var(--bg3)', color: 'var(--text3)' }}>
                    Current Plan ✓
                  </div>
                ) : (
                  <Button
                    className="w-full"
                    variant={isPopular ? 'primary' : 'secondary'}
                    loading={loading === key}
                    onClick={() => handleSubscribe(key)}
                  >
                    <Zap className="w-4 h-4" />
                    {isPremium ? 'Switch Plan' : 'Subscribe'}
                  </Button>
                )}
              </div>
            )
          })}
        </div>

        {/* Trust signals */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: <Shield className="w-5 h-5" />, title: 'Secure Payment', desc: 'Powered by SSLCommerz — Bangladesh\'s #1 payment gateway' },
            { icon: <Zap className="w-5 h-5" />,    title: 'Instant Activation', desc: 'Premium activates immediately after payment' },
            { icon: <Crown className="w-5 h-5" />,  title: 'Cancel Anytime', desc: 'No hidden fees. Contact support to cancel.' },
          ].map(t => (
            <div key={t.title} className="flex items-start gap-3 p-4 rounded-xl"
              style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--accent2)' }}>{t.icon}</span>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{t.title}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>{t.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function PremiumPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center" style={{ color: 'var(--text3)' }}>Loading...</div>}>
      <PremiumContent />
    </Suspense>
  )
}
