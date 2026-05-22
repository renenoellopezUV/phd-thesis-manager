import { createClient } from '@/lib/supabase/server'
import { dbMilestoneToMilestone } from '@/types/database'
import MilestonesClient from './MilestonesClient'

export default async function MilestonesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: rows } = await supabase
    .from('milestones')
    .select('*')
    .eq('profile_id', user!.id)
    .order('due_date')

  const milestones = (rows ?? []).map(dbMilestoneToMilestone)

  return <MilestonesClient milestones={milestones} />
}
