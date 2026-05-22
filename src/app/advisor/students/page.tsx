import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { dbMilestoneToMilestone, dbProfileStage } from '@/types/database'
import { STAGE_LABELS } from '@/types'
import HealthBadge from '@/components/HealthBadge'

export default async function AdvisorStudentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: students } = await supabase
    .from('profiles')
    .select('*')
    .eq('advisor_id', user!.id)
    .order('name')

  if (!students || students.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-lg font-semibold">My Students</h1>
        <p className="text-sm text-zinc-400 dark:text-zinc-500 py-12 text-center">
          No students assigned yet.
        </p>
      </div>
    )
  }

  // Fetch milestone counts for all students in one query
  const studentIds = students.map((s) => s.id)
  const { data: allMilestones } = await supabase
    .from('milestones')
    .select('*')
    .in('profile_id', studentIds)

  const today = new Date()
  const milestonesByStudent = new Map(studentIds.map((id) => [id, [] as ReturnType<typeof dbMilestoneToMilestone>[]]))
  for (const row of allMilestones ?? []) {
    const list = milestonesByStudent.get(row.profile_id)
    if (list) list.push(dbMilestoneToMilestone(row))
  }

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">My Students</h1>
      <div className="space-y-3">
        {students.map((student) => {
          const milestones = milestonesByStudent.get(student.id) ?? []
          const total = milestones.length
          const completed = milestones.filter((m) => m.completed).length
          const overdue = milestones.filter((m) => !m.completed && new Date(m.dueDate) < today).length
          const pct = total === 0 ? 0 : Math.round((completed / total) * 100)
          const stage = dbProfileStage(student.stage)

          return (
            <Link
              key={student.id}
              href={`/advisor/students/${student.id}`}
              className="flex items-center justify-between gap-4 p-4 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
            >
              <div>
                <p className="font-medium">{student.name || student.email}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {student.program ?? '—'} · {STAGE_LABELS[stage]}
                </p>
              </div>
              <div className="flex items-center gap-3 text-sm shrink-0">
                <span className="text-zinc-500 dark:text-zinc-400">{pct}% complete</span>
                <HealthBadge overdueCount={overdue} />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
