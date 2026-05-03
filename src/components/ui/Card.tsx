import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  onClick?: () => void
  accent?: string // hex color for top border accent
}

export default function Card({ children, className, hover, onClick, accent }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-[#12121a] border border-white/[0.07] rounded-2xl relative overflow-hidden',
        hover && 'cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:border-white/[0.12] hover:shadow-xl hover:shadow-black/30',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {accent && (
        <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: accent }} />
      )}
      {children}
    </div>
  )
}