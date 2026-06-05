import { createAdminClient } from '@/lib/supabase/admin'
import type { UserRole } from '@/types'
import RoleSelector from './RoleSelector'
import InviteUserForm from './InviteUserForm'
import AdvisorAssigner from './AdvisorAssigner'
import VerifyButton from './VerifyButton'
import PasswordEditor from './PasswordEditor'
import { getTranslations } from 'next-intl/server'

export default async function AdminUsersPage() {
  const t = await getTranslations('adminUsers')
  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 200 })

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-semibold">{t('title', { count: 0 })}</h1>
        <p className="text-sm text-red-500">{t('loadError', { message: error.message })}</p>
      </div>
    )
  }

  const users = data.users

  const { data: profiles } = await admin
    .from('profiles')
    .select('id, advisor_id, program_id')

  const profileMap = new Map(
    (profiles ?? []).map((p: { id: string; advisor_id: string | null; program_id: string | null }) => [p.id, p])
  )

  const allAdvisors = users
    .filter((u) => (u.app_metadata as { role?: string })?.role === 'advisor')
    .map((u) => ({
      id: u.id,
      email: u.email ?? '',
      programId: profileMap.get(u.id)?.program_id ?? null,
    }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{t('title', { count: users.length })}</h1>
        <InviteUserForm />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th className="text-left py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{t('colEmail')}</th>
              <th className="text-left py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{t('colRole')}</th>
              <th className="text-left py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{t('colAdvisor')}</th>
              <th className="text-left py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{t('colVerified')}</th>
              <th className="text-left py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{t('colPassword')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {users.map((u) => {
              const role = ((u.app_metadata as { role?: UserRole } | undefined)?.role) ?? 'student'
              const verified = !!u.email_confirmed_at
              const studentProgramId = profileMap.get(u.id)?.program_id ?? null
              const eligibleAdvisors = studentProgramId
                ? allAdvisors.filter((a) => a.programId === studentProgramId)
                : []

              return (
                <tr key={u.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                  <td className="py-3 pr-4 font-medium">{u.email}</td>
                  <td className="py-3 pr-4">
                    <RoleSelector userId={u.id} currentRole={role} />
                  </td>
                  <td className="py-3 pr-4">
                    {role === 'student' ? (
                      <AdvisorAssigner
                        studentId={u.id}
                        currentAdvisorId={profileMap.get(u.id)?.advisor_id ?? null}
                        advisors={eligibleAdvisors}
                        disabled={!studentProgramId}
                      />
                    ) : (
                      <span className="text-zinc-300 dark:text-zinc-600 text-xs">—</span>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    <VerifyButton userId={u.id} verified={verified} />
                  </td>
                  <td className="py-3">
                    <PasswordEditor userId={u.id} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
