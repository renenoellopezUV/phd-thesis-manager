'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateProgram, deleteProgram } from '@/app/actions/programs'
import type { DbProgram } from '@/types/database'

export default function ProgramForm({ program }: { program: DbProgram }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null); setSuccess(false)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await updateProgram(program.id, fd)
      if (result.error) { setError(result.error); return }
      setSuccess(true)
    })
  }

  function handleDelete() {
    if (!confirm(`Delete program "${program.name}"? This will remove all milestone definitions.`)) return
    startTransition(async () => {
      await deleteProgram(program.id)
      router.push('/admin/programs')
    })
  }

  return (
    <div className="p-6 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{program.name}</h1>
        <button onClick={handleDelete} disabled={pending} className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50">
          Delete program
        </button>
      </div>
      <form onSubmit={handleSave} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Name *</label>
          <input name="name" defaultValue={program.name} className="w-full px-3 py-2 text-sm rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-400" />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Description</label>
          <input name="description" defaultValue={program.description} className="w-full px-3 py-2 text-sm rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-400" />
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        {success && <p className="text-xs text-green-600">Saved.</p>}
        <button type="submit" disabled={pending} className="px-4 py-2 rounded-md bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium disabled:opacity-50">
          {pending ? 'Saving…' : 'Save'}
        </button>
      </form>
    </div>
  )
}
