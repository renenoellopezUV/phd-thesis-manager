'use client'

import { useTransition } from 'react'
import { assignAdvisor } from '@/app/actions/admin'

type Advisor = { id: string; email: string }

export default function AdvisorAssigner({
  studentId,
  currentAdvisorId,
  advisors,
}: {
  studentId: string
  currentAdvisorId: string | null
  advisors: Advisor[]
}) {
  const [pending, startTransition] = useTransition()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const advisorId = e.target.value
    startTransition(async () => {
      await assignAdvisor(studentId, advisorId)
    })
  }

  return (
    <select
      defaultValue={currentAdvisorId ?? ''}
      onChange={handleChange}
      disabled={pending}
      className="px-2 py-1 text-xs rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 disabled:opacity-50"
    >
      <option value="">— unassigned —</option>
      {advisors.map((a) => (
        <option key={a.id} value={a.id}>{a.email}</option>
      ))}
    </select>
  )
}
