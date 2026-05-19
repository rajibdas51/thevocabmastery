/**
 * FILE: src/app/api/payment/success/route.ts
 * SSLCommerz redirects here after successful payment.
 * Also used as IPN (server-to-server notification) endpoint.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const VALIDATE_SANDBOX = 'https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php'
const VALIDATE_LIVE    = 'https://securepay.sslcommerz.com/validator/api/validationserverAPI.php'

const PLAN_AMOUNTS: Record<string, number> = {
  monthly: 100, biannual: 500, annual: 1000,
}
const PLAN_DAYS: Record<string, number> = {
  monthly: 30, biannual: 180, annual: 365,
}

async function activateSubscription(
  supabase: any,
  userId: string,
  plan: string,
  paymentRef: string,
) {
  const days    = PLAN_DAYS[plan] ?? 30
  const expires = new Date()
  expires.setUTCDate(expires.getUTCDate() + days)

  // Get current config for premium points value
  const { data: config } = await supabase
    .from('point_system_config')
    .select('premium_daily_points')
    .eq('id', 'singleton')
    .single()

  const premiumPoints = config?.premium_daily_points ?? 999

  await Promise.all([
    // Record the subscription
    supabase.from('subscriptions').insert({
      user_id:     userId,
      plan,
      status:      'active',
      expires_at:  expires.toISOString(),
      payment_ref: paymentRef,
      amount_bdt:  PLAN_AMOUNTS[plan] ?? 0,
    }),
    // Upgrade the user streak row
    supabase.from('user_streaks').update({
      subscription_plan:       plan,
      subscription_expires_at: expires.toISOString(),
      current_points:          premiumPoints,
      max_points:              premiumPoints,
    }).eq('user_id', userId),
  ])
}

async function handlePayment(formData: FormData) {
  const valId  = formData.get('val_id')?.toString()
  const userId = formData.get('value_a')?.toString()
  const plan   = formData.get('value_b')?.toString()
  const tranId = formData.get('value_c')?.toString()
  const status = formData.get('status')?.toString()

  // SSLCommerz sends status=VALID for IPN, status=success for redirect
  if (status && !['VALID', 'VALIDATED', 'Valid'].includes(status) && status !== 'success') {
    return { success: false, reason: `Payment status: ${status}` }
  }

  if (!valId || !userId || !plan) {
    return { success: false, reason: 'Missing required fields' }
  }

  const isLive     = process.env.SSLCOMMERZ_IS_LIVE === 'true'
  const validateUrl = isLive ? VALIDATE_LIVE : VALIDATE_SANDBOX
  const storeId    = process.env.SSLCOMMERZ_STORE_ID
  const storePass  = process.env.SSLCOMMERZ_STORE_PASSWORD

  if (!storeId || !storePass) {
    return { success: false, reason: 'Gateway not configured' }
  }

  // Validate the transaction with SSLCommerz
  const validateResp = await fetch(
    `${validateUrl}?val_id=${valId}&store_id=${storeId}&store_passwd=${storePass}&format=json`
  )
  const validation = await validateResp.json()

  console.log('SSLCommerz validation:', { status: validation.status, tran_id: validation.tran_id })

  if (!['VALID', 'VALIDATED'].includes(validation.status)) {
    return { success: false, reason: `Validation failed: ${validation.status}` }
  }

  // Create service client (bypasses RLS for server-side activation)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: () => undefined, set: () => {}, remove: () => {} } }
  )

  await activateSubscription(supabase, userId, plan, tranId ?? valId)
  return { success: true }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const result   = await handlePayment(formData)

    if (result.success) {
      console.log('Payment activated successfully')
      return NextResponse.redirect(
        new URL('/premium?status=success', process.env.NEXT_PUBLIC_APP_URL ?? 'https://thevocabmastery.vercel.app')
      )
    } else {
      console.error('Payment activation failed:', result.reason)
      return NextResponse.redirect(
        new URL('/premium?status=failed', process.env.NEXT_PUBLIC_APP_URL ?? 'https://thevocabmastery.vercel.app')
      )
    }
  } catch (err: any) {
    console.error('Payment success handler error:', err)
    return NextResponse.redirect(
      new URL('/premium?status=failed', process.env.NEXT_PUBLIC_APP_URL ?? 'https://thevocabmastery.vercel.app')
    )
  }
}

export async function GET(req: NextRequest) {
  // SSLCommerz sometimes does a GET redirect
  return NextResponse.redirect(
    new URL('/premium?status=pending', process.env.NEXT_PUBLIC_APP_URL ?? 'https://thevocabmastery.vercel.app')
  )
}
