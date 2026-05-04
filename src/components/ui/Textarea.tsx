import { cn } from '@/lib/utils'
import { forwardRef, type TextareaHTMLAttributes } from 'react'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string; error?: string
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, label, error, id, ...props }, ref) => {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="space-y-1.5">
      {label && <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-[var(--text2)]">{label}</label>}
      <textarea ref={ref} id={inputId}
        className={cn('w-full bg-[var(--input-bg)] border border-[var(--border2)] rounded-lg px-3.5 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--text3)] outline-none resize-y min-h-[80px] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/30 transition-colors', error && 'border-red-500/50', className)}
        {...props} />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
})
Textarea.displayName = 'Textarea'
export default Textarea