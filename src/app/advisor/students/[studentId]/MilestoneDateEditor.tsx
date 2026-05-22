'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateMilestoneDueDate, deleteMilestone } from '@/app/actions/milestones'
import { MILESTONE_TYPE_LABELS, type Milestone, type MilestoneType } from '@/types'

export default function MilestoneDateEditor({
  milestones,
  studentId,
}: {
  milestones: Milestone[]
  studentId: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function handleDateChange(id: string, date: string) {
    startTransition(async () => {
      await updateMilestoneDueDate(id, date)
      router.refresh()
    })
  }

  function handleDelete(id: string, title: string) {
    if (!confirm(`Remove milestone "${title}" from this student?`)) return
    startTransition(async () => {
      await deleteMilestone(id, studentId)
      router.refresh()
    })
  }

  return (
    <div className="space-y-2">
      {milestones.map((m) => (
        <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
            {MILESTONE_TYPE_LABELS[m.type as MilestoneType] ?? m.type}
          </span>
          <span className="text-sm font-medium flex-1">{m.title}</span>
          {m.completed && <span className="text-xs text-green-600 dark:text-green-400">✓ Done</span>}
          <input
            type="date"
            defaultValue={m.dueDate}
            onBlur={(e) => { if (e.target.value !== m.dueDate) handleDateChange(m.id, e.target.value) }}
            disabled={pending}
            className="px-2 py-1 text-sm rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 disabled:opacity-50"
          />
          <button
            onClick={() => handleDelete(m.id, m.title)}
            disabled={pending}
            className="text-xs text-red-400 hover:text-red-600 disabled:opacity-50"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
