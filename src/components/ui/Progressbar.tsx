import { cn } from '@/lib/utils'

interface ProgressBarProps {
  value: number  // 0-100
  color?: string
  height?: number
  className?: string
  showLabel?: boolean
}

export default function ProgressBar({ value, color, height = 6, className, showLabel }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value))
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className="flex-1 bg-[#1a1a26] rounded-full overflow-hidden"
        style={{ height }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${clamped}%`,
            background: color ?? 'linear-gradient(90deg, #7c6af7, #a78bfa)',
          }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-mono text-[#5a5a72] w-9 text-right">{clamped}%</span>
      )}
    </div>
  )
}