import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProgramForm from './ProgramForm'
import MilestoneDefinitionList from './MilestoneDefinitionList'

export default async function ProgramDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: program } = await supabase
    .from('programs')
    .select('*')
    .eq('id', id)
    .single()

  if (!program) notFound()

  const { data: definitions } = await supabase
    .from('program_milestones')
    .select('*')
    .eq('program_id', id)
    .order('display_order')

  return (
    <div className="space-y-8 max-w-2xl">
      <ProgramForm program={program} />
      <MilestoneDefinitionList programId={id} definitions={definitions ?? []} />
    </div>
  )
}
