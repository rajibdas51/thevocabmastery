import type { Metadata } from 'next'
import { Playfair_Display, DM_Sans, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  weight: ['400', '700', '900'],
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  weight: ['300', '400', '500', '600', '700'],
})

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '600', '700'],
})

export const metadata: Metadata = {
  title: { default: 'VocabMaster', template: '%s | VocabMaster' },
  description: 'Master English vocabulary for competitive exams — BCS, Bank Jobs, GRE and more.',
  keywords: ['vocabulary', 'english', 'BCS', 'bank job', 'competitive exam', 'Bangladesh'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${dmSans.variable} ${jetbrains.variable}`}>
      <body className="bg-[#0a0a0f] text-[#f0f0f5] font-sans antialiased">
        {children}
      </body>
    </html>
  )
}