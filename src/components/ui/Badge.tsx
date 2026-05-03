import { cn } from '@/lib/utils'

type BadgeVariant = 'purple' | 'green' | 'yellow' | 'red' | 'blue' | 'gray'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}

const variants: Record<BadgeVariant, string> = {
  purple: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
  green: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  yellow: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20',
  red: 'bg-red-500/10 text-red-300 border-red-500/20',
  blue: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
  gray: 'bg-white/5 text-[#9090a8] border-white/10',
}

export default function Badge({ children, variant = 'gray', className }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border',
      variants[variant],
      className
    )}>
      {children}
    </span>
  )
}