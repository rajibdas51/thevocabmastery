'use client'
import { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }

export default function Modal({ open, onClose, title, children, size = 'md', className }: ModalProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={onClose}
    >
      <div
        className={cn(
          'relative w-full bg-[#12121a] border border-white/10 rounded-2xl p-6 shadow-2xl',
          'animate-fade-up max-h-[90vh] overflow-y-auto',
          sizes[size],
          className
        )}
        onClick={e => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-playfair text-xl font-bold">{title}</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-[#9090a8] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {!title && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-[#9090a8] hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        {children}
      </div>
    </div>
  )
}