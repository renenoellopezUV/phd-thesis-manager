import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { dbMilestoneToMilestone } from '@/types/database'
import AssignProgramForm from './AssignProgramForm'
import MilestoneDateEditor from './MilestoneDateEditor'
import type { DbProgramMilestone } from '@/types/database'

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ studentId: string }>
}) {
  const { studentId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: student } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', studentId)
    .eq('advisor_id', user!.id)
    .single()

  if (!student) notFound()

  const { data: milestoneRows } = await supabase
    .from('milestones')
    .select('*')
    .eq('profile_id', studentId)
    .order('due_date')

  const milestones = (milestoneRows ?? []).map(dbMilestoneToMilestone)

  const { data: programs } = await supabase
    .from('programs')
    .select('*')
    .order('name')

  const { data: allDefinitions } = await supabase
    .from('program_milestones')
    .select('*')
    .order('display_order')

  const definitionsByProgram = (allDefinitions ?? []).reduce<Record<string, DbProgramMilestone[]>>(
    (acc, def) => {
      if (!acc[def.program_id]) acc[def.program_id] = []
      acc[def.program_id].push(def)
      return acc
    },
    {}
  )

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/advisor/students" className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
          ← Students
        </Link>
        <h1 className="text-lg font-semibold">{student.name || student.email}</h1>
      </div>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{student.program ?? '—'}</p>

      {milestones.length === 0 ? (
        <AssignProgramForm
          studentId={studentId}
          programs={programs ?? []}
          definitionsByProgram={definitionsByProgram}
        />
      ) : (
        <div className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Milestones ({milestones.length})
          </h2>
          <MilestoneDateEditor milestones={milestones} studentId={studentId} />
        </div>
      )}
    </div>
  )
}
