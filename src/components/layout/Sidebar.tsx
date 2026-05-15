'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn, getInitials } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth'
import { useSidebarStore } from '@/store/sidebar'
import { useThemeStore } from '@/store/theme'
import { useStreakStore } from '@/store/streak'
import { isPremiumPlan } from '@/lib/streak'
import {
  LayoutDashboard, BookOpen, FolderOpen, CreditCard, PenSquare,
  Edit3, PlusCircle, ShieldAlert, LogOut, ChevronLeft, ChevronRight,
  Sun, Moon, X, PenLine, Zap, Crown,
} from 'lucide-react'

const navSections = [
  {
    label: 'Explore',
    items: [
      { href: '/dashboard',      label: 'Dashboard',         icon: LayoutDashboard },
      { href: '/words',          label: 'Browse Words',      icon: BookOpen        },
      { href: '/categories',     label: 'Categories',        icon: FolderOpen      },
    ],
  },
  {
    label: 'Practice',
    items: [
      { href: '/flashcards',     label: 'Flashcards',        icon: CreditCard      },
      { href: '/quiz',           label: 'Take Quiz',         icon: PenSquare       },
      { href: '/fill-blank',     label: 'Fill in the Blank', icon: PenLine         },
      { href: '/live-mcq',       label: 'Live MCQ',          icon: Zap, badge: 'LIVE' },
    ],
  },
  {
    label: 'Learn',
    items: [
      { href: '/focus-writing',  label: 'Focus Writing',     icon: Edit3           },
      { href: '/add-word',       label: 'Add Word',          icon: PlusCircle      },
    ],
  },
  {
    label: 'Account',
    items: [
      { href: '/premium',        label: 'Premium',           icon: Crown           },
    ],
  },
]

const adminSection = {
  label: 'Admin',
  items: [{ href: '/admin', label: 'Admin Panel', icon: ShieldAlert }],
}

export default function Sidebar() {
  const pathname  = usePathname()
  const router    = useRouter()
  const { profile }                                           = useAuthStore()
  const { collapsed, mobileOpen, toggleCollapsed, setMobileOpen } = useSidebarStore()
  const { theme, toggleTheme }                                = useThemeStore()
  const { streak }                                            = useStreakStore()

  const sections = profile?.role === 'admin'
    ? [...navSections, adminSection]
    : navSections

  const isPremium  = streak ? isPremiumPlan(streak.subscription_plan) : false
  const pts        = streak?.current_points ?? 0
  const maxPts     = streak?.max_points ?? 10
  const streakDays = streak?.current_streak ?? 0

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setMobileOpen(false)
    router.push('/auth')
    router.refresh()
  }

  const NavItem = ({ item }: { item: any }) => {
    const active = pathname === item.href ||
      (item.href !== '/dashboard' && pathname.startsWith(item.href))
    const Icon = item.icon
    const isPremiumItem = item.href === '/premium'

    return (
      <div className="relative group/item">
        <Link
          href={item.href}
          onClick={() => setMobileOpen(false)}
          className={cn(
            'flex items-center gap-2.5 rounded-lg transition-all duration-150',
            collapsed ? 'px-2 py-2 justify-center' : 'px-3 py-2',
            active
              ? 'bg-[var(--accent)]/15 text-[var(--accent2)]'
              : 'text-[var(--text2)] hover:bg-[var(--border)] hover:text-[var(--text)]'
          )}
        >
          <Icon className={cn('flex-shrink-0 w-4 h-4', active && 'text-[var(--accent)]',
            isPremiumItem && !active && 'text-[#f5c842]')} />
          {!collapsed && (
            <span className={cn('text-[13.5px] font-medium flex-1 whitespace-nowrap',
              isPremiumItem && !active && 'text-[#f5c842]')}>
              {item.label}
            </span>
          )}
          {!collapsed && item.badge && (
            <span className="text-[9px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full animate-pulse">
              {item.badge}
            </span>
          )}
          {!collapsed && isPremiumItem && isPremium && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: 'rgba(245,200,66,0.15)', color: '#f5c842' }}>
              ACTIVE
            </span>
          )}
        </Link>
        {collapsed && (
          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 rounded-lg text-xs font-medium whitespace-nowrap pointer-events-none opacity-0 group-hover/item:opacity-100 transition-opacity z-50"
            style={{ background: 'var(--bg4)', color: 'var(--text)', border: '1px solid var(--border2)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
            {item.label}
          </div>
        )}
      </div>
    )
  }

  const sidebarContent = (
    <div className={cn('flex flex-col h-full border-r transition-all duration-300',
      collapsed ? 'w-[60px]' : 'w-60')}
      style={{ background: 'var(--sidebar-bg)', borderColor: 'var(--border)' }}>

      {/* Top: logo + collapse */}
      <div className={cn('flex items-center border-b flex-shrink-0',
        collapsed ? 'flex-col gap-2 px-1.5 py-3' : 'px-4 py-4 gap-2.5')}
        style={{ borderColor: 'var(--border)' }}>
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent2)] flex items-center justify-center text-lg flex-shrink-0">
          📚
        </div>
        {!collapsed && (
          <span className="font-playfair text-[16px] font-black bg-gradient-to-r from-[var(--text)] to-[var(--accent2)] bg-clip-text text-transparent flex-1 truncate">
            VocabMaster
          </span>
        )}
        <button
          onClick={toggleCollapsed}
          className="hidden md:flex w-7 h-7 items-center justify-center rounded-lg flex-shrink-0 hover:bg-[var(--bg3)] text-[var(--text3)] hover:text-[var(--text)] transition-all"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Streak + Points strip */}
      {!collapsed && streak && (
        <div className="mx-3 mt-3 p-3 rounded-xl flex items-center justify-between"
          style={{ background: 'var(--bg3)', border: '1px solid var(--border2)' }}>
          {/* Flame */}
          <div className="flex items-center gap-1.5">
            <span className="text-lg">{streak.current_streak > 0 ? '🔥' : '💤'}</span>
            <span className="text-sm font-black font-mono" style={{
              color: streak.current_streak > 0 ? '#fb923c' : 'var(--text3)'
            }}>
              {streakDays}
            </span>
          </div>
          {/* Divider */}
          <div className="w-px h-5" style={{ background: 'var(--border2)' }} />
          {/* Points */}
          {isPremium ? (
            <div className="flex items-center gap-1">
              <span className="text-xs">⚡</span>
              <span className="text-xs font-bold" style={{ color: 'var(--accent2)' }}>∞</span>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <span className="text-sm">❤️</span>
              <span className="text-xs font-bold font-mono" style={{
                color: pts <= 2 ? '#f8706a' : 'var(--text)'
              }}>
                {pts}/{maxPts}
              </span>
            </div>
          )}
          {/* XP */}
          <div className="flex items-center gap-1">
            <span className="text-[10px]" style={{ color: 'var(--text3)' }}>XP</span>
            <span className="text-xs font-bold font-mono" style={{ color: 'var(--accent2)' }}>
              {streak.total_xp.toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {sections.map(section => (
          <div key={section.label}>
            {!collapsed ? (
              <p className="px-3 pt-4 pb-1.5 text-[10px] font-bold uppercase tracking-[0.12em]"
                style={{ color: 'var(--text3)' }}>
                {section.label}
              </p>
            ) : (
              <div className="h-px mx-2 my-2" style={{ background: 'var(--border)' }} />
            )}
            {section.items.map(item => <NavItem key={item.href} item={item} />)}
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="border-t flex-shrink-0 p-2 space-y-1" style={{ borderColor: 'var(--border)' }}>
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className={cn('w-full flex items-center gap-2.5 rounded-lg px-3 py-2 transition-all',
            'text-[var(--text2)] hover:bg-[var(--border)] hover:text-[var(--text)]',
            collapsed && 'justify-center px-2')}
        >
          {theme === 'dark'
            ? <Sun  className="w-4 h-4 flex-shrink-0" />
            : <Moon className="w-4 h-4 flex-shrink-0" />}
          {!collapsed && (
            <span className="text-[13px] font-medium">
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </span>
          )}
        </button>

        {/* User row */}
        <div className={cn('flex items-center gap-2.5 p-2 rounded-lg group hover:bg-[var(--border)] transition-colors',
          collapsed && 'justify-center')}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent)] to-[var(--blue)] flex items-center justify-center text-xs font-bold flex-shrink-0 text-white">
            {getInitials(profile?.full_name)}
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-semibold truncate" style={{ color: 'var(--text)' }}>
                  {profile?.full_name ?? '…'}
                </p>
                <p className="text-[10px]" style={{ color: 'var(--text3)' }}>
                  {isPremium ? '⚡ Premium' : profile?.role === 'admin' ? 'Admin' : 'Free'}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-md hover:bg-red-500/10 transition-all"
                style={{ color: 'var(--text3)' }}
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <>
      <div className="hidden md:flex h-screen sticky top-0 flex-shrink-0">
        {sidebarContent}
      </div>
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={() => setMobileOpen(false)} />
      )}
      <div className={cn('fixed top-0 left-0 h-full z-50 md:hidden transition-transform duration-300',
        mobileOpen ? 'translate-x-0' : '-translate-x-full')}>
        <div className="relative w-60 h-full">
          {sidebarContent}
          <button onClick={() => setMobileOpen(false)}
            className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-lg"
            style={{ background: 'var(--bg3)', color: 'var(--text2)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  )
}