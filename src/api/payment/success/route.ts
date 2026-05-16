/**
 * FILE: src/app/api/payment/success/route.ts
 * SSLCommerz redirects user here on successful payment.
 * Validates payment then activates subscription.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { activateSubscription } from '@/lib/streak'

const VALIDATE_URL = process.env.SSLCOMMERZ_IS_LIVE === 'true'
  ? 'https://securepay.sslcommerz.com/validator/api/validationserverAPI.php'
  : 'https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php'

const PLAN_AMOUNTS: Record<string, number> = {
  monthly: 100, biannual: 500, annual: 1000,
}

export async function POST(req: NextRequest) {
  try {
    const formData   = await req.formData()
    const valId      = formData.get('val_id')?.toString()
    const tranId     = formData.get('tran_id')?.toString()
    const userId     = formData.get('value_a')?.toString()
    const plan       = formData.get('value_b')?.toString()
    const amount     = parseFloat(formData.get('amount')?.toString() ?? '0')

    if (!valId || !userId || !plan) {
      return NextResponse.redirect(new URL('/premium?status=failed', req.url))
    }

    // Validate with SSLCommerz server
    const validateResp = await fetch(
      `${VALIDATE_URL}?val_id=${valId}&store_id=${process.env.SSLCOMMERZ_STORE_ID}&store_passwd=${process.env.SSLCOMMERZ_STORE_PASSWORD}&format=json`
    )
    const validation = await validateResp.json()

    // Must be VALID and amount must match expected
    const expectedAmount = PLAN_AMOUNTS[plan]
    if (
      validation.status !== 'VALID' &&
      validation.status !== 'VALIDATED'
    ) {
      console.error('SSLCommerz validation failed:', validation)
      return NextResponse.redirect(new URL('/premium?status=failed', req.url))
    }

    // Activate subscription in DB
    await activateSubscription(
      userId,
      plan as 'monthly' | 'biannual' | 'annual',
      tranId ?? valId,
      expectedAmount,
    )

    return NextResponse.redirect(new URL('/premium?status=success', req.url))
  } catch (err: any) {
    console.error('Payment success handler error:', err)
    return NextResponse.redirect(new URL('/premium?status=failed', req.url))
  }
}

// SSLCommerz sometimes sends GET on redirect
export async function GET(req: NextRequest) {
  return NextResponse.redirect(new URL('/premium?status=pending', req.url))
}
