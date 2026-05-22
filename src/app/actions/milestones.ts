'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

function revalidateAll(studentId?: string) {
  revalidatePath('/')
  revalidatePath('/milestones')
  revalidatePath('/timeline')
  if (studentId) revalidatePath(`/advisor/students/${studentId}`)
}

// STUDENT: mark own milestone complete/incomplete (completed + completed_date only)
export async function toggleMilestone(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: row, error: fetchError } = await supabase
    .from('milestones')
    .select('completed')
    .eq('id', id)
    .eq('profile_id', user.id)
    .single()

  if (fetchError || !row) return { error: 'Milestone not found' }

  const nowCompleted = !row.completed
  const { error } = await supabase
    .from('milestones')
    .update({
      completed: nowCompleted,
      completed_date: nowCompleted ? new Date().toISOString().slice(0, 10) : null,
    })
    .eq('id', id)
    .eq('profile_id', user.id)

  if (error) return { error: error.message }
  revalidateAll()
  return {}
}

// ADVISOR: assign a program to a student (bulk insert milestone instances)
export async function assignProgram(
  studentId: string,
  programId: string,
  dueDates: Record<string, string>, // program_milestone_id → YYYY-MM-DD
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: definitions, error: defError } = await supabase
    .from('program_milestones')
    .select('*')
    .eq('program_id', programId)
    .order('display_order')

  if (defError || !definitions) return { error: defError?.message ?? 'Failed to load program' }

  const rows = definitions.map((def) => ({
    profile_id: studentId,
    program_milestone_id: def.id,
    title: def.title,
    type: def.type,
    description: def.description,
    due_date: dueDates[def.id] ?? '',
    created_by: user.id,
  }))

  const validRows = rows.filter((r) => r.due_date)
  if (validRows.length === 0) return { error: 'At least one due date is required' }

  const { error } = await supabase.from('milestones').insert(validRows)
  if (error) return { error: error.message }
  revalidateAll(studentId)
  return {}
}

// ADVISOR: update a single milestone's due date
export async function updateMilestoneDueDate(
  milestoneId: string,
  dueDate: string,
): Promise<{ error?: string }> {
  if (!dueDate) return { error: 'Due date is required' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('milestones')
    .update({ due_date: dueDate })
    .eq('id', milestoneId)

  if (error) return { error: error.message }
  revalidateAll()
  return {}
}

// ADVISOR: delete a milestone instance from a student
export async function deleteMilestone(id: string, studentId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('milestones').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidateAll(studentId)
  return {}
}
