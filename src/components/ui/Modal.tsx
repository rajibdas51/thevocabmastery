'use client'
import { useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizes = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

export default function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  const handleKey = useCallback(
    (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() },
    [onClose]
  )

  useEffect(() => {
    if (!open) return
    // Lock body scroll
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', handleKey)
    }
  }, [open, handleKey])

  if (!open || typeof document === 'undefined') return null

  const modal = (
    /*
     * Overlay: fixed to the VIEWPORT (position:fixed always relative to
     * viewport, never to a scroll ancestor).  The flex centering therefore
     * always centres inside the visible window, regardless of how far the
     * page has been scrolled.
     */
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(2px)' }}
      onClick={onClose}
      // Prevent scroll-bleed on the overlay itself
      onWheel={e => e.stopPropagation()}
    >
      <div
        className={cn(
          'relative w-full rounded-2xl shadow-2xl',
          'bg-[var(--modal-bg)] border border-[var(--border2)]',
          /* Inner scroll so the card itself never grows taller than 90vh */
          'max-h-[90vh] overflow-y-auto',
          'p-5 sm:p-6',
          sizes[size],
          'animate-fade-up'
        )}
        onClick={e => e.stopPropagation()}
      >
        {/* Header with close button */}
        {title && (
          <div className="flex items-center justify-between mb-5 gap-3">
            <h2 className="font-playfair text-xl font-bold text-[var(--text)] flex-1 min-w-0 pr-2">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--bg3)] hover:bg-[var(--border2)] transition-colors text-[var(--text2)] hover:text-[var(--text)]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Floating close when no title */}
        {!title && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--bg3)] hover:bg-[var(--border2)] transition-colors text-[var(--text2)] hover:text-[var(--text)]"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {children}
      </div>
    </div>
  )

  // Render into document.body so it escapes ALL scroll containers
  return createPortal(modal, document.body)
}
