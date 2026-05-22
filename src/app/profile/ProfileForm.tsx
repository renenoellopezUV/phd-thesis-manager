'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateProfile } from '@/app/actions/profile'
import { STAGE_LABELS, type StudentStage } from '@/types'
import type { DbProfile } from '@/types/database'

const STAGES = Object.entries(STAGE_LABELS) as [StudentStage, string][]

export default function ProfileForm({ profile }: { profile: DbProfile | null }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await updateProfile(formData)
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        router.refresh()
      }
    })
  }

  const field = (label: string, name: string, type = 'text', defaultVal?: string) => (
    <div>
      <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">{label}</label>
      <input
        type={type}
        name={name}
        defaultValue={defaultVal ?? ''}
        className="w-full px-3 py-2 text-sm rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-400"
      />
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
      {field('Name', 'name', 'text', profile?.name ?? '')}
      {field('Department', 'department', 'text', profile?.department ?? '')}
      {field('Program', 'program', 'text', profile?.program ?? '')}
      {field('Start Date', 'startDate', 'date', profile?.start_date ?? '')}
      {field('Expected Graduation', 'expectedGraduation', 'date', profile?.expected_graduation ?? '')}

      <div>
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">Stage</label>
        <select
          name="stage"
          defaultValue={profile?.stage ?? 'coursework'}
          className="w-full px-3 py-2 text-sm rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-400"
        >
          {STAGES.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {success && <p className="text-sm text-green-600 dark:text-green-400">Profile saved.</p>}

      <button
        type="submit"
        disabled={pending}
        className="px-4 py-2 rounded-md bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
      >
        {pending ? 'Saving…' : 'Save profile'}
      </button>
    </form>
  )
}
