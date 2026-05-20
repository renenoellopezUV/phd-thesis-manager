import { createClient } from '@/lib/supabase/server'
import { dbMilestoneToMilestone } from '@/types/database'
import TimelineClient from '@/components/TimelineClient'

export default async function TimelinePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: rows } = await supabase
    .from('milestones')
    .select('*')
    .eq('profile_id', user!.id)
    .order('due_date')

  const milestones = (rows ?? []).map(dbMilestoneToMilestone)

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Timeline</h1>
      <TimelineClient milestones={milestones} />
    </div>
  )
}
