'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { resetUserPassword } from '@/app/actions/admin'

export default function PasswordEditor({ userId }: { userId: string }) {
  const t = useTranslations('adminUsers')
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleOpen() {
    setOpen(true)
    setLocalError(null)
  }

  function handleCancel() {
    setOpen(false)
    setPassword('')
    setLocalError(null)
  }

  function handleSave() {
    if (password.length < 8) {
      setLocalError(t('passwordTooShort'))
      return
    }
    setLocalError(null)
    startTransition(async () => {
      const result = await resetUserPassword(userId, password)
      if (result.error) {
        setLocalError(result.error)
      } else {
        setOpen(false)
        setPassword('')
      }
    })
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={handleOpen}
        aria-label={t('passwordChange')}
        className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors text-sm"
      >
        🔒
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t('newPassword')}
          className="px-2 py-1 text-xs rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 w-32 focus:outline-none focus:ring-1 focus:ring-zinc-400"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={pending}
          className="px-2 py-1 text-xs rounded bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium disabled:opacity-50 transition-colors"
        >
          {pending ? t('passwordSaving') : t('passwordSave')}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="px-2 py-1 text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
        >
          {t('passwordCancel')}
        </button>
      </div>
      {localError && (
        <p className="text-xs text-red-500">{localError}</p>
      )}
    </div>
  )
}
