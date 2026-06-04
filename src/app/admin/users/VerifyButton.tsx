'use client'

import { useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { verifyUserEmail } from '@/app/actions/admin'

export default function VerifyButton({
  userId,
  verified,
}: {
  userId: string
  verified: boolean
}) {
  const t = useTranslations('adminUsers')
  const [pending, startTransition] = useTransition()

  if (verified) {
    return (
      <span className="text-green-600 dark:text-green-400 text-xs font-medium">
        {t('verified')}
      </span>
    )
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await verifyUserEmail(userId)
        })
      }
      className="text-amber-500 dark:text-amber-400 text-xs font-medium hover:text-amber-600 dark:hover:text-amber-300 disabled:opacity-50 transition-colors"
    >
      {pending ? t('verifying') : t('unverified')}
    </button>
  )
}
