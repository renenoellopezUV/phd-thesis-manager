import { createAdminClient } from '@/lib/supabase/admin'
import { ROLE_LABELS, type UserRole } from '@/types'
import RoleSelector from './RoleSelector'
import InviteUserForm from './InviteUserForm'
import AdvisorAssigner from './AdvisorAssigner'

export default async function AdminUsersPage() {
  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 200 })

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-semibold">Users</h1>
        <p className="text-sm text-red-500">Failed to load users: {error.message}</p>
      </div>
    )
  }

  const users = data.users

  const { data: profiles } = await admin
    .from('profiles')
    .select('id, advisor_id')

  const profileMap = new Map((profiles ?? []).map((p: { id: string; advisor_id: string | null }) => [p.id, p]))

  const advisors = users
    .filter((u) => (u.app_metadata as { role?: string })?.role === 'advisor')
    .map((u) => ({ id: u.id, email: u.email ?? '' }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Users ({users.length})</h1>
        <InviteUserForm />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th className="text-left py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Email</th>
              <th className="text-left py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Role</th>
              <th className="text-left py-2 pr-4 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Advisor</th>
              <th className="text-left py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Verified</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {users.map((u) => {
              const role = ((u.app_metadata as { role?: UserRole } | undefined)?.role) ?? 'student'
              const verified = !!u.email_confirmed_at

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
                        advisors={advisors}
                      />
                    ) : (
                      <span className="text-zinc-300 dark:text-zinc-600 text-xs">—</span>
                    )}
                  </td>
                  <td className="py-3">
                    {verified ? (
                      <span className="text-green-600 dark:text-green-400 text-xs font-medium">Verified</span>
                    ) : (
                      <span className="text-amber-500 dark:text-amber-400 text-xs font-medium">Unverified</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-zinc-400 dark:text-zinc-500">
        Role labels: {Object.entries(ROLE_LABELS).map(([k, v]) => `${k} = ${v}`).join(', ')}
      </p>
    </div>
  )
}
