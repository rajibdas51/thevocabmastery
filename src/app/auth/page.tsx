'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { Toaster } from '@/components/ui/Toast'

export default function AuthPage() {
  const router = useRouter()
  const { add: toast } = useToast()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const supabase = createClient()

  const handleSubmit = async () => {
    if (!form.email || !form.password) { toast('Please fill all fields', 'error'); return }
    setLoading(true)

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({
        email: form.email, password: form.password
      })
      if (error) { toast(error.message, 'error'); setLoading(false); return }
    } else {
      if (!form.name) { toast('Name is required', 'error'); setLoading(false); return }
      const { error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { full_name: form.name } }
      })
      if (error) { toast(error.message, 'error'); setLoading(false); return }
      toast('Account created! Please check your email to confirm.', 'success')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] p-4">
        {/* Background glow */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#7c6af7]/6 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-blue-500/4 rounded-full blur-3xl" />
        </div>

        <div className="w-full max-w-md relative">
          {/* Card */}
          <div className="bg-[#0d0d15] border border-white/[0.08] rounded-2xl p-8 shadow-2xl">
            {/* Logo */}
            <div className="text-center mb-8">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#7c6af7] to-[#a78bfa] flex items-center justify-center text-2xl mx-auto mb-3 shadow-lg shadow-purple-500/20">
                📚
              </div>
              <h1 className="font-playfair text-3xl font-black bg-gradient-to-r from-white to-[#a78bfa] bg-clip-text text-transparent">
                VocabMaster
              </h1>
              <p className="text-xs text-[#5a5a72] mt-1.5">Master English for Competitive Exams</p>
            </div>

            {/* Tabs */}
            <div className="flex bg-[#12121a] rounded-xl p-1 mb-6">
              {(['login', 'signup'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                    mode === m ? 'bg-[#1a1a26] text-white' : 'text-[#5a5a72] hover:text-[#9090a8]'
                  }`}
                >
                  {m === 'login' ? 'Sign In' : 'Sign Up'}
                </button>
              ))}
            </div>

            {/* Form */}
            <div className="space-y-4">
              {mode === 'signup' && (
                <Input
                  label="Full Name"
                  placeholder="Your full name"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />
              )}
              <Input
                label="Email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
              />
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                hint={mode === 'signup' ? 'Minimum 6 characters' : undefined}
              />
            </div>

            <Button
              onClick={handleSubmit}
              loading={loading}
              className="w-full mt-6"
              size="lg"
            >
              {mode === 'login' ? 'Sign In →' : 'Create Account →'}
            </Button>

            <p className="text-center text-xs text-[#5a5a72] mt-5">
              {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
              <button
                onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                className="text-[#a78bfa] hover:underline font-medium"
              >
                {mode === 'login' ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </div>

         
        </div>
      </div>
      <Toaster />
    </>
  )
}