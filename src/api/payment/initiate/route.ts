/**
 * FILE: src/app/api/payment/initiate/route.ts
 *
 * POST /api/payment/initiate
 * Initiates an SSLCommerz payment session.
 *
 * SETUP:
 * 1. Register at https://developer.sslcommerz.com
 * 2. Add to .env.local:
 *    SSLCOMMERZ_STORE_ID=your_store_id
 *    SSLCOMMERZ_STORE_PASSWORD=your_store_password
 *    SSLCOMMERZ_IS_LIVE=false   (true for production)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const SSLCOMMERZ_API = process.env.SSLCOMMERZ_IS_LIVE === 'true'
  ? 'https://securepay.sslcommerz.com/gwprocess/v4/api.php'
  : 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php'

const PLAN_PRICES: Record<string, { amount: number; label: string; days: number }> = {
  monthly:  { amount: 100,  label: 'VocabMaster Monthly',  days: 30  },
  biannual: { amount: 500,  label: 'VocabMaster 6 Months', days: 180 },
  annual:   { amount: 1000, label: 'VocabMaster Annual',   days: 365 },
}

export async function POST(req: NextRequest) {
  try {
    const { plan } = await req.json()

    if (!plan || !PLAN_PRICES[plan]) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Get user profile for billing info
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single()

    const planInfo  = PLAN_PRICES[plan]
    const tranId    = `VM_${user.id.slice(0, 8)}_${Date.now()}`
    const baseUrl   = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    // SSLCommerz required parameters
    const params = new URLSearchParams({
      store_id:       process.env.SSLCOMMERZ_STORE_ID ?? '',
      store_passwd:   process.env.SSLCOMMERZ_STORE_PASSWORD ?? '',
      total_amount:   planInfo.amount.toString(),
      currency:       'BDT',
      tran_id:        tranId,
      // Redirect URLs
      success_url:    `${baseUrl}/api/payment/success`,
      fail_url:       `${baseUrl}/api/payment/fail`,
      cancel_url:     `${baseUrl}/api/payment/cancel`,
      // IPN — server-to-server notification
      ipn_url:        `${baseUrl}/api/payment/ipn`,
      // Product info
      product_name:   planInfo.label,
      product_category: 'Subscription',
      product_profile: 'non-physical-goods',
      // Customer info
      cus_name:       profile?.full_name ?? 'VocabMaster User',
      cus_email:      profile?.email ?? user.email ?? '',
      cus_phone:      '01700000000',   // required by SSLCommerz, placeholder
      cus_add1:       'Dhaka',
      cus_city:       'Dhaka',
      cus_country:    'Bangladesh',
      // Shipping (not physical, but required fields)
      ship_name:      profile?.full_name ?? 'VocabMaster User',
      ship_add1:      'Dhaka',
      ship_city:      'Dhaka',
      ship_country:   'Bangladesh',
      // Custom metadata (passed through to success/IPN)
      value_a:        user.id,
      value_b:        plan,
      value_c:        tranId,
      value_d:        planInfo.days.toString(),
    })

    // Call SSLCommerz to get payment URL
    const response = await fetch(SSLCOMMERZ_API, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    params.toString(),
    })

    const data = await response.json()

    if (data.status !== 'SUCCESS') {
      console.error('SSLCommerz error:', data)
      return NextResponse.json({ error: data.failedreason ?? 'Payment init failed' }, { status: 500 })
    }

    return NextResponse.json({ payment_url: data.GatewayPageURL, tran_id: tranId })

  } catch (err: any) {
    console.error('Payment initiate error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
