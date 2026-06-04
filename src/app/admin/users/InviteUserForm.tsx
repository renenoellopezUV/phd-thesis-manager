'use client'

import { useState, useTransition } from 'react'
import { inviteUser } from '@/app/actions/admin'
import type { UserRole } from '@/types'
import { useTranslations } from 'next-intl'

const ROLE_VALUES: UserRole[] = ['student', 'advisor']

export default function InviteUserForm() {
  const t = useTranslations('inviteUser')
  const tRoles = useTranslations('roles')

  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>('student')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    if (!email.trim()) { setError(t('emailRequired')); return }

    startTransition(async () => {
      const result = await inviteUser(email.trim(), role)
      if (result.error) { setError(result.error); return }
      setSuccess(true)
      setEmail('')
      setRole('student')
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 rounded-md bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-700 transition-colors"
      >
        {t('button')}
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      <div>
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">{t('email')}</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@university.edu"
          className="px-3 py-2 text-sm rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-400 w-64"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">{t('role')}</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole)}
          className="px-3 py-2 text-sm rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-400"
        >
          {ROLE_VALUES.map((value) => (
            <option key={value} value={value}>{tRoles(value)}</option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="px-3 py-2 rounded-md bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium disabled:opacity-50"
      >
        {pending ? t('sending') : t('send')}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-xs text-zinc-400 hover:text-zinc-600">
        {t('cancel')}
      </button>
      {error && <p className="w-full text-xs text-red-500">{error}</p>}
      {success && <p className="w-full text-xs text-green-600">{t('success')}</p>}
    </form>
  )
}
