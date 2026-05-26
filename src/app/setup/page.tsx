// src/app/setup/page.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function SetupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<{
    email?: string
    password?: string
    confirm?: string
  }>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  function validate(): boolean {
    const next: typeof errors = {}
    if (!email.trim()) next.email = 'Email is required'
    else if (!email.includes('@')) next.email = 'Invalid email address'
    if (!password) next.password = 'Password is required'
    else if (password.length < 8) next.password = 'Password must be at least 8 characters'
    if (password !== confirm) next.confirm = 'Passwords do not match'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setServerError(null)
    if (!validate()) return

    setLoading(true)

    const res = await fetch('/api/setup-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    if (!res.ok) {
      const body = await res.json() as { error?: string }
      setServerError(body.error ?? 'Something went wrong')
      setLoading(false)
      return
    }

    // Auto sign-in so the admin is authenticated before they reach /admin/users
    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)

    if (signInError) {
      // Account created but sign-in failed — user can log in manually
      setServerError(
        'Account created, but automatic sign-in failed. Please log in manually on the login page.'
      )
      return
    }

    setDone(true)
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
        <div className="w-full max-w-sm space-y-4">
          <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-6 space-y-3">
            <h2 className="font-semibold text-emerald-800 dark:text-emerald-300">
              ✅ Admin account created
            </h2>
            <p className="text-sm text-emerald-700 dark:text-emerald-400">
              You&rsquo;re signed in. To skip this setup check on future deployments, add the
              following environment variable in Netlify:
            </p>
            <code className="block text-xs bg-emerald-100 dark:bg-emerald-900/40 rounded-md px-3 py-2 font-mono text-emerald-900 dark:text-emerald-200 select-all">
              ADMIN_BOOTSTRAPPED=true
            </code>
            <p className="text-xs text-emerald-600 dark:text-emerald-500">
              ⚠️ Do this now — until the flag is set, the setup endpoint remains accessible to anyone who can reach this deployment.
            </p>
          </div>
          <Link
            href="/admin/users"
            className="block w-full text-center py-2 px-4 rounded-md bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors"
          >
            Go to Admin Panel →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-zinc-800 dark:text-zinc-100">
            First-time setup
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            No admin account found. Create one to get started.
          </p>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
              {errors.email && (
                <p className="text-xs text-red-500 mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
              {errors.password && (
                <p className="text-xs text-red-500 mt-1">{errors.password}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="confirm"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Confirm password
              </label>
              <input
                id="confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              />
              {errors.confirm && (
                <p className="text-xs text-red-500 mt-1">{errors.confirm}</p>
              )}
            </div>

            {serverError && (
              <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-md px-3 py-2">
                {serverError}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 rounded-md bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account…' : 'Create admin account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
