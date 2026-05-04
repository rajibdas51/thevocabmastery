import { cn } from '@/lib/utils'
interface ProgressBarProps { value: number; color?: string; height?: number; className?: string; showLabel?: boolean }
export default function ProgressBar({ value, color, height=6, className, showLabel }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value))
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex-1 bg-[var(--bg3)] rounded-full overflow-hidden" style={{ height }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width:`${clamped}%`, background: color ?? 'linear-gradient(90deg,var(--accent),var(--accent2))' }} />
      </div>
      {showLabel && <span className="text-xs font-mono text-[var(--text3)] w-9 text-right">{clamped}%</span>}
    </div>
  )
}