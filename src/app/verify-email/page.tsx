'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'

export default function VerifyEmailPage() {
  const t = useTranslations('verifyEmail')
  const [email, setEmail] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null))
  }, [])

  async function handleResend() {
    if (!email) return
    setStatus('idle'); setErrorMsg(null)
    const supabase = createClient()
    const { error } = await supabase.auth.resend({ type: 'signup', email })
    if (error) { setStatus('error'); setErrorMsg(error.message) }
    else setStatus('sent')
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="max-w-sm w-full text-center space-y-4 p-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
        <div className="text-3xl">✉️</div>
        <h1 className="text-lg font-semibold">{t('title')}</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {t('body', { email: email ?? '…' })}
        </p>
        {status === 'sent' && <p className="text-sm text-green-600 dark:text-green-400">{t('resent')}</p>}
        {status === 'error' && <p className="text-sm text-red-500">{errorMsg}</p>}
        <button
          type="button"
          onClick={handleResend}
          className="mt-2 px-4 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
        >
          {t('resend')}
        </button>
      </div>
    </div>
  )
}
