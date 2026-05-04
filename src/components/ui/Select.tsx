import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'

interface SelectProps { label?: string; value: string; onChange: (v: string) => void; options: {value:string;label:string}[]; placeholder?: string; className?: string }

export default function Select({ label, value, onChange, options, placeholder, className }: SelectProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text2)]">{label}</label>}
      <div className="relative">
        <select value={value} onChange={e => onChange(e.target.value)}
          className="w-full appearance-none bg-[var(--input-bg)] border border-[var(--border2)] rounded-lg px-3.5 py-2.5 text-sm text-[var(--text)] outline-none cursor-pointer pr-10 focus:border-[var(--accent)] transition-colors">
          {placeholder && <option value="">{placeholder}</option>}
          {options.map(o => <option key={o.value} value={o.value} className="bg-[var(--bg2)]">{o.label}</option>)}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text3)] pointer-events-none" />
      </div>
    </div>
  )
}