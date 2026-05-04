import { cn } from '@/lib/utils'
interface PageHeaderProps { title: string; subtitle?: string; action?: React.ReactNode; className?: string }
export default function PageHeader({ title, subtitle, action, className }: PageHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between px-4 sm:px-8 pt-6 sm:pt-8 pb-0 gap-4', className)}>
      <div>
        <h1 className="font-playfair text-xl sm:text-2xl font-black text-[var(--text)]">{title}</h1>
        {subtitle && <p className="text-sm text-[var(--text2)] mt-1">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}