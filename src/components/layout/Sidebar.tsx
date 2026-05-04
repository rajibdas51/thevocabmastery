'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn, getInitials } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth'
import { useSidebarStore } from '@/store/sidebar'
import { useThemeStore } from '@/store/theme'
import {
  LayoutDashboard, BookOpen, FolderOpen, CreditCard, PenSquare,
  Zap, Edit3, PlusCircle, ShieldAlert, LogOut, ChevronLeft,
  ChevronRight, Sun, Moon, Menu, X
} from 'lucide-react'

const navSections = [
  {
    label: 'Explore',
    items: [
      { href: '/dashboard',      label: 'Dashboard',    icon: LayoutDashboard },
      { href: '/words',          label: 'Browse Words', icon: BookOpen },
      { href: '/categories',     label: 'Categories',   icon: FolderOpen },
    ]
  },
  {
    label: 'Practice',
    items: [
      { href: '/flashcards',     label: 'Flashcards',   icon: CreditCard },
      { href: '/quiz',           label: 'Take Quiz',    icon: PenSquare },
      { href: '/live-mcq',       label: 'Live MCQ',     icon: Zap, badge: 'LIVE' },
    ]
  },
  {
    label: 'Learn & Add',
    items: [
      { href: '/focus-writing',  label: 'Focus Writing', icon: Edit3 },
      { href: '/add-word',       label: 'Add Word',      icon: PlusCircle },
    ]
  },
]
const adminSection = {
  label: 'Admin',
  items: [{ href: '/admin', label: 'Admin Panel', icon: ShieldAlert }]
}

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { profile } = useAuthStore()
  const { collapsed, mobileOpen, toggleCollapsed, setMobileOpen } = useSidebarStore()
  const { theme, toggleTheme } = useThemeStore()

  const sections = profile?.role === 'admin' ? [...navSections, adminSection] : navSections

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setMobileOpen(false)
    router.push('/auth')
    router.refresh()
  }

  const NavItem = ({ item }: { item: any }) => {
    const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
    const Icon = item.icon
    return (
      <div className="tooltip-container">
        <Link
          href={item.href}
          onClick={() => setMobileOpen(false)}
          className={cn(
            'flex items-center gap-2.5 rounded-lg transition-all duration-150 relative',
            collapsed ? 'px-2 py-2 justify-center' : 'px-3 py-2',
            active
              ? 'bg-[var(--accent)]/15 text-[var(--accent2)]'
              : 'text-[var(--text2)] hover:bg-[var(--border)] hover:text-[var(--text)]'
          )}
        >
          <Icon className={cn('flex-shrink-0', collapsed ? 'w-5 h-5' : 'w-4 h-4', active ? 'text-[var(--accent)]' : '')} />
          {!collapsed && <span className="text-[13.5px] font-medium flex-1">{item.label}</span>}
          {!collapsed && item.badge && (
            <span className="text-[9px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full animate-pulse">
              {item.badge}
            </span>
          )}
        </Link>
        {collapsed && <span className="tooltip">{item.label}{item.badge ? ` (${item.badge})` : ''}</span>}
      </div>
    )
  }

  const sidebarContent = (
    <div className={cn(
      'flex flex-col h-full bg-[var(--sidebar-bg)] border-r border-[var(--border)] transition-all duration-300',
      collapsed ? 'w-[60px]' : 'w-60'
    )}>
      {/* Logo */}
      <div className={cn('flex items-center border-b border-[var(--border)]', collapsed ? 'p-3 justify-center' : 'px-5 py-5 gap-2.5')}>
        {!collapsed && (
          <>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent2)] flex items-center justify-center text-lg flex-shrink-0">
              📚
            </div>
            <span className="font-playfair text-[17px] font-black bg-gradient-to-r from-[var(--text)] to-[var(--accent2)] bg-clip-text text-transparent">
              VocabMaster
            </span>
          </>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent2)] flex items-center justify-center text-lg">
            📚
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {sections.map(section => (
          <div key={section.label}>
            {!collapsed && (
              <p className="px-3 pt-4 pb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text3)]">
                {section.label}
              </p>
            )}
            {collapsed && <div className="pt-3" />}
            {section.items.map(item => <NavItem key={item.href} item={item} />)}
          </div>
        ))}
      </nav>

      {/* Bottom controls */}
      <div className="border-t border-[var(--border)] p-2 space-y-1">
        {/* Theme toggle */}
        <div className="tooltip-container">
          <button
            onClick={toggleTheme}
            className={cn(
              'w-full flex items-center gap-2.5 rounded-lg px-3 py-2 transition-all text-[var(--text2)] hover:bg-[var(--border)] hover:text-[var(--text)]',
              collapsed && 'justify-center px-2'
            )}
          >
            {theme === 'dark'
              ? <Sun className="w-4 h-4 flex-shrink-0" />
              : <Moon className="w-4 h-4 flex-shrink-0" />
            }
            {!collapsed && <span className="text-[13px] font-medium">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
          </button>
          {collapsed && <span className="tooltip">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
        </div>

        {/* Collapse toggle (desktop only) */}
        <div className="tooltip-container hidden md:block">
          <button
            onClick={toggleCollapsed}
            className={cn(
              'w-full flex items-center gap-2.5 rounded-lg px-3 py-2 transition-all text-[var(--text2)] hover:bg-[var(--border)] hover:text-[var(--text)]',
              collapsed && 'justify-center px-2'
            )}
          >
            {collapsed
              ? <ChevronRight className="w-4 h-4 flex-shrink-0" />
              : <ChevronLeft className="w-4 h-4 flex-shrink-0" />
            }
            {!collapsed && <span className="text-[13px] font-medium">Collapse</span>}
          </button>
          {collapsed && <span className="tooltip">Expand</span>}
        </div>

        {/* User */}
        <div className={cn(
          'flex items-center gap-2.5 p-2 rounded-lg group hover:bg-[var(--border)] transition-colors',
          collapsed && 'justify-center'
        )}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent)] to-[var(--blue)] flex items-center justify-center text-xs font-bold flex-shrink-0 text-white">
            {getInitials(profile?.full_name)}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-[12.5px] font-semibold truncate text-[var(--text)]">{profile?.full_name ?? '...'}</p>
              <p className="text-[10px] text-[var(--text3)]">{profile?.role === 'admin' ? 'Super Admin' : 'Member'}</p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={handleLogout}
              title="Sign out"
              className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-md hover:bg-red-500/10 text-[var(--text3)] hover:text-red-400 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
          {collapsed && (
            <div className="tooltip-container">
              <button onClick={handleLogout} className="hidden group-hover:flex w-7 h-7 items-center justify-center rounded-md hover:bg-red-500/10 text-[var(--text3)] hover:text-red-400">
                <LogOut className="w-3.5 h-3.5" />
              </button>
              <span className="tooltip">Sign Out</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:flex h-screen sticky top-0 flex-shrink-0">
        {sidebarContent}
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div className={cn(
        'fixed top-0 left-0 h-full z-50 md:hidden transition-transform duration-300',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="relative w-60 h-full">
          {sidebarContent}
          <button
            onClick={() => setMobileOpen(false)}
            className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-lg bg-[var(--border)] text-[var(--text2)] hover:text-[var(--text)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  )
}