'use client'

import { useTransition, useState } from 'react'
import { assignAdvisor } from '@/app/actions/admin'
import { useTranslations } from 'next-intl'

type Advisor = { id: string; email: string; programId: string | null }

export default function AdvisorAssigner({
  studentId,
  currentAdvisorId,
  advisors,
  disabled = false,
}: {
  studentId: string
  currentAdvisorId: string | null
  advisors: Advisor[]
  disabled?: boolean
}) {
  const t = useTranslations('advisorAssigner')
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  if (disabled) {
    return <span className="text-zinc-300 dark:text-zinc-600 text-xs">{t('noProgram')}</span>
  }

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const advisorId = e.target.value
    setError(null)
    startTransition(async () => {
      const result = await assignAdvisor(studentId, advisorId)
      if (result.error) setError(result.error)
    })
  }

  return (
    <div className="flex flex-col gap-1">
      <select
        defaultValue={currentAdvisorId ?? ''}
        onChange={handleChange}
        disabled={pending}
        className="px-2 py-1 text-xs rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 disabled:opacity-50"
      >
        <option value="">{t('unassigned')}</option>
        {advisors.map((a) => (
          <option key={a.id} value={a.id}>{a.email}</option>
        ))}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
