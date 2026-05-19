/**
 * FILE: src/app/api/payment/initiate/route.ts
 *
 * POST /api/payment/initiate
 * Body: { plan: 'monthly' | 'biannual' | 'annual' }
 *
 * REQUIRED ENV VARS in Vercel dashboard:
 *   SSLCOMMERZ_STORE_ID        — from developer.sslcommerz.com
 *   SSLCOMMERZ_STORE_PASSWORD  — from developer.sslcommerz.com
 *   SSLCOMMERZ_IS_LIVE         — "false" for sandbox, "true" for production
 *   NEXT_PUBLIC_APP_URL        — https://thevocabmastery.vercel.app
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

const SSLCOMMERZ_SANDBOX = 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php'
const SSLCOMMERZ_LIVE    = 'https://securepay.sslcommerz.com/gwprocess/v4/api.php'

const PLAN_CONFIG: Record<string, { amount: number; label: string; days: number }> = {
  monthly:  { amount: 100,  label: 'VocabMaster Monthly (30 days)',   days: 30  },
  biannual: { amount: 500,  label: 'VocabMaster 6 Months (180 days)', days: 180 },
  annual:   { amount: 1000, label: 'VocabMaster Annual (365 days)',    days: 365 },
}

export async function POST(req: NextRequest) {
  try {
    // ── 1. Validate env vars ────────────────────────────────
    const storeId   = process.env.SSLCOMMERZ_STORE_ID
    const storePass = process.env.SSLCOMMERZ_STORE_PASSWORD
    const appUrl    = process.env.NEXT_PUBLIC_APP_URL ?? 'https://thevocabmastery.vercel.app'
    const isLive    = process.env.SSLCOMMERZ_IS_LIVE === 'true'

    if (!storeId || !storePass) {
      console.error('SSLCommerz env vars missing:', { storeId: !!storeId, storePass: !!storePass })
      return NextResponse.json(
        { error: 'Payment gateway not configured. Contact support.' },
        { status: 500 }
      )
    }

    // ── 2. Parse body ───────────────────────────────────────
    const body = await req.json().catch(() => ({}))
    const { plan } = body

    if (!plan || !PLAN_CONFIG[plan]) {
      return NextResponse.json({ error: 'Invalid plan. Choose monthly, biannual or annual.' }, { status: 400 })
    }

    // ── 3. Get authenticated user via server Supabase client ─
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get:    (name) => cookieStore.get(name)?.value,
          set:    () => {},
          remove: () => {},
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Please log in first.' }, { status: 401 })
    }

    // Get profile for billing info
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single()

    // ── 4. Build SSLCommerz request ─────────────────────────
    const planInfo = PLAN_CONFIG[plan]
    const tranId   = `VM_${user.id.slice(0, 8).toUpperCase()}_${Date.now()}`
    const apiUrl   = isLive ? SSLCOMMERZ_LIVE : SSLCOMMERZ_SANDBOX

    const customerName  = profile?.full_name ?? 'VocabMaster User'
    const customerEmail = profile?.email ?? user.email ?? 'user@vocabmaster.app'

    const params = new URLSearchParams({
      store_id:         storeId,
      store_passwd:     storePass,
      total_amount:     planInfo.amount.toString(),
      currency:         'BDT',
      tran_id:          tranId,
      // Redirect URLs
      success_url:      `${appUrl}/api/payment/success`,
      fail_url:         `${appUrl}/api/payment/fail`,
      cancel_url:       `${appUrl}/api/payment/cancel`,
      ipn_url:          `${appUrl}/api/payment/success`,
      // Product info
      product_name:     planInfo.label,
      product_category: 'Subscription',
      product_profile:  'non-physical-goods',
      // Customer info
      cus_name:         customerName,
      cus_email:        customerEmail,
      cus_phone:        '01700000000',
      cus_add1:         'Dhaka, Bangladesh',
      cus_city:         'Dhaka',
      cus_country:      'Bangladesh',
      // Shipping (required fields even for digital)
      ship_name:        customerName,
      ship_add1:        'Dhaka, Bangladesh',
      ship_city:        'Dhaka',
      ship_country:     'Bangladesh',
      // Pass our data through SSLCommerz
      value_a:          user.id,
      value_b:          plan,
      value_c:          tranId,
      value_d:          planInfo.days.toString(),
    })

    console.log('Initiating SSLCommerz payment:', {
      tran_id: tranId, plan, amount: planInfo.amount,
      user_id: user.id, is_live: isLive
    })

    // ── 5. Call SSLCommerz ──────────────────────────────────
    const sslResponse = await fetch(apiUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    params.toString(),
    })

    if (!sslResponse.ok) {
      console.error('SSLCommerz HTTP error:', sslResponse.status)
      return NextResponse.json({ error: 'Payment gateway unreachable. Try again.' }, { status: 502 })
    }

    const sslData = await sslResponse.json()
    console.log('SSLCommerz response status:', sslData.status)

    if (sslData.status !== 'SUCCESS') {
      console.error('SSLCommerz failed:', sslData)
      return NextResponse.json(
        { error: sslData.failedreason ?? 'Payment initiation failed. Try again.' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      payment_url: sslData.GatewayPageURL,
      tran_id:     tranId,
    })

  } catch (err: any) {
    console.error('Payment initiate unhandled error:', err)
    return NextResponse.json({ error: 'Unexpected error. Please try again.' }, { status: 500 })
  }
}
