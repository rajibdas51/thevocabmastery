'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { Toaster } from '@/components/ui/Toast'
import ThemeProvider from '@/components/layout/ThemeProvider'

export default function AuthPage() {
  const router = useRouter()
  const { add: toast } = useToast()
  const [mode, setMode] = useState<'login'|'signup'>('login')
  const [loading, setLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState<'google'|'github'|null>(null)
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const supabase = createClient()

  const handleSubmit = async () => {
    if (!form.email || !form.password) { toast('Please fill all fields','error'); return }
    setLoading(true)
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password })
      if (error) { toast(error.message,'error'); setLoading(false); return }
      router.push('/dashboard'); router.refresh()
    } else {
      if (!form.name) { toast('Name is required','error'); setLoading(false); return }
      const { error } = await supabase.auth.signUp({
        email: form.email, password: form.password,
        options: { data: { full_name: form.name } }
      })
      if (error) { toast(error.message,'error'); setLoading(false); return }
      toast('Account created! Check your email to confirm.','success')
      setLoading(false)
    }
  }

  const handleSocial = async (provider: 'google'|'github') => {
    setSocialLoading(provider)
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    })
    if (error) { toast(error.message,'error'); setSocialLoading(null) }
  }

  return (
    <ThemeProvider>
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] p-4" suppressHydrationWarning>
        {/* Background glow */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[var(--accent)]/6 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-[var(--blue)]/4 rounded-full blur-3xl" />
        </div>

        <div className="w-full max-w-md relative">
          <div className="bg-[var(--modal-bg)] border border-[var(--border2)] rounded-2xl p-6 sm:p-8 shadow-2xl">
            {/* Logo */}
            <div className="text-center mb-7">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent2)] flex items-center justify-center text-2xl mx-auto mb-3 shadow-lg">
                📚
              </div>
              <h1 className="font-playfair text-3xl font-black bg-gradient-to-r from-[var(--text)] to-[var(--accent2)] bg-clip-text text-transparent">
                VocabMaster
              </h1>
              <p className="text-xs text-[var(--text3)] mt-1.5">Master English for Competitive Exams</p>
            </div>

            {/* Mode tabs */}
            <div className="flex bg-[var(--bg3)] rounded-xl p-1 mb-6">
              {(['login','signup'] as const).map(m => (
                <button key={m} onClick={() => setMode(m)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${mode===m ? 'bg-[var(--card-bg)] text-[var(--text)] shadow-sm' : 'text-[var(--text3)] hover:text-[var(--text2)]'}`}>
                  {m === 'login' ? 'Sign In' : 'Sign Up'}
                </button>
              ))}
            </div>

            {/* Social login */}
            <div className="space-y-2.5 mb-5">
              <button
                onClick={() => handleSocial('google')}
                disabled={!!socialLoading}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-[var(--border2)] bg-[var(--bg3)] hover:bg-[var(--bg4)] text-[var(--text)] text-sm font-semibold transition-all disabled:opacity-60"
              >
                {socialLoading === 'google' ? (
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                )}
                Continue with Google
              </button>

              <button
                onClick={() => handleSocial('github')}
                disabled={!!socialLoading}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-[var(--border2)] bg-[var(--bg3)] hover:bg-[var(--bg4)] text-[var(--text)] text-sm font-semibold transition-all disabled:opacity-60"
              >
                {socialLoading === 'github' ? (
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                  </svg>
                )}
                Continue with GitHub
              </button>
            </div>

            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-[var(--border)]" />
              <span className="text-xs text-[var(--text3)] font-medium">or continue with email</span>
              <div className="flex-1 h-px bg-[var(--border)]" />
            </div>

            {/* Email form */}
            <div className="space-y-4">
              {mode === 'signup' && (
                <Input label="Full Name" placeholder="Your full name" value={form.name} onChange={e => setForm({...form,name:e.target.value})} />
              )}
              <Input label="Email" type="email" placeholder="you@example.com" value={form.email} onChange={e => setForm({...form,email:e.target.value})} />
              <Input label="Password" type="password" placeholder="••••••••" value={form.password} onChange={e => setForm({...form,password:e.target.value})} hint={mode==='signup' ? 'Minimum 6 characters' : undefined} />
            </div>

            <Button onClick={handleSubmit} loading={loading} className="w-full mt-5" size="lg">
              {mode === 'login' ? 'Sign In →' : 'Create Account →'}
            </Button>

            <p className="text-center text-xs text-[var(--text3)] mt-4">
              {mode==='login' ? "Don't have an account? " : "Already have an account? "}
              <button onClick={() => setMode(mode==='login'?'signup':'login')} className="text-[var(--accent2)] hover:underline font-medium">
                {mode==='login' ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </div>
        </div>
      </div>
      <Toaster />
    </ThemeProvider>
  )
}