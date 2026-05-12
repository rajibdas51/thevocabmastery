'use client'
import { useEffect, useCallback } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }

export default function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      document.addEventListener('keydown', handleKey)
    }
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', handleKey)
    }
  }, [open, handleKey])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[200] flex items-top justify-center  p-4 pt-15"
      style={{ background: 'rgba(0,0,0,0.65)' }}
      onClick={onClose}
    >
      <div
        className={cn(
          'relative w-full rounded-2xl shadow-2xl animate-fade-up',
          'bg-[var(--modal-bg)] border border-[var(--border2)]',
          'max-h-[70vh] overflow-y-auto p-6 pt-15',
          sizes[size]
        )}
        onClick={e => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between mb-5 gap-3">
            <h2 className="font-playfair text-xl font-bold text-[var(--text)] flex-1 min-w-0">{title}</h2>
            <button
              onClick={onClose}
              className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--bg3)] hover:bg-[var(--border2)] transition-colors text-[var(--text2)] hover:text-[var(--text)]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {!title && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--bg3)] hover:bg-[var(--border2)] transition-colors text-[var(--text2)] hover:text-[var(--text)]"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        {children}
      </div>
    </div>
  )
}