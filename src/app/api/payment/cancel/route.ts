/**
 * FILE: src/app/api/payment/cancel/route.ts
 */
import { NextRequest, NextResponse } from 'next/server'
export async function POST(req: NextRequest) {
  return NextResponse.redirect(new URL('/premium?status=cancelled', req.url))
}
export async function GET(req: NextRequest) {
  return NextResponse.redirect(new URL('/premium?status=cancelled', req.url))
}