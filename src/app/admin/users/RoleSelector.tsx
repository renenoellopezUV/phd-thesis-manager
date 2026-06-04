'use client'

import { useTransition } from 'react'
import { changeUserRole } from '@/app/actions/admin'
import type { UserRole } from '@/types'
import { useTranslations } from 'next-intl'

const ROLE_VALUES: UserRole[] = ['student', 'advisor', 'admin']

export default function RoleSelector({ userId, currentRole }: { userId: string; currentRole: UserRole }) {
  const tRoles = useTranslations('roles')
  const [pending, startTransition] = useTransition()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const role = e.target.value as UserRole
    startTransition(async () => {
      await changeUserRole(userId, role)
    })
  }

  return (
    <select
      defaultValue={currentRole}
      onChange={handleChange}
      disabled={pending}
      className="px-2 py-1 text-xs rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-400 disabled:opacity-50"
    >
      {ROLE_VALUES.map((value) => (
        <option key={value} value={value}>{tRoles(value)}</option>
      ))}
    </select>
  )
}
