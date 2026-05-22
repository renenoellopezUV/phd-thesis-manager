import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { STAGE_LABELS } from '@/types'
import { dbMilestoneToMilestone, dbProfileStage } from '@/types/database'
import ProgressRing from '@/components/ProgressRing'
import StatCard from '@/components/StatCard'
import HealthBadge from '@/components/HealthBadge'

function monthsUntil(dateStr: string | null): number {
  if (!dateStr) return 0
  const target = new Date(dateStr)
  const now = new Date()
  return Math.max(
    0,
    (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth())
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single()

  if (!profileRow) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <p className="text-zinc-500 dark:text-zinc-400">Your profile isn't set up yet.</p>
        <Link
          href="/profile"
          className="px-4 py-2 rounded-md bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium"
        >
          Complete your profile
        </Link>
      </div>
    )
  }

  const { data: milestoneRows } = await supabase
    .from('milestones')
    .select('*')
    .eq('profile_id', user!.id)
    .order('due_date')

  const milestones = (milestoneRows ?? []).map(dbMilestoneToMilestone)
  const today = new Date()
  const total = milestones.length
  const completed = milestones.filter((m) => m.completed).length
  const overdue = milestones.filter((m) => !m.completed && new Date(m.dueDate) < today).length
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100)
  const monthsLeft = monthsUntil(profileRow.expected_graduation)

  const in30Days = new Date(today)
  in30Days.setDate(in30Days.getDate() + 30)
  const upcoming = milestones
    .filter((m) => !m.completed && new Date(m.dueDate) <= in30Days && new Date(m.dueDate) >= today)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))

  const stage = dbProfileStage(profileRow.stage)

  return (
    <div className="space-y-8">
      {/* Student profile header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-6 p-6 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-semibold">{profileRow.name || profileRow.email}</h1>
            <HealthBadge overdueCount={overdue} />
            <Link
              href="/profile"
              className="text-xs text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 underline"
            >
              Edit profile
            </Link>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{profileRow.program ?? '—'}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1 mt-3 text-sm">
            <div>
              <span className="text-zinc-400 dark:text-zinc-500">Advisor</span>
              <p className="font-medium">{profileRow.advisor_id ?? '—'}</p>
            </div>
            <div>
              <span className="text-zinc-400 dark:text-zinc-500">Department</span>
              <p className="font-medium">{profileRow.department ?? '—'}</p>
            </div>
            <div>
              <span className="text-zinc-400 dark:text-zinc-500">Stage</span>
              <p className="font-medium">{STAGE_LABELS[stage]}</p>
            </div>
            {profileRow.start_date && (
              <div>
                <span className="text-zinc-400 dark:text-zinc-500">Started</span>
                <p className="font-medium">
                  {new Date(profileRow.start_date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                  })}
                </p>
              </div>
            )}
            {profileRow.expected_graduation && (
              <div>
                <span className="text-zinc-400 dark:text-zinc-500">Expected Graduation</span>
                <p className="font-medium">
                  {new Date(profileRow.expected_graduation).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                  })}
                </p>
              </div>
            )}
          </div>
        </div>
        <div className="flex-shrink-0">
          <ProgressRing percentage={percentage} size={120} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Milestones" value={total} />
        <StatCard label="Completed" value={completed} sub={`${percentage}% done`} />
        <StatCard label="Overdue" value={overdue} sub={overdue === 0 ? 'None — great work!' : 'Need attention'} />
        <StatCard label="Months to Graduation" value={monthsLeft} sub="approx." />
      </div>

      {/* Upcoming deadlines */}
      <div className="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-4">
          Upcoming (next 30 days)
        </h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-zinc-400 dark:text-zinc-500">No upcoming deadlines</p>
        ) : (
          <ul className="space-y-3">
            {upcoming.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-4 text-sm">
                <span className="font-medium truncate">{m.title}</span>
                <span className="text-zinc-400 dark:text-zinc-500 whitespace-nowrap">
                  {new Date(m.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
