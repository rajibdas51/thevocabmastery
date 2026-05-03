'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/auth'
import Sidebar from './Sidebar'
import { Toaster } from '@/components/ui/Toast'
import type { Profile } from '@/types'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { setProfile } = useAuthStore()
  const supabase = createClient()

  useEffect(() => {
    // Load profile on mount
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (data) setProfile(data as Profile)
    }

    loadProfile()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setProfile(null)
        router.push('/auth')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
      <Toaster />
    </div>
  )
}