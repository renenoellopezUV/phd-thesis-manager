'use client'

import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { updateLocale } from '@/app/actions/locale'
import type { Locale } from '@/lib/locale'

export default function LanguageSwitcher() {
  const locale = useLocale()
  const router = useRouter()

  async function handleSwitch(next: Locale) {
    if (next === locale) return
    await updateLocale(next)
    router.refresh()
  }

  return (
    <div className="flex items-center gap-1 text-xs font-medium">
      {(['en', 'es'] as Locale[]).map((l, i) => (
        <span key={l} className="flex items-center gap-1">
          {i > 0 && <span className="text-zinc-300 dark:text-zinc-600">|</span>}
          <button
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
  )
}
