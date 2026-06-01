'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations('login')
  const redirectTo = searchParams.get('redirectTo') ?? '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function validate(): boolean {
    const next: typeof errors = {}
    if (!email.trim()) next.email = t('emailRequired')
    if (!password) next.password = t('passwordRequired')
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setServerError(null)
    if (!validate()) return
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) { setServerError(error.message); return }
    router.push(redirectTo)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          {t('email')}
        </label>
        <input
          id="email" type="email" autoComplete="email" value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
        />
        {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          {t('password')}
        </label>
        <input
          id="password" type="password" autoComplete="current-password" value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
        />
        {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
      </div>
      {serverError && (
        <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-md px-3 py-2">
          {serverError}
        </p>
      )}
      <button
        type="submit" disabled={loading}
        className="w-full py-2 px-4 rounded-md bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? t('submitting') : t('submit')}
      </button>
      <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">{t('contactAdmin')}</p>
    </form>
  )
}

export default function LoginPage() {
  const t = useTranslations('login')
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-zinc-800 dark:text-zinc-100">{t('title')}</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t('subtitle')}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
          <Suspense><LoginForm /></Suspense>
        </div>
      </div>
    </div>
  )
}
