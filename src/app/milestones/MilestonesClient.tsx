'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import MilestoneCard from '@/components/MilestoneCard'
import { toggleMilestone } from '@/app/actions/milestones'
import type { Milestone } from '@/types'

export default function MilestonesClient({ milestones }: { milestones: Milestone[] }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const t = useTranslations('milestones')

  const incomplete = milestones.filter((m) => !m.completed)
  const complete = milestones.filter((m) => m.completed)

  function handleToggle(id: string) {
    startTransition(async () => {
      await toggleMilestone(id)
      router.refresh()
    })
  }

  if (milestones.length === 0) {
    return (
      <p className="text-sm text-zinc-400 dark:text-zinc-500 text-center py-12">
        {t('empty')}
      </p>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">{t('title')}</h1>

      {incomplete.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500 mb-3">
            {t('upcoming', { count: incomplete.length })}
          </h2>
          <div className="space-y-2">
            {incomplete.map((m) => (
              <MilestoneCard key={m.id} milestone={m} onToggle={handleToggle} onDelete={() => {}} canDelete={false} />
            ))}
          </div>
        </section>
      )}

      {complete.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500 mb-3">
            {t('completed', { count: complete.length })}
          </h2>
          <div className="space-y-2">
            {complete.map((m) => (
              <MilestoneCard key={m.id} milestone={m} onToggle={handleToggle} onDelete={() => {}} canDelete={false} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
