import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { dbMilestoneToMilestone } from '@/types/database'
import { MILESTONE_TYPE_LABELS } from '@/types'

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ studentId: string }>
}) {
  const { studentId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // RLS ensures only the assigned advisor can see this profile
  const { data: student } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', studentId)
    .eq('advisor_email', user!.email!)
    .single()

  if (!student) notFound()

  const { data: rows } = await supabase
    .from('milestones')
    .select('*')
    .eq('profile_id', studentId)
    .order('due_date')

  const milestones = (rows ?? []).map(dbMilestoneToMilestone)
  const today = new Date()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/advisor/students" className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
          ← Students
        </Link>
        <h1 className="text-lg font-semibold">{student.name || student.email}</h1>
      </div>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{student.program ?? '—'}</p>

      {milestones.length === 0 ? (
        <p className="text-sm text-zinc-400 dark:text-zinc-500 py-8 text-center">No milestones yet.</p>
      ) : (
        <div className="space-y-2">
          {milestones.map((m) => {
            const isOverdue = !m.completed && new Date(m.dueDate) < today
            return (
              <div
                key={m.id}
                className={`flex items-start gap-3 p-4 rounded-lg border ${
                  m.completed
                    ? 'border-zinc-200 dark:border-zinc-800 opacity-60'
                    : isOverdue
                    ? 'border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20'
                    : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'
                }`}
              >
                <span
                  className={`mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center text-xs ${
                    m.completed ? 'bg-zinc-400 border-zinc-400 text-white' : 'border-zinc-300 dark:border-zinc-600'
                  }`}
                  aria-label={m.completed ? 'Completed' : 'Incomplete'}
                >
                  {m.completed ? '✓' : ''}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium">
                      {MILESTONE_TYPE_LABELS[m.type]}
                    </span>
                    {isOverdue && <span className="text-xs text-red-500 font-medium">Overdue</span>}
                  </div>
                  <p className={`text-sm font-medium ${m.completed ? 'line-through text-zinc-400' : ''}`}>{m.title}</p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                    Due: {new Date(m.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
