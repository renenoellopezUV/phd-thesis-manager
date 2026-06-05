'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { updateProfile } from '@/app/actions/profile'
import { type StudentStage } from '@/types'
import type { DbProfile, DbProgram } from '@/types/database'

const STAGE_KEYS: StudentStage[] = [
  'coursework', 'qualifying', 'proposal', 'research',
  'writing', 'defense', 'graduated',
]

export default function ProfileForm({
  profile,
  programs,
  role,
}: {
  profile: DbProfile | null
  programs: Pick<DbProgram, 'id' | 'name'>[]
  role: string
}) {
  const t = useTranslations('profile')
  const tStages = useTranslations('stages')
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
      if (result.error) { setError(result.error) }
      else { setSuccess(true); router.refresh() }
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
      {field(t('name'), 'name', 'text', profile?.name ?? '')}
      {field(t('department'), 'department', 'text', profile?.department ?? '')}

      <div>
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">{t('program')}</label>
        <select
          name="program_id"
          defaultValue={profile?.program_id ?? ''}
          className="w-full px-3 py-2 text-sm rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-400"
        >
          <option value="">{t('programNone')}</option>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {role === 'student' && (
        <>
          {field(t('startDate'), 'startDate', 'date', profile?.start_date ?? '')}
          {field(t('expectedGraduation'), 'expectedGraduation', 'date', profile?.expected_graduation ?? '')}
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">{t('stage')}</label>
            <select
              name="stage"
              defaultValue={profile?.stage ?? 'coursework'}
              className="w-full px-3 py-2 text-sm rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-400"
            >
              {STAGE_KEYS.map((value) => (
                <option key={value} value={value}>{tStages(value)}</option>
              ))}
            </select>
          </div>
        </>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}
      {success && <p className="text-sm text-green-600 dark:text-green-400">{t('saved')}</p>}

      <button
        type="submit"
        disabled={pending}
        className="px-4 py-2 rounded-md bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
      >
        {pending ? t('saving') : t('save')}
      </button>
    </form>
  )
}
