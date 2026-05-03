import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  label?: string
  value: string
  onChange: (v: string) => void
  options: SelectOption[]
  placeholder?: string
  className?: string
}

export default function Select({ label, value, onChange, options, placeholder, className }: SelectProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label className="block text-xs font-semibold uppercase tracking-wider text-[#9090a8]">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className={cn(
            'w-full appearance-none bg-[#1a1a26] border border-white/10 rounded-lg px-3.5 py-2.5',
            'text-sm text-[#f0f0f5] outline-none cursor-pointer pr-10',
            'focus:border-[#7c6af7] focus:ring-1 focus:ring-[#7c6af7]/30',
            'transition-colors duration-150'
          )}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map(o => (
            <option key={o.value} value={o.value} className="bg-[#12121a]">
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5a5a72] pointer-events-none" />
      </div>
    </div>
  )
}