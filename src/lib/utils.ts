import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

export function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export function formatRelativeTime(date: string | Date) {
  const now = new Date()
  const d = new Date(date)
  const diff = d.getTime() - now.getTime()
  const abs = Math.abs(diff)
  if (abs < 60000) return 'just now'
  if (abs < 3600000) return `${Math.floor(abs / 60000)}m ${diff > 0 ? 'from now' : 'ago'}`
  if (abs < 86400000) return `${Math.floor(abs / 3600000)}h ${diff > 0 ? 'from now' : 'ago'}`
  return formatDate(date)
}

export function getInitials(name: string | null | undefined) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

export function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

export function scoreColor(pct: number) {
  if (pct >= 80) return 'text-green-400'
  if (pct >= 60) return 'text-yellow-400'
  return 'text-red-400'
}

export function scoreLabel(pct: number) {
  if (pct >= 90) return 'Outstanding! 🎉'
  if (pct >= 80) return 'Excellent! 🌟'
  if (pct >= 70) return 'Good Job! 👍'
  if (pct >= 60) return 'Not Bad! 💪'
  return 'Keep Practicing! 📚'
}