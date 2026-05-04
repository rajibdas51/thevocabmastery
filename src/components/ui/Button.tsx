'use client'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import { forwardRef, type ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  loading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, children, disabled, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none'
    const variants = {
      primary:   'bg-[var(--accent)] hover:opacity-90 text-white',
      secondary: 'bg-[var(--bg3)] hover:bg-[var(--bg4)] text-[var(--text)] border border-[var(--border2)]',
      ghost:     'bg-transparent hover:bg-[var(--bg3)] text-[var(--text2)] hover:text-[var(--text)]',
      danger:    'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20',
      outline:   'bg-transparent border border-[var(--accent)] text-[var(--accent2)] hover:bg-[var(--accent)]/10',
    }
    const sizes = {
      sm:   'px-3 py-1.5 text-xs',
      md:   'px-4 py-2 text-sm',
      lg:   'px-5 py-2.5 text-sm',
      icon: 'w-8 h-8 p-0 text-sm',
    }
    return (
      <button ref={ref} className={cn(base, variants[variant], sizes[size], className)} disabled={disabled || loading} {...props}>
        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
export default Button