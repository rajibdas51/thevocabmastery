import Card from '@/components/ui/Card'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  icon?: string
  accent: string
  className?: string
}

export default function StatCard({ label, value, sub, icon, accent, className }: StatCardProps) {
  return (
    <Card accent={accent} className={cn('p-5 relative overflow-hidden', className)}>
      {icon && (
        <span className="absolute right-4 top-4 text-2xl opacity-15">{icon}</span>
      )}
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#5a5a72]">{label}</p>
      <p className="font-playfair text-3xl font-black mt-2">{value}</p>
      {sub && <p className="text-xs text-[#5a5a72] mt-1">{sub}</p>}
    </Card>
  )
}