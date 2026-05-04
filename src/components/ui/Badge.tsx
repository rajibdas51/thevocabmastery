import { cn } from '@/lib/utils'
type BadgeVariant = 'purple'|'green'|'yellow'|'red'|'blue'|'gray'
const variants: Record<BadgeVariant,string> = {
  purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  green:  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  yellow: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  red:    'bg-red-500/10 text-red-400 border-red-500/20',
  blue:   'bg-blue-500/10 text-blue-400 border-blue-500/20',
  gray:   'bg-[var(--bg3)] text-[var(--text2)] border-[var(--border)]',
}
export default function Badge({ children, variant='gray', className }: { children: React.ReactNode; variant?: BadgeVariant; className?: string }) {
  return <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border', variants[variant], className)}>{children}</span>
}