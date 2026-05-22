'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { assignProgram } from '@/app/actions/milestones'
import type { DbProgram, DbProgramMilestone } from '@/types/database'

export default function AssignProgramForm({
  studentId,
  programs,
  definitionsByProgram,
}: {
  studentId: string
  programs: DbProgram[]
  definitionsByProgram: Record<string, DbProgramMilestone[]>
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [selectedProgramId, setSelectedProgramId] = useState('')
  const [dueDates, setDueDates] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  const definitions = selectedProgramId ? (definitionsByProgram[selectedProgramId] ?? []) : []

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!selectedProgramId) { setError('Select a program'); return }
    startTransition(async () => {
      const result = await assignProgram(studentId, selectedProgramId, dueDates)
      if (result.error) { setError(result.error); return }
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-6 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
      <h2 className="text-sm font-semibold">Assign Program</h2>

      <div>
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Program</label>
        <select
          value={selectedProgramId}
          onChange={(e) => { setSelectedProgramId(e.target.value); setDueDates({}) }}
          className="w-full px-3 py-2 text-sm rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950"
        >
          <option value="">Select a program…</option>
          {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {definitions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Set due dates for all milestones:</p>
          {definitions.map((def) => (
            <div key={def.id} className="flex items-center gap-3">
              <span className="text-sm flex-1">{def.title}</span>
              <input
                type="date"
                value={dueDates[def.id] ?? ''}
                onChange={(e) => setDueDates((prev) => ({ ...prev, [def.id]: e.target.value }))}
                className="px-2 py-1 text-sm rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950"
              />
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={pending || !selectedProgramId || definitions.length === 0}
        className="px-4 py-2 rounded-md bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium disabled:opacity-50"
      >
        {pending ? 'Assigning…' : 'Assign Program'}
      </button>
    </form>
  )
}
