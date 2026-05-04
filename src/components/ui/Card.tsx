import { cn } from '@/lib/utils'

interface CardProps { children: React.ReactNode; className?: string; hover?: boolean; onClick?: () => void; accent?: string }

export default function Card({ children, className, hover, onClick, accent }: CardProps) {
  return (
    <div onClick={onClick}
      className={cn('bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl relative overflow-hidden',
        hover && 'cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:border-[var(--border2)] hover:shadow-xl hover:shadow-[var(--shadow)]',
        onClick && 'cursor-pointer', className)}>
      {accent && <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: accent }} />}
      {children}
    </div>
  )
}