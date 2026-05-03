'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn, getInitials } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth'
import {
  LayoutDashboard, BookOpen, FolderOpen, CreditCard, PenSquare,
  Zap, Edit3, PlusCircle, ShieldAlert, LogOut, ChevronRight
} from 'lucide-react'

const navSections = [
  {
    label: 'Explore',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/words', label: 'Browse Words', icon: BookOpen },
      { href: '/categories', label: 'Categories', icon: FolderOpen },
    ]
  },
  {
    label: 'Practice',
    items: [
      { href: '/flashcards', label: 'Flashcards', icon: CreditCard },
      { href: '/quiz', label: 'Take Quiz', icon: PenSquare },
      { href: '/live-mcq', label: 'Live MCQ', icon: Zap, badge: 'LIVE' },
    ]
  },
  {
    label: 'Learn & Add',
    items: [
      { href: '/focus-writing', label: 'Focus Writing', icon: Edit3 },
      { href: '/add-word', label: 'Add New Word', icon: PlusCircle },
    ]
  },
]

const adminSection = {
  label: 'Admin',
  items: [
    { href: '/admin', label: 'Admin Panel', icon: ShieldAlert },
  ]
}

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { profile } = useAuthStore()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth')
    router.refresh()
  }

  const sections = profile?.role === 'admin'
    ? [...navSections, adminSection]
    : navSections

  return (
    <aside className="w-60 bg-[#0d0d15] border-r border-white/[0.06] flex flex-col h-screen sticky top-0 flex-shrink-0">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#7c6af7] to-[#a78bfa] flex items-center justify-center text-lg flex-shrink-0">
            📚
          </div>
          <span className="font-playfair text-[17px] font-black bg-gradient-to-r from-white to-[#a78bfa] bg-clip-text text-transparent">
            VocabMaster
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
        {sections.map(section => (
          <div key={section.label}>
            <p className="px-3 pt-4 pb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#5a5a72]">
              {section.label}
            </p>
            {section.items.map(item => {
              const Icon = item.icon
              const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13.5px] font-medium transition-all duration-150',
                    active
                      ? 'bg-[#7c6af7]/15 text-[#a78bfa]'
                      : 'text-[#9090a8] hover:bg-white/[0.04] hover:text-[#f0f0f5]'
                  )}
                >
                  <Icon className={cn('w-4 h-4 flex-shrink-0', active ? 'text-[#7c6af7]' : '')} />
                  <span className="flex-1">{item.label}</span>
                  {'badge' in item && item.badge && (
                    <span className="text-[9px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full animate-pulse">
                      {item.badge as string}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-white/[0.06] p-3">
        <div className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/[0.04] transition-colors group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7c6af7] to-[#60a5fa] flex items-center justify-center text-xs font-bold flex-shrink-0">
            {getInitials(profile?.full_name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12.5px] font-semibold truncate">{profile?.full_name ?? 'Loading...'}</p>
            <p className="text-[10px] text-[#5a5a72]">{profile?.role === 'admin' ? 'Super Admin' : 'Member'}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-md hover:bg-red-500/10 text-[#5a5a72] hover:text-red-400 transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  )
}