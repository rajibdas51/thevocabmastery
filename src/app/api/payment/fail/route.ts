/**
 * FILE: src/app/api/payment/fail/route.ts
 * SSLCommerz redirects here on payment failure.
 */
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  return NextResponse.redirect(new URL('/premium?status=failed', req.url))
}
export async function GET(req: NextRequest) {
  return NextResponse.redirect(new URL('/premium?status=failed', req.url))
}