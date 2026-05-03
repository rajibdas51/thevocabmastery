import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  className?: string
}

export default function PageHeader({ title, subtitle, action, className }: PageHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between px-8 pt-8 pb-0', className)}>
      <div>
        <h1 className="font-playfair text-2xl font-black">{title}</h1>
        {subtitle && <p className="text-sm text-[#9090a8] mt-1">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}