'use client'
/**
 * FILE: src/components/admin/PointSystemConfig.tsx
 * Path: src/components/admin/PointSystemConfig.tsx
 *
 * Admin panel tab — edit point system rules and subscription prices.
 * Rendered inside the admin page under a new "Points & Pricing" tab.
 */
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import type { PointSystemConfig } from '@/types/streak'
import { Settings, DollarSign, Heart, Tv } from 'lucide-react'

export default function PointSystemConfigPanel() {
  const { add: toast } = useToast()
  const [config, setConfig] = useState<PointSystemConfig | null>(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const db = createClient()
    db.from('point_system_config')
      .select('*')
      .eq('id', 'singleton')
      .single()
      .then(({ data }) => {
        if (data) setConfig(data as PointSystemConfig)
        setLoading(false)
      })
  }, [])

  const handleSave = async () => {
    if (!config) return
    setSaving(true)
    const db = createClient()
    const { error } = await db
      .from('point_system_config')
      .update({
        free_daily_points:       config.free_daily_points,
        premium_daily_points:    config.premium_daily_points,
        points_lost_per_mistake: config.points_lost_per_mistake,
        ad_reward_points:        config.ad_reward_points,
        max_ads_per_day:         config.max_ads_per_day,
        price_monthly:           config.price_monthly,
        price_biannual:          config.price_biannual,
        price_annual:            config.price_annual,
      })
      .eq('id', 'singleton')

    setSaving(false)
    if (error) { toast(error.message, 'error'); return }
    toast('Point system config saved!', 'success')
  }

  const set = (key: keyof PointSystemConfig, value: number) =>
    setConfig(c => c ? { ...c, [key]: value } : c)

  if (loading) return <div className="skeleton h-64 rounded-2xl" />
  if (!config) return <p style={{ color: 'var(--text3)' }}>Config not found. Run streak_schema.sql first.</p>

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Points rules */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-5">
          <Heart className="w-4 h-4" style={{ color: 'var(--red)' }} />
          <h3 className="font-semibold" style={{ color: 'var(--text)' }}>Daily Points System</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Free User Daily Points"
            type="number" min={1} max={100}
            value={config.free_daily_points}
            onChange={e => set('free_daily_points', parseInt(e.target.value) || 10)}
            hint="Points free users get each day"
          />
          <Input
            label="Premium User Daily Points"
            type="number" min={1} max={9999}
            value={config.premium_daily_points}
            onChange={e => set('premium_daily_points', parseInt(e.target.value) || 999)}
            hint="Set high (999) for 'unlimited'"
          />
          <Input
            label="Points Lost Per Mistake"
            type="number" min={0} max={10}
            value={config.points_lost_per_mistake}
            onChange={e => set('points_lost_per_mistake', parseInt(e.target.value) || 1)}
            hint="Deducted on each wrong answer"
          />
        </div>
      </Card>

      {/* Ad system */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-5">
          <Tv className="w-4 h-4" style={{ color: 'var(--accent2)' }} />
          <h3 className="font-semibold" style={{ color: 'var(--text)' }}>Ad Refill System</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Points Rewarded Per Ad"
            type="number" min={1} max={50}
            value={config.ad_reward_points}
            onChange={e => set('ad_reward_points', parseInt(e.target.value) || 5)}
            hint="Points given after watching an ad"
          />
          <Input
            label="Max Ads Per Day"
            type="number" min={1} max={20}
            value={config.max_ads_per_day}
            onChange={e => set('max_ads_per_day', parseInt(e.target.value) || 3)}
            hint="How many ads a user can watch daily"
          />
        </div>
      </Card>

      {/* Subscription pricing */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-5">
          <DollarSign className="w-4 h-4" style={{ color: 'var(--gold)' }} />
          <h3 className="font-semibold" style={{ color: 'var(--text)' }}>Subscription Prices (BDT ৳)</h3>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Input
            label="Monthly Price (৳)"
            type="number" min={1}
            value={config.price_monthly}
            onChange={e => set('price_monthly', parseInt(e.target.value) || 100)}
            hint="30 days"
          />
          <Input
            label="6-Month Price (৳)"
            type="number" min={1}
            value={config.price_biannual}
            onChange={e => set('price_biannual', parseInt(e.target.value) || 500)}
            hint="180 days"
          />
          <Input
            label="Annual Price (৳)"
            type="number" min={1}
            value={config.price_annual}
            onChange={e => set('price_annual', parseInt(e.target.value) || 1000)}
            hint="365 days"
          />
        </div>

        {/* Preview savings */}
        <div className="mt-4 p-3 rounded-xl flex gap-6 text-xs"
          style={{ background: 'var(--bg3)', color: 'var(--text3)' }}>
          <span>Monthly: ৳{config.price_monthly}/mo</span>
          <span>6-Month: ৳{(config.price_biannual / 6).toFixed(0)}/mo</span>
          <span>Annual: ৳{(config.price_annual / 12).toFixed(0)}/mo</span>
        </div>
      </Card>

      <Button onClick={handleSave} loading={saving} size="lg" className="w-full">
        <Settings className="w-4 h-4" />
        Save Configuration
      </Button>

      <p className="text-xs text-center" style={{ color: 'var(--text3)' }}>
        Changes take effect immediately for all new sessions. Existing sessions reset at midnight.
      </p>
    </div>
  )
}