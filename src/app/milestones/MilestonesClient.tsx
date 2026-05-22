'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import MilestoneCard from '@/components/MilestoneCard'
import { toggleMilestone, deleteMilestone } from '@/app/actions/milestones'
import type { Milestone } from '@/types'

export default function MilestonesClient({ milestones, userId }: { milestones: Milestone[]; userId: string }) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const incomplete = milestones.filter((m) => !m.completed)
  const complete = milestones.filter((m) => m.completed)

  function handleToggle(id: string) {
    startTransition(async () => {
      await toggleMilestone(id)
      router.refresh()
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteMilestone(id, userId)
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Milestones</h1>
      </div>

      {incomplete.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500 mb-3">
            Upcoming ({incomplete.length})
          </h2>
          <div className="space-y-2">
            {incomplete.map((m) => (
              <MilestoneCard key={m.id} milestone={m} onToggle={handleToggle} onDelete={handleDelete} />
            ))}
          </div>
        </section>
      )}

      {complete.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500 mb-3">
            Completed ({complete.length})
          </h2>
          <div className="space-y-2">
            {complete.map((m) => (
              <MilestoneCard key={m.id} milestone={m} onToggle={handleToggle} onDelete={handleDelete} />
            ))}
          </div>
        </section>
      )}

      {milestones.length === 0 && (
        <p className="text-sm text-zinc-400 dark:text-zinc-500 text-center py-12">
          No milestones yet. Add your first one above.
        </p>
      )}
    </div>
  )
}
