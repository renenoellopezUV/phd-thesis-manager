'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { updateLocale } from '@/app/actions/locale'
import type { Locale } from '@/lib/locale'

export default function LanguageSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  async function handleSwitch(next: Locale) {
    if (next === locale) return
    setError(null)
    const result = await updateLocale(next)
    if (result.error) {
      setError(result.error)
      return
    }
    router.refresh()
  }

  return (
    <div className="flex flex-col items-end">
      <div className="flex items-center gap-1 text-xs font-medium">
        {(['en', 'es'] as Locale[]).map((l, i) => (
          <span key={l} className="flex items-center gap-1">
            {i > 0 && <span className="text-zinc-300 dark:text-zinc-600">|</span>}
            <button
              type="button"
              aria-pressed={locale === l}
              onClick={() => handleSwitch(l)}
              className={
                locale === l
                  ? 'text-zinc-900 dark:text-zinc-100 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors'
              }
            >
              {l.toUpperCase()}
            </button>
          </span>
        ))}
      </div>
      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
    </div>
  )
}
