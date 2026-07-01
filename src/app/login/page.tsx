'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseClient } from '@/lib/supabase/client'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/create'

  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setIsLoading(true)

    try {
      const supabase = getSupabaseClient()

      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName || email.split('@')[0] },
          },
        })
        if (error) throw error

        // If email confirmation is disabled in Supabase, a session is returned
        // immediately and we can continue. Otherwise, prompt to confirm.
        if (!data.session) {
          setNotice('Account created. Check your email to confirm, then sign in.')
          setMode('signin')
          return
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }

      router.push(redirectTo)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-[#fdfff8] border border-[#1b1b1b] rounded-lg p-8">
        <h1 className="text-2xl font-bold text-[#1b1b1b] mb-1">
          {mode === 'signin' ? 'Sign in' : 'Create your account'}
        </h1>
        <p className="text-sm text-[#1b1b1b80] mb-6">
          {mode === 'signin'
            ? 'Sign in to create moments. Browsing and streaming stay open to everyone.'
            : 'Make an account to start creating moments.'}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-mono uppercase text-[#1b1b1b80] mb-1">
                Artist / display name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="How you'll be credited on moments"
                className="w-full px-3 py-2 bg-[#d9dbdd] border border-[#1b1b1b] rounded-lg text-[#1b1b1b] placeholder-[#1b1b1b60] focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-mono uppercase text-[#1b1b1b80] mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-[#d9dbdd] border border-[#1b1b1b] rounded-lg text-[#1b1b1b] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-[#1b1b1b80] mb-1">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-[#d9dbdd] border border-[#1b1b1b] rounded-lg text-[#1b1b1b] focus:outline-none"
            />
          </div>

          {error && (
            <div className="bg-[#ff2e00]/10 border border-[#ff2e00] rounded-lg p-3 text-[#ff2e00] text-sm">
              {error}
            </div>
          )}
          {notice && (
            <div className="bg-[#2e8b6f]/10 border border-[#2e8b6f] rounded-lg p-3 text-[#2e8b6f] text-sm">
              {notice}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="px-8 py-3 bg-[#1b1b1b] text-[#fdfff8] font-semibold rounded-lg hover:opacity-80 transition-opacity disabled:opacity-50"
          >
            {isLoading ? 'Working…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <button
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin')
            setError(null)
            setNotice(null)
          }}
          className="mt-4 text-sm text-[#1b1b1b80] underline hover:text-[#1b1b1b]"
        >
          {mode === 'signin'
            ? "Don't have an account? Create one"
            : 'Already have an account? Sign in'}
        </button>

        <div className="mt-6 pt-6 border-t border-[#1b1b1b20]">
          <Link href="/catalog" className="text-sm text-[#1b1b1b80] underline hover:text-[#1b1b1b]">
            Just browsing? Stream music →
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-[80vh]" />}>
      <LoginForm />
    </Suspense>
  )
}
