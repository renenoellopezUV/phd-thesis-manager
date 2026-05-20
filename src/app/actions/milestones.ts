'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

function revalidate() {
  revalidatePath('/')
  revalidatePath('/milestones')
  revalidatePath('/timeline')
}

export async function addMilestone(formData: FormData): Promise<{ error?: string }> {
  const title = (formData.get('title') as string | null)?.trim() ?? ''
  const dueDate = (formData.get('dueDate') as string | null) ?? ''
  const description = (formData.get('description') as string | null)?.trim() ?? ''
  const type = (formData.get('type') as string | null) ?? 'other'

  if (!title) return { error: 'Title is required' }
  if (!dueDate) return { error: 'Due date is required' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase.from('milestones').insert({
    profile_id: user.id,
    title,
    description,
    type,
    due_date: dueDate,
  })

  if (error) return { error: error.message }

  revalidate()
  return {}
}

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

  revalidate()
  return {}
}

export async function deleteMilestone(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('milestones')
    .delete()
    .eq('id', id)
    .eq('profile_id', user.id)

  if (error) return { error: error.message }

  revalidate()
  return {}
}
