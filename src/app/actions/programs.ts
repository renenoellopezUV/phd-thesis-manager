'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createProgram(formData: FormData): Promise<{ error?: string; id?: string }> {
  const name = (formData.get('name') as string | null)?.trim() ?? ''
  if (!name) return { error: 'Name is required' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data, error } = await supabase
    .from('programs')
    .insert({
      name,
      description: (formData.get('description') as string | null)?.trim() ?? '',
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }
  revalidatePath('/admin/programs')
  return { id: data.id }
}

export async function updateProgram(id: string, formData: FormData): Promise<{ error?: string }> {
  const name = (formData.get('name') as string | null)?.trim() ?? ''
  if (!name) return { error: 'Name is required' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('programs')
    .update({
      name,
      description: (formData.get('description') as string | null)?.trim() ?? '',
    })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/admin/programs')
  revalidatePath(`/admin/programs/${id}`)
  return {}
}

export async function deleteProgram(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('programs').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/programs')
  return {}
}

export async function addProgramMilestone(
  programId: string,
  formData: FormData,
): Promise<{ error?: string }> {
  const title = (formData.get('title') as string | null)?.trim() ?? ''
  const type = (formData.get('type') as string | null) ?? 'other'
  if (!title) return { error: 'Title is required' }

  const supabase = await createClient()

  const { data: last } = await supabase
    .from('program_milestones')
    .select('display_order')
    .eq('program_id', programId)
    .order('display_order', { ascending: false })
    .limit(1)
    .single()

  const nextOrder = last ? last.display_order + 1 : 0

  const { error } = await supabase.from('program_milestones').insert({
    program_id: programId,
    title,
    type,
    description: (formData.get('description') as string | null)?.trim() ?? '',
    display_order: nextOrder,
  })

  if (error) return { error: error.message }
  revalidatePath(`/admin/programs/${programId}`)
  return {}
}

export async function deleteProgramMilestone(
  programId: string,
  milestoneId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('program_milestones')
    .delete()
    .eq('id', milestoneId)

  if (error) return { error: error.message }
  revalidatePath(`/admin/programs/${programId}`)
  return {}
}
