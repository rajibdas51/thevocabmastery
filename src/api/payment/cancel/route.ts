import { NextRequest, NextResponse } from 'next/server'
const APP = process.env.NEXT_PUBLIC_APP_URL ?? 'https://thevocabmastery.vercel.app'
export async function POST(req: NextRequest) {
  return NextResponse.redirect(new URL('/premium?status=cancelled', APP))
}
export async function GET(req: NextRequest) {
  return NextResponse.redirect(new URL('/premium?status=cancelled', APP))
}
