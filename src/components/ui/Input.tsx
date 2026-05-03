import { cn } from '@/lib/utils'
import { forwardRef, type InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-[#9090a8]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full bg-[#1a1a26] border border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-[#f0f0f5]',
            'placeholder:text-[#5a5a72] outline-none',
            'focus:border-[#7c6af7] focus:ring-1 focus:ring-[#7c6af7]/30',
            'transition-colors duration-150',
            error && 'border-red-500/50 focus:border-red-500',
            className
          )}
          {...props}
        />
        {hint && !error && <p className="text-xs text-[#5a5a72]">{hint}</p>}
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'
export default Input