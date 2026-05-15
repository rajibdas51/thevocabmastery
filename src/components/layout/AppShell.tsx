'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth'
import { useSidebarStore } from '@/store/sidebar'
import { useStreakStore } from '@/store/streak'
import Sidebar from './Sidebar'
import ThemeProvider from './ThemeProvider'
import { Toaster } from '@/components/ui/Toast'
import MilestonePopup from '@/components/streak/MilestonePopup'
import { Menu } from 'lucide-react'
import type { Profile } from '@/types'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { setProfile } = useAuthStore()
  const { setMobileOpen } = useSidebarStore()
  const { hydrate } = useStreakStore()

  useEffect(() => {
    const supabase = createClient()

    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) {
        setProfile(data as Profile)
        // Hydrate streak store once profile is loaded
        await hydrate(user.id)
      }
    }

    loadProfile()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') { setProfile(null); router.push('/auth') }
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <ThemeProvider>
      <div className="flex h-screen overflow-hidden bg-[var(--bg)]">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Mobile top bar */}
          <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-[var(--sidebar-bg)] border-b border-[var(--border)] flex-shrink-0">
            <button
              onClick={() => setMobileOpen(true)}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-[var(--bg3)] text-[var(--text2)]"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[var(--accent)] to-[var(--accent2)] flex items-center justify-center text-sm">
                📚
              </div>
              <span className="font-playfair text-[16px] font-black bg-gradient-to-r from-[var(--text)] to-[var(--accent2)] bg-clip-text text-transparent">
                VocabMaster
              </span>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
        <Toaster />
        {/* Global milestone celebration popup */}
        <MilestonePopup />
      </div>
    </ThemeProvider>
  )
}