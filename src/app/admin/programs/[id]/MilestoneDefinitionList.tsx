'use client'

import { useState, useTransition } from 'react'
import { addProgramMilestone, deleteProgramMilestone } from '@/app/actions/programs'
import { MILESTONE_TYPE_LABELS, type MilestoneType } from '@/types'
import type { DbProgramMilestone } from '@/types/database'

const TYPES = Object.entries(MILESTONE_TYPE_LABELS) as [MilestoneType, string][]

export default function MilestoneDefinitionList({
  programId,
  definitions,
}: {
  programId: string
  definitions: DbProgramMilestone[]
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [type, setType] = useState<MilestoneType>('other')
  const [description, setDescription] = useState('')

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const fd = new FormData()
    fd.set('title', title); fd.set('type', type); fd.set('description', description)
    startTransition(async () => {
      const result = await addProgramMilestone(programId, fd)
      if (result.error) { setError(result.error); return }
      setTitle(''); setDescription('')
    })
  }

  function handleDelete(milestoneId: string, milestoneTitle: string) {
    if (!confirm(`Remove "${milestoneTitle}" from this program?`)) return
    startTransition(async () => {
      await deleteProgramMilestone(programId, milestoneId)
    })
  }

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Milestone Definitions ({definitions.length})
      </h2>

      <div className="space-y-2">
        {definitions.map((def) => (
          <div key={def.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <div>
              <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 mr-2">
                {MILESTONE_TYPE_LABELS[def.type as MilestoneType] ?? def.type}
              </span>
              <span className="text-sm font-medium">{def.title}</span>
              {def.description && <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">{def.description}</p>}
            </div>
            <button
              onClick={() => handleDelete(def.id, def.title)}
              disabled={pending}
              className="text-xs text-red-400 hover:text-red-600 disabled:opacity-50 shrink-0"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <form onSubmit={handleAdd} className="flex flex-wrap gap-3 items-end p-4 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700">
        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Title *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Qualifying Exam" className="px-3 py-2 text-sm rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-400 w-52" />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Type</label>
          <select value={type} onChange={(e) => setType(e.target.value as MilestoneType)} className="px-3 py-2 text-sm rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950">
            {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Description</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" className="px-3 py-2 text-sm rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-400 w-44" />
        </div>
        <button type="submit" disabled={pending} className="px-3 py-2 rounded-md bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium disabled:opacity-50">
          {pending ? 'Adding…' : '+ Add'}
        </button>
        {error && <p className="w-full text-xs text-red-500">{error}</p>}
      </form>
    </div>
  )
}
