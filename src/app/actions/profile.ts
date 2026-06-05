'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function updateProfile(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const role = (user.app_metadata as { role?: string } | undefined)?.role ?? 'student'

  const base = {
    id: user.id,
    email: user.email ?? '',
    name: (formData.get('name') as string | null)?.trim() ?? '',
    department: (formData.get('department') as string | null)?.trim() || null,
    program_id: (formData.get('program_id') as string | null) || null,
  }

  const studentFields = role === 'student' ? {
    start_date: (formData.get('startDate') as string | null) || null,
    expected_graduation: (formData.get('expectedGraduation') as string | null) || null,
    stage: (formData.get('stage') as string | null) ?? 'coursework',
  } : {}

  const { error } = await supabase
    .from('profiles')
    .upsert({ ...base, ...studentFields })

  if (error) return { error: error.message }

  revalidatePath('/')
  revalidatePath('/profile')
  return {}
}
