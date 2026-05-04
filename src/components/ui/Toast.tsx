'use client'
import { create } from 'zustand'
import { X, CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

type ToastType = 'success'|'error'|'warning'|'info'
interface Toast { id: string; message: string; type: ToastType }
interface ToastStore { toasts: Toast[]; add: (m: string, t?: ToastType) => void; remove: (id: string) => void }

export const useToast = create<ToastStore>((set) => ({
  toasts: [],
  add: (message, type='info') => {
    const id = Math.random().toString(36).slice(2)
    set(s => ({ toasts: [...s.toasts, { id, message, type }] }))
    setTimeout(() => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })), 4000)
  },
  remove: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
}))

const icons = { success: CheckCircle, error: XCircle, warning: AlertCircle, info: Info }
const styles = {
  success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  error:   'border-red-500/30 bg-red-500/10 text-red-400',
  warning: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400',
  info:    'border-purple-500/30 bg-[var(--accent)]/10 text-[var(--accent2)]',
}

export function Toaster() {
  const { toasts, remove } = useToast()
  return (
    <div className="fixed bottom-4 right-4 z-[300] flex flex-col gap-2 pointer-events-none max-w-[calc(100vw-2rem)]">
      {toasts.map(t => {
        const Icon = icons[t.type]
        return (
          <div key={t.id} className={cn('flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium shadow-xl min-w-[260px] max-w-sm pointer-events-auto animate-fade-up', styles[t.type])}>
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{t.message}</span>
            <button onClick={() => remove(t.id)} className="opacity-60 hover:opacity-100 flex-shrink-0"><X className="w-3.5 h-3.5" /></button>
          </div>
        )
      })}
    </div>
  )
}